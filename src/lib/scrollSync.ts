import type { EditorView } from "@codemirror/view";

export class ScrollSyncController {
  /** Which pane initiated the last sync.
   *  Prevents the other pane's scroll handler from syncing back
   *  for a short grace period, eliminating feedback loops caused
   *  by coalesced or deferred scroll events. */
  private activeSource: "editor" | "preview" | null = null;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  private lock(source: "editor" | "preview") {
    this.activeSource = source;
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      this.activeSource = null;
    }, 150);
  }

  /** Scroll preview to match editor position.
   *  Uses heading anchor when possible, ratio-based fallback otherwise. */
  syncEditorToPreview(
    editorView: EditorView,
    editorScroller: HTMLElement,
    previewScroller: HTMLElement
  ) {
    if (this.activeSource === "preview") return;

    const headingId = this.findNearestHeading(editorView);
    if (headingId) {
      const el = previewScroller.querySelector(
        `#${CSS.escape(headingId)}`
      ) as HTMLElement | null;
      if (el) {
        const targetTop = el.offsetTop - 20;
        if (Math.abs(previewScroller.scrollTop - targetTop) > 5) {
          this.lock("editor");
          previewScroller.scrollTop = targetTop;
        }
        return; // heading handled (or close enough) — never mix with ratio
      }
    }

    // No heading found (or element not in preview) — fall back to ratio sync
    this.syncByRatio(editorScroller, previewScroller, "editor");
  }

  /** Scroll editor to match preview position (ratio-based). */
  syncPreviewToEditor(previewScroller: HTMLElement, editorScroller: HTMLElement) {
    if (this.activeSource === "editor") return;
    this.syncByRatio(previewScroller, editorScroller, "preview");
  }

  private syncByRatio(
    source: HTMLElement,
    target: HTMLElement,
    sourceName: "editor" | "preview"
  ) {
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;

    if (sourceMax <= 0 || targetMax <= 0) return;

    const ratio = source.scrollTop / sourceMax;
    const newScrollTop = ratio * targetMax;

    if (Math.abs(target.scrollTop - newScrollTop) > 1) {
      this.lock(sourceName);
      target.scrollTop = newScrollTop;
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
