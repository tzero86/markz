import { get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { documentStore } from "./documentStore";
import { tabStore } from "./tabStore";
import { addRecentFile } from "./recentFiles";
import { contentZoomStore } from "./contentZoomStore";

export async function saveDocument() {
  const doc = get(documentStore);
  let path = doc.path;

  if (!path) {
    const defaultName = doc.title
      ? doc.title.replace(/[^a-zA-Z0-9_-]/g, "_") + ".md"
      : "untitled.md";
    path = await invoke<string | null>("save_file_dialog", {
      defaultName,
      filterName: "Markdown",
      filterExtensions: ["md", "mdx", "txt"],
    });
    if (!path) return;
  }

  try {
    await invoke("save_document", { path, content: doc.content });
    documentStore.markClean();
    if (!doc.path) documentStore.setPath(path);
    addRecentFile(path);
  } catch (e) {
    console.error("Save failed:", e);
    alert("Save failed: " + String(e));
  }
}

export async function openDocument() {
  const result = await invoke<{ path: string; content: string } | null>(
    "open_file_dialog"
  );
  if (!result) return;

  const active = tabStore.getActiveTab();
  const shouldReplace =
    active &&
    !active.isDirty &&
    active.path === null &&
    active.content.trim() === "";

  documentStore.setLoading(true);
  try {
    if (shouldReplace) {
      documentStore.loadDocument(result.content, result.path);
    } else {
      tabStore.newTab(result.content, undefined, result.path);
    }
    addRecentFile(result.path);
  } catch (e) {
    console.error("Open failed:", e);
    alert("Open failed: " + String(e));
  } finally {
    documentStore.setLoading(false);
  }
}

export async function openDocumentByPath(path: string) {
  const active = tabStore.getActiveTab();
  const shouldReplace =
    active &&
    !active.isDirty &&
    active.path === null &&
    active.content.trim() === "";

  documentStore.setLoading(true);
  try {
    const info = await invoke<{ content: string; path: string }>(
      "open_document",
      { path }
    );
    if (shouldReplace) {
      documentStore.loadDocument(info.content, info.path);
    } else {
      tabStore.newTab(info.content, undefined, info.path);
    }
    addRecentFile(info.path);
  } catch (e) {
    console.error("Open failed:", e);
    alert("Open failed: " + String(e));
  } finally {
    documentStore.setLoading(false);
  }
}

export function newDocument() {
  tabStore.newTab("", "Untitled", null);
}

export function closeActiveTab() {
  const active = tabStore.getActiveTab();
  if (active) {
    tabStore.closeTab(active.id);
  }
}

export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent("markz:toggle-sidebar"));
}

export function initKeyboardShortcuts() {
  const handler = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    const key = e.key.toLowerCase();
    if (key === "s") {
      e.preventDefault();
      saveDocument();
    } else if (key === "o") {
      e.preventDefault();
      openDocument();
    } else if (key === "b") {
      e.preventDefault();
      toggleSidebar();
    } else if (key === "t") {
      e.preventDefault();
      newDocument();
    } else if (key === "w") {
      e.preventDefault();
      closeActiveTab();
    } else if (key === "=" || key === "+") {
      e.preventDefault();
      contentZoomStore.increase();
    } else if (key === "-" || key === "_") {
      e.preventDefault();
      contentZoomStore.decrease();
    } else if (key === "0") {
      e.preventDefault();
      contentZoomStore.reset();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
