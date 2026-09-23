import { describe, it, expect, beforeEach, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: vi.fn(() => Promise.resolve(true)),
}));

import { get } from "svelte/store";
import { confirm } from "@tauri-apps/plugin-dialog";
import { tabStore } from "./tabStore";
import { workspaceStore } from "./workspaceStore";

async function resetStores() {
  await tabStore.closeAll();
  await workspaceStore.closeWorkspace();
}

describe("tabStore workspace sync", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "list_workspace_files_shallow" || cmd === "list_dir_children") {
        return Promise.resolve([]);
      }
      return Promise.resolve(undefined);
    });
    await resetStores();
  });

  it("closes the workspace when the last file-backed tab is closed", async () => {
    tabStore.newTab("# Hello", undefined, "/project/notes.md");
    await workspaceStore.loadWorkspace("/project");

    expect(get(workspaceStore).rootPath).toBe("/project");

    const state = get(tabStore);
    const fileTab = state.tabs.find((t) => t.path === "/project/notes.md");
    expect(fileTab).toBeDefined();
    await tabStore.closeTab(fileTab!.id);

    expect(get(workspaceStore).rootPath).toBeNull();
  });

  it("keeps the workspace open when a file tab remains", async () => {
    tabStore.newTab("# A", undefined, "/project/a.md");
    tabStore.newTab("# B", undefined, "/project/b.md");
    await workspaceStore.loadWorkspace("/project");

    const state = get(tabStore);
    const aTab = state.tabs.find((t) => t.path === "/project/a.md");
    await tabStore.closeTab(aTab!.id);

    expect(get(workspaceStore).rootPath).toBe("/project");
  });

  it("closes the workspace via closeAll when no file tabs remain", async () => {
    tabStore.newTab("# File", undefined, "/project/file.md");
    await workspaceStore.loadWorkspace("/project");

    await tabStore.closeAll();

    expect(get(workspaceStore).rootPath).toBeNull();
    expect(get(tabStore).tabs.length).toBe(1);
    expect(get(tabStore).tabs[0].path).toBeNull();
  });

  it("keeps the workspace open when only a pathless tab is closed", async () => {
    await workspaceStore.loadWorkspace("/project");
    const closeSpy = vi.spyOn(workspaceStore, "closeWorkspace");

    const untitled = get(tabStore).tabs[0];
    expect(untitled.path).toBeNull();
    await tabStore.closeTab(untitled.id);

    expect(closeSpy).not.toHaveBeenCalled();
    expect(get(workspaceStore).rootPath).toBe("/project");

    const fileId = tabStore.newTab("# F", undefined, "/project/f.md");
    await tabStore.closeTab(fileId);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(get(workspaceStore).rootPath).toBeNull();

    closeSpy.mockRestore();
  });
});

describe("tabStore closeAllExcept", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "list_workspace_files_shallow" || cmd === "list_dir_children") {
        return Promise.resolve([]);
      }
      return Promise.resolve(undefined);
    });
    await resetStores();
  });

  it("keeps a tab whose close the user declined", async () => {
    const a = tabStore.newTab("A content", undefined, "/project/a.md");
    const b = tabStore.newTab("B content", undefined, "/project/b.md");
    const c = tabStore.newTab("C content", undefined, "/project/c.md");

    tabStore.switchTab(a);
    tabStore.setContent("A edited");
    tabStore.switchTab(b);
    tabStore.setContent("B edited");

    vi.mocked(confirm)
      .mockResolvedValueOnce(false) // A: keep it
      .mockResolvedValueOnce(true); // B: discard it

    await tabStore.closeAllExcept(c);

    const state = get(tabStore);
    const aTab = state.tabs.find((t) => t.id === a);
    expect(aTab).toBeDefined();
    expect(aTab!.content).toBe("A edited");
    expect(aTab!.isDirty).toBe(true);
    expect(aTab!.path).toBe("/project/a.md");
    expect(state.tabs.some((t) => t.id === b)).toBe(false);
    expect(state.tabs.some((t) => t.id === c)).toBe(true);
    expect(state.activeTabId).toBe(c);
  });
});

