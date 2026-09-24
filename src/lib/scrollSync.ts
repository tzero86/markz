import type { EditorView } from "@codemirror/view";

/** How far back the editor→preview sync looks for the heading that owns the
 *  viewport. The walk is bounded because its cost grows with the distance to
 *  the previous heading; beyond this it falls back to ratio sync, which is what
 *  it did anyway once the walk reached the top of a heading-free document. */
const MAX_HEADING_SCAN = 800;

export class ScrollSyncController {
  /** Which pane initiated the last sync.
   *  Prevents the other pane's scroll handler from syncing back
   *  for a short grace period, eliminating feedback loops caused
   *  by coalesced or deferred scroll events. */
  private activeSource: "editor" | "preview" | null = null;
  private clearTimer: number | undefined;

  /** Scroll metrics per scroller, refreshed by a ResizeObserver instead of
   *  being read inside the scroll handler. A read there forces a layout of the
   *  whole pane whenever something else dirtied it (post-processing passes,
   *  image loads), which is what makes scrolling a large document heavy. */
  private metrics = new WeakMap<
    HTMLElement,
    { scrollHeight: number; clientHeight: number }
  >();
  private observers = new WeakMap<HTMLElement, ResizeObserver>();
  private watched = new Set<HTMLElement>();

  /** Heading offsets, measured once per preview layout. */
  private anchors = new WeakMap<
    HTMLElement,
    Map<string, { element: HTMLElement; top: number }>
  >();
  private anchorsStale = new WeakSet<HTMLElement>();

  /** Coalesces scroll-driven syncs to at most one per animation frame: a
   *  trackpad or wheel burst fires many scroll events per frame, and each one
   *  would otherwise read layout and re-scroll the other pane. */
  private pendingSync: (() => void) | null = null;
  private syncFrame: number | null = null;

  private lock(source: "editor" | "preview") {
    this.activeSource = source;
    clearTimeout(this.clearTimer);
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
      const targetTop = this.headingTop(previewScroller, headingId);
      if (targetTop !== null) {
        const target = targetTop - 20;
        if (Math.abs(previewScroller.scrollTop - target) > 5) {
          this.lock("editor");
          previewScroller.scrollTop = target;
        }
        // Fall through to ratio sync so the preview keeps tracking the
        // editor even when the heading anchor is already close.
      }
    }

    // No heading found (or element not in preview) — fall back to ratio sync
    this.syncByRatio(editorScroller, previewScroller, "editor");
  }

  /** Scroll editor to match preview position (ratio-based). */
  syncPreviewToEditor(
    previewScroller: HTMLElement,
    editorScroller: HTMLElement
  ) {
    if (this.activeSource === "editor") return;
    this.syncByRatio(previewScroller, editorScroller, "preview");
  }

  /** Coalesced variant of {@link syncEditorToPreview} for scroll handlers. */
  requestEditorToPreview(
    editorView: EditorView,
    editorScroller: HTMLElement,
    previewScroller: HTMLElement
  ) {
    this.schedule(() =>
      this.syncEditorToPreview(editorView, editorScroller, previewScroller)
    );
  }

  /** Coalesced variant of {@link syncPreviewToEditor} for scroll handlers. */
  requestPreviewToEditor(
    previewScroller: HTMLElement,
    editorScroller: HTMLElement
  ) {
    this.schedule(() => this.syncPreviewToEditor(previewScroller, editorScroller));
  }

  private schedule(run: () => void) {
    this.pendingSync = run;
    if (this.syncFrame !== null) return;
    this.syncFrame = requestAnimationFrame(() => {
      this.syncFrame = null;
      const pending = this.pendingSync;
      this.pendingSync = null;
      pending?.();
    });
  }

  private syncByRatio(
    source: HTMLElement,
    target: HTMLElement,
    sourceName: "editor" | "preview"
  ) {
    const sourceMetrics = this.metricsOf(source);
    const targetMetrics = this.metricsOf(target);
    const sourceMax = sourceMetrics.scrollHeight - sourceMetrics.clientHeight;
    const targetMax = targetMetrics.scrollHeight - targetMetrics.clientHeight;

    if (sourceMax <= 0 || targetMax <= 0) return;

    const ratio = source.scrollTop / sourceMax;
    const newScrollTop = ratio * targetMax;

    if (Math.abs(target.scrollTop - newScrollTop) > 1) {
      this.lock(sourceName);
      target.scrollTop = newScrollTop;
    }
  }

  /** Metrics come from the ResizeObserver cache when there is one; the direct
   *  read is the fallback for environments without it (jsdom tests). */
  private metricsOf(element: HTMLElement) {
    this.watch(element);
    let metrics = this.metrics.get(element);
    if (!metrics) {
      metrics = {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
      this.metrics.set(element, metrics);
    }
    return metrics;
  }

  private watch(element: HTMLElement) {
    if (this.observers.has(element) || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const metrics = this.metrics.get(target);
        if (metrics) {
          metrics.scrollHeight = target.scrollHeight;
          metrics.clientHeight = target.clientHeight;
        }
        // Heading offsets move with the content; re-measure on next use.
        for (const scroller of this.watched) this.anchorsStale.add(scroller);
      }
    });
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);
    this.observers.set(element, observer);
    this.watched.add(element);
  }

  /** Offset of a heading inside the preview, measured once per layout. */
  private headingTop(scroller: HTMLElement, slug: string): number | null {
    if (this.anchorsStale.has(scroller)) {
      this.anchors.delete(scroller);
      this.anchorsStale.delete(scroller);
    }
    let cached = this.anchors.get(scroller);
    if (!cached) {
      cached = new Map();
      this.anchors.set(scroller, cached);
    }
    const hit = cached.get(slug);
    if (hit && hit.element.isConnected) return hit.top;

    const element = scroller.querySelector(
      `#${CSS.escape(slug)}`
    ) as HTMLElement | null;
    if (!element) return null;
    const top = element.offsetTop;
    cached.set(slug, { element, top });
    return top;
  }

  private findNearestHeading(editorView: EditorView): string | null {
    const doc = editorView.state.doc;
    const vp = editorView.viewport;
    if (!vp) return null;

    let lineStart = doc.lineAt(vp.from);
    let scanned = 0;
    while (lineStart.number > 1 && scanned < MAX_HEADING_SCAN) {
      const text = lineStart.text.trimStart();
      if (text.startsWith("#")) {
        return slugify(text.replace(/^#+\s*/, ""));
      }
      lineStart = doc.line(lineStart.number - 1);
      scanned++;
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
