import { describe, it, expect, beforeEach, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

import { get } from "svelte/store";
import { workspaceStore, IS_WINDOWS } from "./workspaceStore";
import type { FileTreeNode } from "./workspaceStore";

const ROOT_A = "C:/root";
const ROOT_B = "C:/other";
const ROOT_SIBLING = "C:/a/b";

function dirNode(name: string, path: string, relPath: string): FileTreeNode {
  return { name, path, rel_path: relPath, is_dir: true, children: [] };
}

function fileNode(name: string, path: string, relPath: string): FileTreeNode {
  return { name, path, rel_path: relPath, is_dir: false, children: [] };
}

// `list_workspace_files_shallow` returns directories with their children stripped.
const treeA: FileTreeNode[] = [
  dirNode("docs", "C:/root/docs", "docs"),
  fileNode("readme.md", "C:/root/readme.md", "readme.md"),
];
const treeB: FileTreeNode[] = [fileNode("notes.md", "C:/other/notes.md", "notes.md")];
const treeSibling: FileTreeNode[] = [
  dirNode("sub", "C:/a/b/sub", "sub"),
  fileNode("x.md", "C:/a/b/x.md", "x.md"),
];

const docsChildren: FileTreeNode[] = [
  dirNode("guides", "C:/root/docs/guides", "docs/guides"),
  fileNode("intro.md", "C:/root/docs/intro.md", "docs/intro.md"),
];
const guidesChildren: FileTreeNode[] = [
  fileNode("deep.md", "C:/root/docs/guides/deep.md", "docs/guides/deep.md"),
];
const subChildren: FileTreeNode[] = [fileNode("x.md", "C:/a/b/sub/x.md", "sub/x.md")];

function backendReply(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  switch (cmd) {
    case "list_workspace_files_shallow":
      if (args?.root === ROOT_B) return Promise.resolve(treeB);
      if (args?.root === ROOT_SIBLING) return Promise.resolve(treeSibling);
      return Promise.resolve(treeA);
    case "list_dir_children":
      if (args?.path === "C:/root/docs") return Promise.resolve(docsChildren);
      if (args?.path === "C:/root/docs/guides") return Promise.resolve(guidesChildren);
      if (args?.path === "C:/a/b/sub") return Promise.resolve(subChildren);
      return Promise.resolve([]);
    case "search_workspace":
      return Promise.resolve([
        { path: "C:/root/docs/intro.md", rel_path: "docs/intro.md", line_number: 3, context: "intro" },
      ]);
    default:
      return Promise.resolve(undefined);
  }
}

function calls(cmd: string) {
  return invokeMock.mock.calls.filter((c) => c[0] === cmd);
}

function state() {
  return get(workspaceStore);
}

function snapshot() {
  const s = state();
  return {
    rootPath: s.rootPath,
    fileTree: s.fileTree,
    expandedDirs: [...s.expandedDirs].sort(),
  };
}

function findDir(nodes: FileTreeNode[], relPath: string): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.rel_path === relPath) return node;
    if (node.children.length > 0) {
      const found = findDir(node.children, relPath);
      if (found) return found;
    }
  }
  return undefined;
}

async function resetStores() {
  await workspaceStore.closeWorkspace();
}

