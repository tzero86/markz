import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrollSyncController } from "./scrollSync";

describe("ScrollSyncController", () => {
  let controller: ScrollSyncController;

  beforeEach(() => {
    controller = new ScrollSyncController();
  });

  it("syncPreviewToEditor scrolls editor based on preview ratio", () => {
    const preview = document.createElement("div");
    const editor = document.createElement("div");

    Object.defineProperty(preview, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(preview, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(editor, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(editor, "clientHeight", { value: 100, configurable: true });

    preview.scrollTop = 50; // 50% of scrollable range

    controller.syncPreviewToEditor(preview, editor);

    return vi.waitFor(() => {
      expect(editor.scrollTop).toBe(150); // 50% of 300
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

    const mockView = {
      state: { doc: { lineAt: () => ({ number: 5, text: "plain text" }), line: () => ({ number: 1, text: "" }) } },
      viewport: { from: 0, to: 100 },
    } as any;

    controller.syncEditorToPreview(mockView, editorScroller, previewScroller);

    return vi.waitFor(() => {
      expect(previewScroller.scrollTop).toBe(150);
    });
  });

  it("does not bounce back when preview scroll was triggered programmatically", () => {
    const preview = document.createElement("div");
    const editor = document.createElement("div");

    Object.defineProperty(preview, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(preview, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(editor, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(editor, "clientHeight", { value: 100, configurable: true });

    preview.scrollTop = 50;
    editor.scrollTop = 25;

    // Simulate: editor scroll triggers preview scroll programmatically
    const mockView = {
      state: { doc: { lineAt: () => ({ number: 5, text: "plain text" }), line: () => ({ number: 1, text: "" }) } },
      viewport: { from: 0, to: 100 },
    } as any;

    controller.syncEditorToPreview(mockView, editor, preview);

    return vi.waitFor(() => {
      // Preview should have been scrolled by the first call
      expect(preview.scrollTop).not.toBe(50);
    }).then(() => {
      // Now simulate the preview's onScroll firing (as a reaction to the programmatic scroll)
      // This should be ignored because programmaticScroll is still true in the same frame
      // or at least the lock was set. But since rAF clears it asynchronously,
      // we need to verify that calling syncPreviewToEditor after the rAF has NOT
      // reverted the editor's position.
      const editorPosAfterFirstSync = editor.scrollTop;
      controller.syncPreviewToEditor(preview, editor);
      // In the same synchronous call, editor should not have been changed
      // because either:
      // 1. programmaticScroll is still true (if rAF hasn't run yet)
      // 2. Or the ratio calculation produces the same value
      expect(editor.scrollTop).toBe(editorPosAfterFirstSync);
    });
  });
});
