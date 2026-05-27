import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  saveSession,
  getSession,
  clearSession,
  hasSession,
} from "./sessionStore";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

describe("sessionStore", () => {
  beforeEach(() => {
    invokeMock.mockClear();
  });

  it("saves session via invoke", async () => {
    invokeMock.mockResolvedValue(undefined);

    await saveSession(
      [
        { content: "# Hello", path: "/a.md", title: "a.md", isDirty: false },
        { content: "# World", path: null, title: "Untitled", isDirty: true },
      ],
      "/a.md"
    );

    expect(invokeMock).toHaveBeenCalledWith("save_session", {
      tabs: [
        { content: "# Hello", path: "/a.md", title: "a.md", is_dirty: false },
        { content: "# World", path: null, title: "Untitled", is_dirty: true },
      ],
      active_tab_path: "/a.md",
    });
  });

  it("loads session and maps snake_case to camelCase", async () => {
    invokeMock.mockResolvedValue({
      tabs: [
        { content: "# Hello", path: "/a.md", title: "a.md", is_dirty: false },
        { content: "# World", path: null, title: "Untitled", is_dirty: true },
      ],
      active_tab_path: "/a.md",
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session!.tabs).toEqual([
      { content: "# Hello", path: "/a.md", title: "a.md", isDirty: false },
      { content: "# World", path: null, title: "Untitled", isDirty: true },
    ]);
    expect(session!.activeTabPath).toBe("/a.md");
  });

  it("returns null when no session exists", async () => {
    invokeMock.mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("clears session via invoke", async () => {
    invokeMock.mockResolvedValue(undefined);
    await clearSession();
    expect(invokeMock).toHaveBeenCalledWith("clear_session_disk");
  });

  it("hasSession returns true when session exists", async () => {
    invokeMock.mockResolvedValue({
      tabs: [{ content: "", path: "/x.md", title: "x.md", is_dirty: false }],
      active_tab_path: "/x.md",
    });
    expect(await hasSession()).toBe(true);
  });

  it("hasSession returns false when session is null", async () => {
    invokeMock.mockResolvedValue(null);
    expect(await hasSession()).toBe(false);
  });

  it("hasSession returns false when session has no tabs", async () => {
    invokeMock.mockResolvedValue({ tabs: [], active_tab_path: null });
    expect(await hasSession()).toBe(false);
  });

  it("handles empty tabs array", async () => {
    invokeMock.mockResolvedValue({ tabs: [], active_tab_path: null });
    const session = await getSession();
    expect(session!.tabs).toEqual([]);
    expect(session!.activeTabPath).toBeNull();
  });

  it("survives invoke errors gracefully", async () => {
    invokeMock.mockRejectedValue(new Error("Disk full"));
    await expect(saveSession([], null)).rejects.toThrow("Disk full");
  });
});
