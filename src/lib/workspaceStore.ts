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

    update((s) => ({
      ...s,
      rootPath: path,
      fileTree: [],
      expandedDirs: new Set(),
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
    }));
    try {
      const tree = await invoke<FileTreeNode[]>("list_workspace_files_shallow", { root: path });
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
      const tree = await invoke<FileTreeNode[]>("list_workspace_files_shallow", { root: state.rootPath });
      update((s) => ({ ...s, fileTree: tree, expandedDirs: new Set() }));
      logOperationEnd("workspace", "Refresh workspace", `${tree.length} top-level items`);
    } catch (e) {
      logError("workspace", "Failed to refresh workspace", String(e));
    }
  }

  async function loadChildren(node: FileTreeNode) {
    if (!node.is_dir) return;
    const state = get({ subscribe });
    if (!state.rootPath) return;
    logOperationStart("workspace", `Load children: ${node.rel_path}`);
    try {
      const children = await invoke<FileTreeNode[]>("list_dir_children", {
        path: node.path,
        root: state.rootPath,
      });
      update((s) => ({ ...s, fileTree: setNodeChildren(s.fileTree, node.rel_path, children) }));
      logOperationEnd("workspace", `Load children: ${node.rel_path}`, `${children.length} items`);
    } catch (e) {
      logError("workspace", `Failed to load children: ${node.rel_path}`, String(e));
    }
  }

  async function toggleDir(node: FileTreeNode) {
    const relPath = node.rel_path;
    const isExpanded = get({ subscribe }).expandedDirs.has(relPath);
    if (!isExpanded && node.is_dir && node.children.length === 0) {
      await loadChildren(node);
    }
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

  function parentDirectory(path: string): string {
    const lastSep = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    if (lastSep === -1) return ".";
    if (lastSep === 0) return "/";
    return path.slice(0, lastSep);
  }

  async function syncToFile(path: string | null) {
    const state = get({ subscribe });
    if (path === null) {
      if (state.rootPath === null) return;
      await closeWorkspace();
      return;
    }
    const parent = parentDirectory(path);
    if (parent !== state.rootPath) {
      await loadWorkspace(parent);
    }
    await revealFilePath(path);
  }

  async function revealFilePath(path: string) {
    const state = get({ subscribe });
    if (!state.rootPath) return;

    // Make sure the root level is loaded.
    if (state.fileTree.length === 0) {
      try {
        const tree = await invoke<FileTreeNode[]>("list_workspace_files_shallow", { root: state.rootPath });
        update((s) => ({ ...s, fileTree: tree }));
      } catch (e) {
        logError("workspace", "Failed to load root for reveal", String(e));
        return;
      }
    }

    const relRaw = path.slice(state.rootPath.length).replace(/^[\\/]/, "");
    const rel = relRaw.replace(/\\/g, "/");
    const parts = rel.split("/").filter(Boolean);
    if (parts.length === 0) return;

    // Expand each directory on the path to the file.
    let currentNodes = get({ subscribe }).fileTree;
    for (let i = 0; i < parts.length - 1; i++) {
      const relSoFar = parts.slice(0, i + 1).join("/");
      const dirNode = findNode(currentNodes, relSoFar);
      if (!dirNode) break;

      if (dirNode.is_dir && dirNode.children.length === 0) {
        try {
          const children = await invoke<FileTreeNode[]>("list_dir_children", {
            path: dirNode.path,
            root: state.rootPath,
          });
          update((s) => ({
            ...s,
            fileTree: setNodeChildren(s.fileTree, relSoFar, children),
          }));
        } catch (e) {
          logError("workspace", `Failed to reveal ${relSoFar}`, String(e));
          break;
        }
      }

      update((s) => {
        const next = new Set(s.expandedDirs);
        next.add(relSoFar);
        return { ...s, expandedDirs: next };
      });

      const fresh = get({ subscribe });
      const node = findNode(fresh.fileTree, relSoFar);
      currentNodes = node?.children ?? [];
    }
  }

  function findNode(tree: FileTreeNode[], relPath: string): FileTreeNode | null {
    for (const node of tree) {
      if (node.rel_path === relPath) return node;
      if (node.is_dir && node.children.length > 0) {
        const found = findNode(node.children, relPath);
        if (found) return found;
      }
    }
    return null;
  }

  function setNodeChildren(
    tree: FileTreeNode[],
    relPath: string,
    children: FileTreeNode[]
  ): FileTreeNode[] {
    return tree.map((node) => {
      if (node.rel_path === relPath) {
        return { ...node, children };
      }
      if (node.is_dir && node.children.length > 0) {
        return { ...node, children: setNodeChildren(node.children, relPath, children) };
      }
      return node;
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
    syncToFile,
  };
}

export const workspaceStore = createWorkspaceStore();
