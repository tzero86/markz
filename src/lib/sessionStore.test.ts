import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSession,
  getSession,
  clearSession,
  hasSession,
} from "./sessionStore";

const STORAGE_KEY = "markz-session";

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("sessionStore", () => {
  beforeEach(() => {
    // @ts-expect-error replace global localStorage with our mock
    globalThis.localStorage = new MockStorage();
  });

  it("returns null when no session exists", () => {
    expect(getSession()).toBeNull();
    expect(hasSession()).toBe(false);
  });

  it("saves and loads a session with file tabs", () => {
    saveSession(
      [
        { path: "/a.md" },
        { path: "/b.md" },
      ],
      "/b.md"
    );

    const session = getSession();
    expect(session).not.toBeNull();
    expect(session!.tabs).toEqual([{ path: "/a.md" }, { path: "/b.md" }]);
    expect(session!.activeTabPath).toBe("/b.md");
    expect(hasSession()).toBe(true);
  });

  it("skips tabs with null paths", () => {
    saveSession(
      [
        { path: "/file.md" },
        { path: null },
        { path: "/other.md" },
      ],
      "/file.md"
    );

    const session = getSession();
    expect(session!.tabs).toEqual([{ path: "/file.md" }, { path: "/other.md" }]);
  });

  it("deduplicates paths preserving first occurrence", () => {
    saveSession(
      [
        { path: "/dup.md" },
        { path: "/dup.md" },
        { path: "/unique.md" },
        { path: "/dup.md" },
      ],
      "/unique.md"
    );

    const session = getSession();
    expect(session!.tabs).toEqual([
      { path: "/dup.md" },
      { path: "/unique.md" },
    ]);
  });

  it("handles empty tabs array", () => {
    saveSession([], null);
    const session = getSession();
    expect(session!.tabs).toEqual([]);
    expect(session!.activeTabPath).toBeNull();
  });

  it("clears session from storage", () => {
    saveSession([{ path: "/x.md" }], "/x.md");
    expect(hasSession()).toBe(true);

    clearSession();
    expect(getSession()).toBeNull();
    expect(hasSession()).toBe(false);
  });

  it("ignores corrupted localStorage data", () => {
    localStorage.setItem(STORAGE_KEY, "invalid-json");
    expect(getSession()).toBeNull();
    expect(hasSession()).toBe(false);
  });

  it("ignores malformed object shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(getSession()).toBeNull();
  });

  it("survives localStorage quota errors gracefully", () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    // Should not throw
    expect(() => saveSession([{ path: "/big.md" }], "/big.md")).not.toThrow();

    localStorage.setItem = originalSetItem;
  });
});
