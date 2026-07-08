import { get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { tabStore } from "./tabStore";
import { addRecentFile } from "./recentFiles";
import { contentZoomStore } from "./contentZoomStore";
import { workspaceStore } from "./workspaceStore";
import { logOperationStart, logOperationEnd, logError, logWarn } from "./debugLogStore";
import { isMarkdownPath } from "./fileTypes";
import { navHistoryStore } from "./navHistoryStore";

export async function saveDocument() {
  const doc = tabStore.getActiveTab();
  if (!doc) return;
  let path = doc.path;
  if (!path) {
    const result = await invoke<string | null>("save_file_dialog", {
      defaultName: doc.title === "Untitled" ? "untitled.md" : doc.title,
      filterName: "Markdown",
      filterExtensions: ["md", "markdown", "txt"],
    });
    if (!result) return;
    path = result;
  }
  tabStore.addRecentlySaved(path);
  try {
    await invoke("save_document", { path, content: doc.content });
    tabStore.markClean();
    if (!doc.path) tabStore.setPath(path);
    addRecentFile(path);
    await workspaceStore.syncToFile(path);
    logOperationEnd("file", `Saved: ${path}`);
  } catch (e) {
    logError("file", `Save failed: ${path}`, String(e));
    alert("Save failed: " + String(e));
  }
}

export async function openDocument() {
  logOperationStart("file", "Open document dialog");
  const result = await invoke<{ path: string; content: string } | null>(
    "open_file_dialog"
  );
  if (!result) {
    logOperationEnd("file", "Open document dialog", "cancelled");
    return;
  }

  const active = tabStore.getActiveTab();
  const shouldReplace =
    active &&
    !active.isDirty &&
    active.path === null &&
    active.content.trim() === "";

  // Reject non-Markdown files selected via the "All Files" dialog filter.
  if (!isMarkdownPath(result.path)) {
    logWarn("file", `Refused to open non-Markdown file: ${result.path}`);
    tabStore.setLoading(false);
    return;
  }

  tabStore.setLoading(true);
  logOperationStart("file", `Open: ${result.path}`);
  try {
    if (shouldReplace) {
      tabStore.loadDocument(result.content, result.path);
    } else {
      tabStore.newTab(result.content, undefined, result.path);
    }
    addRecentFile(result.path);
    await workspaceStore.syncToFile(result.path);
    logOperationEnd("file", `Open: ${result.path}`);
  } catch (e) {
    logError("file", `Open failed: ${result.path}`, String(e));
    alert("Open failed: " + String(e));
  } finally {
    tabStore.setLoading(false);
  }
}

export async function openDocumentByPath(path: string, opts: { pushHistory?: boolean } = {}) {
  if (!isMarkdownPath(path)) {
    logWarn("file", `Refused to open non-Markdown file: ${path}`);
    tabStore.setLoading(false);
    return;
  }

  const active = tabStore.getActiveTab();
  const shouldReplace =
    active &&
    !active.isDirty &&
    active.path === null &&
    active.content.trim() === "";

  tabStore.setLoading(true);
  logOperationStart("file", `Open: ${path}`);
  try {
    const info = await invoke<{ content: string; path: string }>(
      "open_document",
      { path }
    );
    if (shouldReplace) {
      tabStore.loadDocument(info.content, info.path);
    } else {
      tabStore.newTab(info.content, undefined, info.path);
    }
    if (opts.pushHistory !== false) {
      navHistoryStore.push(path);
    }
    addRecentFile(path);
    await workspaceStore.syncToFile(path);
    logOperationEnd("file", `Open: ${path}`);
  } catch (e) {
    logError("file", `Open failed: ${path}`, String(e));
    alert("Open failed: " + String(e));
  } finally {
    tabStore.setLoading(false);
  }
}

export function goBack() {
  const path = navHistoryStore.goBack();
  if (path) {
    openDocumentByPath(path, { pushHistory: false });
  }
}

export function goForward() {
  const path = navHistoryStore.goForward();
  if (path) {
    openDocumentByPath(path, { pushHistory: false });
  }
}

/** Read a document from disk without any side effects (no recent-file tracking,
 *  no workspace sync, no loading spinner). Used during session restore so we
 *  can read all restored files in parallel instead of paying the cost of a
 *  full openDocumentByPath for each one. */
export async function readDocument(path: string): Promise<{ content: string; path: string }> {
  return await invoke<{ content: string; path: string }>("open_document", { path });
}

export async function openFolder() {
  await workspaceStore.openWorkspace();
}

export function newDocument() {
  tabStore.newTab("", "Untitled", null);
  workspaceStore.syncToFile(null).catch(() => {});
}

export function closeActiveTab() {
  const active = tabStore.getActiveTab();
  if (active) {
    if (active.pinned) {
      // Find next unpinned tab to close instead
      const state = get(tabStore);
      const unpinned = state.tabs.find((t) => !t.pinned);
      if (unpinned) {
        tabStore.closeTab(unpinned.id);
      }
      return;
    }
    tabStore.closeTab(active.id);
  }
}

export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent("markz:toggle-sidebar"));
}

export function initKeyboardShortcuts() {
  let chordKey: string | null = null;
  let chordTimeout: ReturnType<typeof setTimeout> | null = null;

  const handler = (e: KeyboardEvent) => {
    // Ignore when typing in inputs, textareas, or the CodeMirror editor
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest(".cm-editor"))) {
      // Still allow global shortcuts even when editor is focused
    }
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Chord: Ctrl+K -> Z toggles zen mode
    if (mod && key === "k" && !chordKey) {
      e.preventDefault();
      chordKey = "k";
      if (chordTimeout) clearTimeout(chordTimeout);
      chordTimeout = setTimeout(() => {
        chordKey = null;
      }, 1000);
      return;
    }
    if (chordKey === "k" && !mod && key === "z") {
      e.preventDefault();
      chordKey = null;
      if (chordTimeout) {
        clearTimeout(chordTimeout);
        chordTimeout = null;
      }
      window.dispatchEvent(new CustomEvent("markz:toggle-zen-mode"));
      return;
    }
    if (chordKey === "k" && !e.repeat) {
      chordKey = null;
      if (chordTimeout) {
        clearTimeout(chordTimeout);
        chordTimeout = null;
      }
    }
    if (mod && e.shiftKey && key === "p") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:open-palette", { detail: "commands" }));
      return;
    }
    if (mod && !e.shiftKey && key === "p") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:open-palette", { detail: "files" }));
      return;
    }
    if (mod && e.shiftKey && key === "d") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:open-git-diff"));
      return;
    }
    if (mod && e.shiftKey && key === "o") {
      e.preventDefault();
      openFolder();
      return;
    }
    // F5 — start presentation mode
    if (e.key === "F5") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:start-presentation"));
      return;
    }
    if (mod && e.shiftKey && key === "f") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:open-search"));
      return;
    }
    if (mod && e.shiftKey && key === "y") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("markz:toggle-debug-panel"));
      return;
    }
    // Alt+Left / Alt+Right — document navigation history
    if (e.altKey && e.key === "ArrowLeft") {
      e.preventDefault();
      goBack();
      return;
    }
    if (e.altKey && e.key === "ArrowRight") {
      e.preventDefault();
      goForward();
      return;
    }
    if (!mod) return;
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
