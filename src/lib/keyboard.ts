import { get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { documentStore } from "./documentStore";
import { addRecentFile } from "./recentFiles";

export async function saveDocument() {
  const doc = get(documentStore);
  let path = doc.path;

  if (!path) {
    const defaultName = doc.title
      ? doc.title.replace(/[^a-zA-Z0-9_-]/g, "_") + ".md"
      : "untitled.md";
    path = await invoke<string | null>("save_file_dialog", {
      defaultName,
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

  documentStore.setLoading(true);
  try {
    documentStore.loadDocument(result.content, result.path);
    addRecentFile(result.path);
  } catch (e) {
    console.error("Open failed:", e);
    alert("Open failed: " + String(e));
  } finally {
    documentStore.setLoading(false);
  }
}

export async function openDocumentByPath(path: string) {
  documentStore.setLoading(true);
  try {
    const info = await invoke<{ content: string; path: string }>(
      "open_document",
      { path }
    );
    documentStore.loadDocument(info.content, info.path);
    addRecentFile(info.path);
  } catch (e) {
    console.error("Open failed:", e);
    alert("Open failed: " + String(e));
  } finally {
    documentStore.setLoading(false);
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
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