describe("workspaceStore", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(backendReply);
    await resetStores();
  });

  it("openFile reveals a nested file by expanding its ancestors", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);

    await workspaceStore.openFile("C:/root/docs/guides/deep.md");

    const s = state();
    expect(s.rootPath).toBe(ROOT_A);
    expect([...s.expandedDirs].sort()).toEqual(["docs", "docs/guides"]);
    expect(findDir(s.fileTree, "docs")?.children.map((c) => c.rel_path)).toEqual([
      "docs/guides",
      "docs/intro.md",
    ]);
    expect(findDir(s.fileTree, "docs/guides")?.children).toEqual(guidesChildren);
  });

  it("openFile does nothing for a file outside the root", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    const before = snapshot();
    invokeMock.mockClear();

    await workspaceStore.openFile("C:/elsewhere/notes.md");

    const after = snapshot();
    expect(after.rootPath).toBe(before.rootPath);
    expect(after.fileTree).toEqual(before.fileTree);
    expect(after.expandedDirs).toEqual(before.expandedDirs);
    expect(calls("list_workspace_files_shallow")).toHaveLength(0);
    expect(calls("list_dir_children")).toHaveLength(0);
  });

  it("openFile does nothing when no workspace root is open", async () => {
    invokeMock.mockClear();

    await workspaceStore.openFile("C:/root/docs/intro.md");

    const s = state();
    expect(s.rootPath).toBeNull();
    expect(s.fileTree).toEqual([]);
    expect(s.expandedDirs.size).toBe(0);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("keeps sibling-prefix paths outside the root and normalises separators", async () => {
    await workspaceStore.loadWorkspace(ROOT_SIBLING);
    const before = snapshot();
    invokeMock.mockClear();

    // `C:/a/bc` shares the root's string prefix but is not inside `C:/a/b`.
    await workspaceStore.openFile("C:/a/bc/x.md");
    expect(snapshot()).toEqual(before);
    expect(calls("list_dir_children")).toHaveLength(0);

    // Forward and backslash spellings of an in-root path behave identically.
    await workspaceStore.openFile("C:/a/b/x.md");
    const forward = snapshot();
    expect(forward).toEqual(before);
    await workspaceStore.openFile("C:\\a\\b\\x.md");
    expect(snapshot()).toEqual(forward);
    expect(calls("list_dir_children")).toHaveLength(0);

    // A nested in-root path given with backslashes is still revealed.
    await workspaceStore.openFile("C:\\a\\b\\sub\\x.md");
    expect([...state().expandedDirs]).toEqual(["sub"]);
    expect(findDir(state().fileTree, "sub")?.children).toEqual(subChildren);
  });

  it("openFile(null) is a no-op", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    const before = snapshot();
    invokeMock.mockClear();

    await workspaceStore.openFile(null);

    expect(snapshot()).toEqual(before);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("toggleDir loads children once and reuses them across toggles", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    invokeMock.mockClear();

    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);

    expect([...state().expandedDirs]).toEqual(["docs"]);
    expect(findDir(state().fileTree, "docs")?.children).toEqual(docsChildren);
    expect(calls("list_dir_children")).toHaveLength(1);

    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);

    expect(state().expandedDirs.has("docs")).toBe(false);
    expect(calls("list_dir_children")).toHaveLength(1);

    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);

    expect(state().expandedDirs.has("docs")).toBe(true);
    expect(calls("list_dir_children")).toHaveLength(1);
  });

  it("loadWorkspace resets tree, expansion and search state for the new root", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);
    await workspaceStore.search("intro");

    expect(state().expandedDirs.has("docs")).toBe(true);
    expect(state().searchResults).toHaveLength(1);

    invokeMock.mockClear();
    await workspaceStore.loadWorkspace(ROOT_B);

    const s = state();
    expect(s.rootPath).toBe(ROOT_B);
    expect(s.fileTree).toEqual(treeB);
    expect(s.expandedDirs.size).toBe(0);
    expect(s.searchQuery).toBe("");
    expect(s.searchResults).toEqual([]);

    const cmds = invokeMock.mock.calls.map((c) => c[0]);
    expect(cmds).toContain("unwatch_workspace");
    expect(cmds).toContain("watch_workspace");
    expect(cmds.indexOf("unwatch_workspace")).toBeLessThan(cmds.indexOf("watch_workspace"));
  });

  it("closeWorkspace clears all state and stops watching", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);
    await workspaceStore.search("intro");
    invokeMock.mockClear();

    await workspaceStore.closeWorkspace();

    const s = state();
    expect(s.rootPath).toBeNull();
    expect(s.fileTree).toEqual([]);
    expect(s.expandedDirs.size).toBe(0);
    expect(s.searchQuery).toBe("");
    expect(s.searchResults).toEqual([]);
    expect(calls("unwatch_workspace")).toHaveLength(1);
  });

  it("leaves the tree intact when loading a directory's children fails", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    const before = snapshot();
    invokeMock.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "list_dir_children") return Promise.reject(new Error("boom"));
      return backendReply(cmd, args);
    });

    await workspaceStore.openFile("C:/root/docs/guides/deep.md");

    const s = state();
    expect(s.fileTree).toEqual(before.fileTree);
    expect([...s.expandedDirs]).toEqual(before.expandedDirs);
    expect(findDir(s.fileTree, "docs")?.children).toEqual([]);
  });

  it("createFile avoids a name already taken inside a nested directory", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    // `docs` must be in the tree first: the old lookup only scanned top-level
    // nodes and compared a forward-slash join against the node's backslash
    // path, so it never matched and the backend truncated the existing file.
    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);
    invokeMock.mockClear();

    const path = await workspaceStore.createFile("C:\\root\\docs", "intro.md");
    const folder = await workspaceStore.createFolder("C:\\root\\docs", "guides");

    expect(path).toBe("C:/root/docs/intro-2.md");
    expect(folder).toBe("C:/root/docs/guides-2");
    expect(calls("create_workspace_file")[0][1]).toEqual({ path: "C:/root/docs/intro-2.md" });
    expect(calls("create_workspace_folder")[0][1]).toEqual({ path: "C:/root/docs/guides-2" });
  });

  it("parentDirectory keeps the separator for a drive root", () => {
    expect(workspaceStore.parentDirectory("C:\\notes.md")).toBe("C:\\");
    expect(workspaceStore.parentDirectory("C:/notes.md")).toBe("C:/");
    expect(workspaceStore.parentDirectory("C:\\a\\b.md")).toBe("C:\\a");
    expect(workspaceStore.parentDirectory("/notes.md")).toBe("/");
    expect(workspaceStore.parentDirectory("notes.md")).toBe(".");
  });

  it.skipIf(!IS_WINDOWS)("matches the workspace root case-insensitively on Windows", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    invokeMock.mockClear();

    await workspaceStore.openFile("c:/ROOT/docs/intro.md");

    expect([...state().expandedDirs]).toEqual(["docs"]);
    expect(findDir(state().fileTree, "docs")?.children).toEqual(docsChildren);

    // Folded comparison must still respect the path boundary.
    invokeMock.mockClear();
    await workspaceStore.openFile("C:/ROOTX/x.md");
    expect([...state().expandedDirs]).toEqual(["docs"]);
    expect(calls("list_dir_children")).toHaveLength(0);
  });

  it("two overlapping toggles of an unloaded directory load its children once", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    invokeMock.mockClear();
    const docs = findDir(state().fileTree, "docs")!;

    await Promise.all([workspaceStore.toggleDir(docs), workspaceStore.toggleDir(docs)]);

    expect(calls("list_dir_children")).toHaveLength(1);
    expect(findDir(state().fileTree, "docs")?.children).toEqual(docsChildren);
  });

  it("rolls back the expansion when a directory's children cannot be listed", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    invokeMock.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "list_dir_children") return Promise.reject(new Error("boom"));
      return backendReply(cmd, args);
    });

    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);

    expect(state().expandedDirs.has("docs")).toBe(false);
    expect(findDir(state().fileTree, "docs")?.children).toEqual([]);
  });

  it("refresh keeps an expansion made while the listing was in flight", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    const docs = findDir(state().fileTree, "docs")!;

    const refreshing = workspaceStore.refresh();
    await workspaceStore.toggleDir(docs);
    await refreshing;

    expect([...state().expandedDirs]).toEqual(["docs"]);
    expect(findDir(state().fileTree, "docs")?.children).toEqual(docsChildren);
  });

  it("refresh drops expansion keys for directories that no longer exist", async () => {
    await workspaceStore.loadWorkspace(ROOT_A);
    await workspaceStore.toggleDir(findDir(state().fileTree, "docs")!);
    expect(state().expandedDirs.has("docs")).toBe(true);
    invokeMock.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "list_workspace_files_shallow") {
        return Promise.resolve([fileNode("readme.md", "C:/root/readme.md", "readme.md")]);
      }
      return backendReply(cmd, args);
    });

    await workspaceStore.refresh();

    expect([...state().expandedDirs]).toEqual([]);
  });
});
