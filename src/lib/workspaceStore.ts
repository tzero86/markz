import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { logOperationStart, logOperationEnd, logError, logWarn } from "./debugLogStore";

export interface FileTreeNode {
  name: string;
  path: string;
  rel_path: string;
  is_dir: boolean;
  children: FileTreeNode[];
}

export interface SearchResult {
  path: string;
  rel_path: string;
  line_number: number;
  context: string;
}

interface WorkspaceState {
  rootPath: string | null;
  fileTree: FileTreeNode[];
  expandedDirs: Set<string>;
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
}

function createWorkspaceStore() {
  const { subscribe, set, update } = writable<WorkspaceState>({
    rootPath: null,
    fileTree: [],
    expandedDirs: new Set(),
    searchQuery: "",
    searchResults: [],
    searchLoading: false,
  });

  async function openWorkspace() {
    logOperationStart("workspace", "Open workspace folder");
    const path = await invoke<string | null>("open_folder_dialog");
    if (!path) {
      logOperationEnd("workspace", "Open workspace folder", "cancelled");
      return;
    }
    await loadWorkspace(path);
  }

  async function loadWorkspace(path: string) {
    logOperationStart("workspace", `Load workspace: ${path}`);
    // Stop any previous watcher
    await invoke("unwatch_workspace").catch(() => {});

    update((s) => ({ ...s, rootPath: path, fileTree: [], expandedDirs: new Set() }));
    try {
      const tree = await invoke<FileTreeNode[]>("list_workspace_files", { root: path });
      update((s) => ({ ...s, fileTree: tree }));
      logOperationEnd("workspace", `Load workspace: ${path}`, `${tree.length} top-level items`);
      // Start watching for external changes
      await invoke("watch_workspace", { path }).catch((e) => {
        logWarn("workspace", "Failed to start workspace watcher", String(e));
      });
    } catch (e) {
      logError("workspace", `Failed to load workspace: ${path}`, String(e));
    }
  }

  async function refresh() {
    const state = get({ subscribe });
    if (!state.rootPath) return;
    logOperationStart("workspace", "Refresh workspace");
    try {
      const tree = await invoke<FileTreeNode[]>("list_workspace_files", { root: state.rootPath });
      update((s) => ({ ...s, fileTree: tree }));
      logOperationEnd("workspace", "Refresh workspace", `${tree.length} top-level items`);
    } catch (e) {
      logError("workspace", "Failed to refresh workspace", String(e));
    }
  }

  function toggleDir(relPath: string) {
    update((s) => {
      const next = new Set(s.expandedDirs);
      if (next.has(relPath)) {
        next.delete(relPath);
      } else {
        next.add(relPath);
      }
      return { ...s, expandedDirs: next };
    });
  }

  async function search(query: string) {
    const state = get({ subscribe });
    if (!state.rootPath || !query.trim()) {
      update((s) => ({ ...s, searchQuery: query, searchResults: [], searchLoading: false }));
      return;
    }
    update((s) => ({ ...s, searchQuery: query, searchLoading: true }));
    try {
      const results = await invoke<SearchResult[]>("search_workspace", {
        root: state.rootPath,
        query: query.trim(),
      });
      update((s) => ({ ...s, searchResults: results, searchLoading: false }));
      logOperationEnd("workspace", `Search: "${query.trim()}"`, `${results.length} results`);
    } catch (e) {
      logError("workspace", `Search failed: "${query.trim()}"`, String(e));
      update((s) => ({ ...s, searchResults: [], searchLoading: false }));
    }
  }

  async function closeWorkspace() {
    logOperationStart("workspace", "Close workspace");
    await invoke("unwatch_workspace").catch(() => {});
    set({
      rootPath: null,
      fileTree: [],
      expandedDirs: new Set(),
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
    });
    logOperationEnd("workspace", "Close workspace");
  }

  return {
    subscribe,
    openWorkspace,
    loadWorkspace,
    refresh,
    toggleDir,
    search,
    closeWorkspace,
  };
}

export const workspaceStore = createWorkspaceStore();
