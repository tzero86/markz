import type { EditorView } from "@codemirror/view";

export class ScrollSyncController {
  /** True while we are programmatically scrolling one pane.
   *  Prevents the other pane's scroll event handler from syncing back. */
  private programmaticScroll = false;

  /** Scroll preview to match editor position.
   *  Uses heading anchor when possible, ratio-based fallback otherwise. */
  syncEditorToPreview(
    editorView: EditorView,
    editorScroller: HTMLElement,
    previewScroller: HTMLElement
  ) {
    if (this.programmaticScroll) return;

    const headingId = this.findNearestHeading(editorView);
    if (headingId) {
      const el = previewScroller.querySelector(
        `#${CSS.escape(headingId)}`
      ) as HTMLElement | null;
      if (el) {
        const targetTop = el.offsetTop - 20;
        if (Math.abs(previewScroller.scrollTop - targetTop) > 5) {
          this.programmaticScroll = true;
          previewScroller.scrollTop = targetTop;
          requestAnimationFrame(() => {
            this.programmaticScroll = false;
          });
          return;
        }
      }
    }

    // No heading found (or already aligned) — fall back to ratio sync
    this.syncByRatio(editorScroller, previewScroller);
  }

  /** Scroll editor to match preview position (ratio-based). */
  syncPreviewToEditor(previewScroller: HTMLElement, editorScroller: HTMLElement) {
    if (this.programmaticScroll) return;
    this.syncByRatio(previewScroller, editorScroller);
  }

  private syncByRatio(source: HTMLElement, target: HTMLElement) {
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;

    if (sourceMax <= 0 || targetMax <= 0) return;

    const ratio = source.scrollTop / sourceMax;
    const newScrollTop = ratio * targetMax;

    if (Math.abs(target.scrollTop - newScrollTop) > 1) {
      this.programmaticScroll = true;
      target.scrollTop = newScrollTop;
      requestAnimationFrame(() => {
        this.programmaticScroll = false;
      });
    }
  }

  private findNearestHeading(editorView: EditorView): string | null {
    const doc = editorView.state.doc;
    const vp = editorView.viewport;
    if (!vp) return null;

    let lineStart = doc.lineAt(vp.from);
    while (lineStart.number > 1) {
      const text = lineStart.text.trimStart();
      if (text.startsWith("#")) {
        return slugify(text.replace(/^#+\s*/, ""));
      }
      lineStart = doc.line(lineStart.number - 1);
    }
    return null;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export const scrollSync = new ScrollSyncController();
