import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

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
    const path = await invoke<string | null>("open_folder_dialog");
    if (!path) return;
    await loadWorkspace(path);
  }

  async function loadWorkspace(path: string) {
    // Stop any previous watcher
    await invoke("unwatch_workspace").catch(() => {});

    update((s) => ({ ...s, rootPath: path, fileTree: [], expandedDirs: new Set() }));
    try {
      const tree = await invoke<FileTreeNode[]>("list_workspace_files", { root: path });
      update((s) => ({ ...s, fileTree: tree }));
      // Start watching for external changes
      await invoke("watch_workspace", { path }).catch((e) => {
        console.warn("Failed to start workspace watcher:", e);
      });
    } catch (e) {
      console.error("Failed to load workspace:", e);
    }
  }

  async function refresh() {
    const state = get({ subscribe });
    if (!state.rootPath) return;
    try {
      const tree = await invoke<FileTreeNode[]>("list_workspace_files", { root: state.rootPath });
      update((s) => ({ ...s, fileTree: tree }));
    } catch (e) {
      console.error("Failed to refresh workspace:", e);
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
    } catch (e) {
      console.error("Search failed:", e);
      update((s) => ({ ...s, searchResults: [], searchLoading: false }));
    }
  }

  async function closeWorkspace() {
    await invoke("unwatch_workspace").catch(() => {});
    set({
      rootPath: null,
      fileTree: [],
      expandedDirs: new Set(),
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
    });
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
