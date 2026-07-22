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
      const prevExpanded = state.expandedDirs;
      update((s) => ({ ...s, fileTree: tree, expandedDirs: prevExpanded }));
      logOperationEnd("workspace", "Refresh workspace", `${tree.length} top-level items`);

      // Re-load children for any directories that were expanded before the
      // refresh so the tree does not collapse under the user. Process from
      // shallow to deep so parent chains are loaded before nested dirs are
      // looked up.
      const expandedList = Array.from(prevExpanded).sort(
        (a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)
      );
      for (const relPath of expandedList) {
        const node = findNode(get({ subscribe }).fileTree, relPath);
        if (node && node.is_dir && node.children.length === 0) {
          await loadChildren(node).catch((e) => {
            logError("workspace", `Failed to reload expanded dir ${relPath}`, String(e));
          });
        }
      }

      // A manual refresh should also surface changes to open files, just like
      // the file-system watcher does for external edits.
      window.dispatchEvent(new CustomEvent("markz:check-open-files"));
    } catch (e) {
      logError("workspace", "Failed to refresh workspace", String(e));
    }
  }

  async function loadChildren(node: FileTreeNode) {
    if (!node.is_dir) return;
    const state = get({ subscribe });
    if (!state.rootPath) return;
    logOperationStart("workspace", `Load children: ${node.rel_path}`);
    logOperationStart("workspace", `Load children args: path=${node.path}, root=${state.rootPath}`);
    try {
      const children = await invoke<FileTreeNode[]>("list_dir_children", {
        path: node.path,
        root: state.rootPath,
      });
      // Defensive check: children should be located under the requested node.
      const invalid = children.filter(
        (c) => c.rel_path !== node.rel_path && !c.rel_path.startsWith(node.rel_path + "/")
      );
      if (invalid.length > 0) {
        logError(
          "workspace",
          `Children rel_path mismatch for ${node.rel_path}`,
          invalid.map((c) => c.rel_path).join(", ")
        );
      }
      update((s) => ({ ...s, fileTree: setNodeChildren(s.fileTree, node.rel_path, children) }));
      logOperationEnd("workspace", `Load children: ${node.rel_path}`, `${children.length} items`);
    } catch (e) {
      logError("workspace", `Failed to load children: ${node.rel_path}`, String(e));
    }
  }

  async function toggleDir(node: FileTreeNode) {
    const relPath = node.rel_path;
    logOperationStart("workspace", `Toggle dir: ${relPath}, is_dir=${node.is_dir}, children=${node.children.length}`);
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
    logOperationEnd("workspace", `Toggle dir: ${relPath}`, isExpanded ? "collapsed" : "expanded");
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

  function pathInWorkspace(path: string, rootPath: string): boolean {
    const root = rootPath.replace(/\\/g, "/").replace(/\/$/, "");
    const norm = path.replace(/\\/g, "/");
    return norm === root || norm.startsWith(root + "/");
  }

  /** Reveal a file in the existing workspace tree if it belongs to the
   *  current root. Does not re-root the workspace, so opening a single file
   *  does not feel like opening a folder. */
  async function openFile(path: string) {
    const state = get({ subscribe });
    if (state.rootPath && pathInWorkspace(path, state.rootPath)) {
      await revealFilePath(path);
    }
  }

  async function syncToFile(path: string | null) {
    const state = get({ subscribe });
    if (path === null) {
      if (state.rootPath === null) return;
      await closeWorkspace();
      return;
    }
    await openFile(path);
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

  function uniqueName(parentPath: string, baseName: string, isDir: boolean): string {
    let candidate = baseName;
    let counter = 1;
    const ext = isDir ? "" : baseName.slice(baseName.lastIndexOf("."));
    const stem = isDir ? baseName : baseName.slice(0, baseName.lastIndexOf("."));
    while (get({ subscribe }).fileTree.find((n) => n.path === `${parentPath}/${candidate}`)) {
      counter++;
      candidate = isDir ? `${stem}-${counter}` : `${stem}-${counter}${ext}`;
    }
    return candidate;
  }

  async function createFile(parentPath: string, name?: string) {
    const state = get({ subscribe });
    if (!state.rootPath) return null;
    const baseName = name?.trim() || "untitled.md";
    const fileName = uniqueName(parentPath, baseName, false);
    const path = parentPath.replace(/\\/g, "/") + "/" + fileName;
    logOperationStart("workspace", `Create file: ${path}`);
    try {
      await invoke("create_workspace_file", { path });
      logOperationEnd("workspace", `Create file: ${path}`);
      await refresh();
      return path;
    } catch (e) {
      logError("workspace", `Failed to create file: ${path}`, String(e));
      return null;
    }
  }

  async function createFolder(parentPath: string, name?: string) {
    const state = get({ subscribe });
    if (!state.rootPath) return null;
    const baseName = name?.trim() || "New Folder";
    const folderName = uniqueName(parentPath, baseName, true);
    const path = parentPath.replace(/\\/g, "/") + "/" + folderName;
    logOperationStart("workspace", `Create folder: ${path}`);
    try {
      await invoke("create_workspace_folder", { path });
      logOperationEnd("workspace", `Create folder: ${path}`);
      await refresh();
      return path;
    } catch (e) {
      logError("workspace", `Failed to create folder: ${path}`, String(e));
      return null;
    }
  }

  async function renameEntry(path: string, newName: string) {
    const state = get({ subscribe });
    if (!state.rootPath) return null;
    logOperationStart("workspace", `Rename: ${path} -> ${newName}`);
    try {
      const newPath = await invoke<string>("rename_workspace_entry", { oldPath: path, newName });
      logOperationEnd("workspace", `Rename: ${path} -> ${newPath}`);
      await refresh();
      return newPath;
    } catch (e) {
      logError("workspace", `Failed to rename: ${path}`, String(e));
      return null;
    }
  }

  async function deleteEntry(path: string) {
    const state = get({ subscribe });
    if (!state.rootPath) return false;
    logOperationStart("workspace", `Delete: ${path}`);
    try {
      await invoke("delete_workspace_entry", { path });
      logOperationEnd("workspace", `Delete: ${path}`);
      await refresh();
      return true;
    } catch (e) {
      logError("workspace", `Failed to delete: ${path}`, String(e));
      return false;
    }
  }

  return {
    subscribe,
    openWorkspace,
    loadWorkspace,
    refresh,
    toggleDir,
    search,
    closeWorkspace,
    openFile,
    revealFilePath,
    syncToFile,
    parentDirectory,
    createFile,
    createFolder,
    renameEntry,
    deleteEntry,
  };
}

export const workspaceStore = createWorkspaceStore();