describe("tabStore closeTabByPath", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "list_workspace_files_shallow" || cmd === "list_dir_children") {
        return Promise.resolve([]);
      }
      return Promise.resolve(undefined);
    });
    await resetStores();
  });

  it("leaves one tab and a non-empty activeTabId when the only file tab is closed", async () => {
    const untitled = get(tabStore).tabs[0];
    const fileId = tabStore.newTab("# Only", undefined, "/project/only.md");
    await tabStore.closeTab(untitled.id);

    tabStore.closeTabByPath("/project/only.md");

    const state = get(tabStore);
    expect(state.tabs.length).toBe(1);
    expect(state.tabs.some((t) => t.id === fileId)).toBe(false);
    expect(state.activeTabId).not.toBe("");
    expect(state.activeTabId).toBe(state.tabs[0].id);
    expect(state.tabs[0].path).toBeNull();
  });

  it("closes every tab open on the same path", async () => {
    const first = tabStore.newTab("# One", undefined, "/project/dup.md");
    const second = tabStore.newTab("# Two", undefined, "/project/dup.md");

    tabStore.closeTabByPath("/project/dup.md");

    const state = get(tabStore);
    expect(state.tabs.some((t) => t.id === first)).toBe(false);
    expect(state.tabs.some((t) => t.id === second)).toBe(false);
    expect(state.tabs.length).toBe(1);
    expect(state.activeTabId).not.toBe("");
  });

  it("matches a backslash tab path against a forward-slash argument", async () => {
    const id = tabStore.newTab("# A", undefined, "C:\\proj\\docs\\a.md");

    tabStore.closeTabByPath("C:/proj/docs/a.md");

    expect(get(tabStore).tabs.some((t) => t.id === id)).toBe(false);
    expect(get(tabStore).activeTabId).not.toBe("");
  });

  it.skipIf(process.platform !== "win32")("matches paths case-insensitively on Windows", async () => {
    const id = tabStore.newTab("# A", undefined, "C:\\Proj\\Docs\\a.md");

    tabStore.closeTabByPath("c:/proj/docs/A.md");

    expect(get(tabStore).tabs.some((t) => t.id === id)).toBe(false);
  });
});

describe("tabStore renameTabPath", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "list_workspace_files_shallow" || cmd === "list_dir_children") {
        return Promise.resolve([]);
      }
      return Promise.resolve(undefined);
    });
    await resetStores();
  });

  it("renames every tab under a directory and leaves unrelated tabs alone", () => {
    const a = tabStore.newTab("# A", undefined, "docs/a.md");
    const b = tabStore.newTab("# B", undefined, "docs/b.md");
    const sibling = tabStore.newTab("# S", undefined, "docs2/c.md");
    const other = tabStore.newTab("# O", undefined, "notes.md");

    tabStore.renameTabPath("docs", "docs2");

    const state = get(tabStore);
    const pathOf = (id: string) => state.tabs.find((t) => t.id === id)!.path as string;
    expect(pathOf(a)).toBe("docs2/a.md");
    expect(pathOf(b)).toBe("docs2/b.md");
    expect(state.tabs.find((t) => t.id === a)!.title).toBe("a.md");
    expect(pathOf(sibling)).toBe("docs2/c.md");
    expect(pathOf(other)).toBe("notes.md");
  });

  it("matches across separator styles and keeps each tab's own style", () => {
    const backslashed = tabStore.newTab("# A", undefined, "C:\\proj\\docs\\a.md");
    const slashed = tabStore.newTab("# B", undefined, "C:/proj/docs/b.md");

    tabStore.renameTabPath("C:\\proj\\docs", "C:\\proj\\docs2");

    const state = get(tabStore);
    const pathOf = (id: string) => state.tabs.find((t) => t.id === id)!.path as string;
    expect(pathOf(backslashed)).toBe("C:\\proj\\docs2\\a.md");
    expect(pathOf(slashed)).toBe("C:/proj/docs2/b.md");
  });

  it("handles a trailing separator on the old path", () => {
    const a = tabStore.newTab("# A", undefined, "docs/a.md");

    tabStore.renameTabPath("docs/", "docs2");

    expect(get(tabStore).tabs.find((t) => t.id === a)!.path).toBe("docs2/a.md");
  });
});
