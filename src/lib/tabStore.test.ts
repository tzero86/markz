import { describe, it, expect, beforeEach, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: vi.fn(() => Promise.resolve(true)),
}));

import { get } from "svelte/store";
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
});
