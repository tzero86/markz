import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScrollSyncController } from "./scrollSync";

describe("ScrollSyncController", () => {
  let controller: ScrollSyncController;

  beforeEach(() => {
    controller = new ScrollSyncController();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
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

    expect(editor.scrollTop).toBe(150); // 50% of 300
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

    expect(previewScroller.scrollTop).toBe(150);
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

    // Preview should have been scrolled by the first call
    expect(preview.scrollTop).not.toBe(50);

    // Now simulate the preview's onScroll firing (as a reaction to the programmatic scroll)
    // This should be ignored because the editor source lock is active
    const editorPosAfterFirstSync = editor.scrollTop;
    controller.syncPreviewToEditor(preview, editor);
    expect(editor.scrollTop).toBe(editorPosAfterFirstSync);
  });

  it("allows reverse sync after the lock expires", () => {
    const preview = document.createElement("div");
    const editor = document.createElement("div");

    Object.defineProperty(preview, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(preview, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(editor, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(editor, "clientHeight", { value: 100, configurable: true });

    preview.scrollTop = 50;
    editor.scrollTop = 25;

    const mockView = {
      state: { doc: { lineAt: () => ({ number: 5, text: "plain text" }), line: () => ({ number: 1, text: "" }) } },
      viewport: { from: 0, to: 100 },
    } as any;

    // Editor-initiated sync locks out preview
    controller.syncEditorToPreview(mockView, editor, preview);
    const editorPosAfterFirstSync = editor.scrollTop;
    controller.syncPreviewToEditor(preview, editor);
    expect(editor.scrollTop).toBe(editorPosAfterFirstSync);

    // Simulate the user scrolling the preview while the editor lock is active
    preview.scrollTop = 150;

    // After the 50 ms grace period, reverse sync works again
    vi.advanceTimersByTime(60);
    controller.syncPreviewToEditor(preview, editor);
    // preview.scrollTop=150 / sourceMax=300 = 0.5 → targetMax=100 * 0.5 = 50
    expect(editor.scrollTop).toBe(50);
  });
});
