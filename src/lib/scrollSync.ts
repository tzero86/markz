import type { EditorView } from "@codemirror/view";

export class ScrollSyncController {
  private lock = false;
  private rafId: number | null = null;

  sync(source: HTMLElement, target: HTMLElement) {
    if (this.lock) return;
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
      this.lock = true;
      requestAnimationFrame(() => {
        this.lock = false;
      });
    });
  }

  /// Find the nearest heading above the given scroll position in the editor,
  /// then scroll the preview to the matching heading element.
  syncByHeading(editorView: EditorView, previewScroller: HTMLElement) {
    if (this.lock) return;
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
      }

      this.rafId = null;
      this.lock = true;
      requestAnimationFrame(() => {
        this.lock = false;
      });
    });
  }

  private findNearestHeading(editorView: EditorView): string | null {
    const doc = editorView.state.doc;
    // Get the first visible line
    const vp = editorView.viewport;
    if (!vp) return null;

    let lineStart = doc.lineAt(vp.from);
    // Scan upward to find the nearest heading
    while (lineStart.number > 1) {
      const text = lineStart.text.trimStart();
      if (text.startsWith("#")) {
        return slugify(text.replace(/^#+\s*/, ""));
      }
      // Move to previous line
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
