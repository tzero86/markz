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

/** Windows path comparison is case-insensitive; every other platform is not.
 *  Resolved once here (the webview reports it through `navigator`, the test
 *  runner through `process`) so no call site has to re-decide. Exported so the
 *  case-insensitivity tests guard on the same decision the code makes. */
export const IS_WINDOWS = ((): boolean => {
  const runtime: unknown = globalThis;
  if (typeof runtime === "object" && runtime !== null && "process" in runtime) {
    const proc: unknown = runtime.process;
    if (typeof proc === "object" && proc !== null && "platform" in proc) {
      return proc.platform === "win32";
    }
  }
  return typeof navigator !== "undefined" && /windows|win32/i.test(navigator.userAgent);
})();

/** Normalise a path for comparison: forward slashes everywhere, folded case on
 *  Windows where `C:\Docs` and `c:\docs` name the same directory. */
function normalizePath(path: string): string {
  const slashed = path.replace(/\\/g, "/");
  return IS_WINDOWS ? slashed.toLowerCase() : slashed;
}

/** Every path present in the loaded tree, normalised for comparison. Directories
 *  only appear with their children once listed, so this is the best picture
 *  available without another round trip. */
function collectPaths(tree: FileTreeNode[], into: Set<string>): Set<string> {
  for (const node of tree) {
    into.add(normalizePath(node.path).replace(/\/$/, ""));
    if (node.children?.length > 0) collectPaths(node.children, into);
  }
  return into;
}

/** `rel_path`s of every directory present in the loaded tree. */
function collectDirRelPaths(tree: FileTreeNode[], into: Set<string>): Set<string> {
  for (const node of tree) {
    if (!node.is_dir) continue;
    into.add(node.rel_path);
    if (node.children?.length > 0) collectDirRelPaths(node.children, into);
  }
  return into;
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
      // `state` is a pre-await snapshot: writing it back would undo every
      // directory the user expanded while the listing was in flight.
      update((s) => ({ ...s, fileTree: tree }));
      logOperationEnd("workspace", "Refresh workspace", `${tree.length} top-level items`);

      // Re-load children for any directories that are still expanded so the
      // tree does not collapse under the user. Process from shallow to deep so
      // parent chains are loaded before nested dirs are looked up.
      const expandedList = Array.from(get({ subscribe }).expandedDirs).sort(
        (a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)
      );
      for (const relPath of expandedList) {
        const node = findNode(get({ subscribe }).fileTree, relPath);
        if (node && node.is_dir && (node.children?.length ?? 0) === 0) {
          await loadChildren(node);
        }
      }

      // Drop expansion keys whose directory no longer exists in the refreshed
      // tree: a deleted or renamed directory must not leave a stale key behind,
      // which would render a later same-named folder expanded-but-empty.
      update((s) => {
        const present = collectDirRelPaths(s.fileTree, new Set<string>());
        const next = new Set<string>();
        for (const key of s.expandedDirs) {
          if (present.has(key)) next.add(key);
        }
        return { ...s, expandedDirs: next };
      });

      // A manual refresh should also surface changes to open files, just like
      // the file-system watcher does for external edits.
      window.dispatchEvent(new CustomEvent("markz:check-open-files"));
    } catch (e) {
      logError("workspace", "Failed to refresh workspace", String(e));
    }
  }

  /** Returns whether the children were loaded, so callers that committed to
   *  an expansion can roll it back when the listing failed. */
  async function loadChildren(node: FileTreeNode): Promise<boolean> {
    if (!node.is_dir) return false;
    const state = get({ subscribe });
    if (!state.rootPath) return false;
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
      return true;
    } catch (e) {
      logError("workspace", `Failed to load children: ${node.rel_path}`, String(e));
      return false;
    }
  }

  async function toggleDir(node: FileTreeNode) {
    const relPath = node.rel_path;
    logOperationStart("workspace", `Toggle dir: ${relPath}, is_dir=${node.is_dir}, children=${node.children?.length ?? 0}`);
    if (get({ subscribe }).expandedDirs.has(relPath)) {
      update((s) => {
        const next = new Set(s.expandedDirs);
        next.delete(relPath);
        return { ...s, expandedDirs: next };
      });
      logOperationEnd("workspace", `Toggle dir: ${relPath}`, "collapsed");
      return;
    }
    // Commit the expansion before awaiting the listing: an overlapping toggle
    // must read the committed intent (and collapse it) instead of deciding from
    // the stale pre-await state and cancelling this expansion out.
    update((s) => {
      const next = new Set(s.expandedDirs);
      next.add(relPath);
      return { ...s, expandedDirs: next };
    });
    if (node.is_dir && (node.children?.length ?? 0) === 0) {
      const loaded = await loadChildren(node);
      if (!loaded) {
        // Never leave a directory rendered expanded with no children.
        update((s) => {
          const next = new Set(s.expandedDirs);
          next.delete(relPath);
          return { ...s, expandedDirs: next };
        });
        logOperationEnd("workspace", `Toggle dir: ${relPath}`, "expand failed");
        return;
      }
    }
    logOperationEnd("workspace", `Toggle dir: ${relPath}`, "expanded");
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
    // `C:\notes.md` -> `C:\`: a bare `C:` is drive-relative and would resolve
    // against the process working directory instead of the drive root.
    if (lastSep === 2 && /^[A-Za-z]:[\\/]/.test(path)) return path.slice(0, 3);
    return path.slice(0, lastSep);
  }

  function pathInWorkspace(path: string, rootPath: string): boolean {
    const root = normalizePath(rootPath).replace(/\/$/, "");
    const norm = normalizePath(path);
    return norm === root || norm.startsWith(root + "/");
  }

  /** Reveal a file in the open tree when it belongs to the current root.
   *  Never re-roots: the root only changes when the user explicitly opens a
   *  folder (or saves an untitled document into one). */
  async function openFile(path: string | null) {
    if (path === null) return;
    const state = get({ subscribe });
    if (state.rootPath && pathInWorkspace(path, state.rootPath)) {
      await revealFilePath(path);
    }
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

      if (dirNode.is_dir && (dirNode.children?.length ?? 0) === 0) {
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
      if (node.is_dir && node.children?.length > 0) {
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
      if (node.is_dir && node.children?.length > 0) {
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
    // The whole tree, not just the top level: directories are nested once
    // listed, and on Windows `node.path` uses backslashes while `parentPath`
    // here is joined with forward slashes — both sides must be normalised or
    // the comparison silently never matches.
    const taken = collectPaths(get({ subscribe }).fileTree, new Set<string>());
    const parent = normalizePath(parentPath).replace(/\/$/, "");
    while (taken.has(`${parent}/${normalizePath(candidate)}`)) {
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
    parentDirectory,
    createFile,
    createFolder,
    renameEntry,
    deleteEntry,
  };
}

export const workspaceStore = createWorkspaceStore();
