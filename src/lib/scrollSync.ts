import type { EditorView } from "@codemirror/view";

export class ScrollSyncController {
  private editorLock = false;
  private previewLock = false;
  private rafId: number | null = null;

  /** Ratio-based sync from source element to target element.
   *  Used for preview→editor sync. */
  sync(source: HTMLElement, target: HTMLElement) {
    if (this.previewLock) return;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      const sourceMax = source.scrollHeight - source.clientHeight;
      const targetMax = target.scrollHeight - target.clientHeight;

      if (sourceMax > 0 && targetMax > 0) {
        const ratio = source.scrollTop / sourceMax;
        const newScrollTop = ratio * targetMax;
        if (Math.abs(target.scrollTop - newScrollTop) > 1) {
          target.scrollTop = newScrollTop;
        }
      }

      this.rafId = null;
      this.previewLock = true;
      requestAnimationFrame(() => {
        this.previewLock = false;
      });
    });
  }

  /** Scroll the preview to match the editor's current heading position.
   *  Falls back to ratio-based sync when no heading is found. */
  syncEditorToPreview(editorView: EditorView, editorScroller: HTMLElement, previewScroller: HTMLElement) {
    if (this.editorLock) return;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      const headingId = this.findNearestHeading(editorView);
      if (headingId) {
        const el = previewScroller.querySelector(`#${CSS.escape(headingId)}`) as HTMLElement | null;
        if (el) {
          const targetTop = el.offsetTop - 20; // small padding
          if (Math.abs(previewScroller.scrollTop - targetTop) > 5) {
            previewScroller.scrollTop = targetTop;
          }
        }
      } else {
        // Fallback: ratio-based sync when no heading found
        const sourceMax = editorScroller.scrollHeight - editorScroller.clientHeight;
        const targetMax = previewScroller.scrollHeight - previewScroller.clientHeight;
        if (sourceMax > 0 && targetMax > 0) {
          const ratio = editorScroller.scrollTop / sourceMax;
          const newScrollTop = ratio * targetMax;
          if (Math.abs(previewScroller.scrollTop - newScrollTop) > 1) {
            previewScroller.scrollTop = newScrollTop;
          }
        }
      }

      this.rafId = null;
      this.editorLock = true;
      requestAnimationFrame(() => {
        this.editorLock = false;
      });
    });
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
