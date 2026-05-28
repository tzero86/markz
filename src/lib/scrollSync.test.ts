import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrollSyncController } from "./scrollSync";

describe("ScrollSyncController", () => {
  let controller: ScrollSyncController;

  beforeEach(() => {
    controller = new ScrollSyncController();
  });

  it("sync scrolls target based on source ratio", () => {
    const source = document.createElement("div");
    const target = document.createElement("div");

    Object.defineProperty(source, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(source, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(target, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(target, "clientHeight", { value: 100, configurable: true });

    source.scrollTop = 50; // 50% of scrollable range

    controller.sync(source, target);

    // rAF is async; use vi.waitFor for the DOM mutation
    return vi.waitFor(() => {
      expect(target.scrollTop).toBe(150); // 50% of 300
    });
  });

  it("syncEditorToPreview falls back to ratio sync when no heading found", () => {
    const editorScroller = document.createElement("div");
    const previewScroller = document.createElement("div");

    Object.defineProperty(editorScroller, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(editorScroller, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(previewScroller, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(previewScroller, "clientHeight", { value: 100, configurable: true });

    editorScroller.scrollTop = 50;

    // Mock EditorView with no headings in viewport
    const mockView = {
      state: { doc: { lineAt: () => ({ number: 5, text: "plain text" }), line: () => ({ number: 1, text: "" }) } },
      viewport: { from: 0, to: 100 },
    } as any;

    controller.syncEditorToPreview(mockView, editorScroller, previewScroller);

    return vi.waitFor(() => {
      expect(previewScroller.scrollTop).toBe(150);
    });
  });
});
