/** Shared cache for rendered preview HTML.
 *
 *  PreviewPane may be unmounted/remounted when the user switches view modes.
 *  Without a module-level cache, the component would lose its local cache on
 *  every remount and re-run the (potentially expensive) `render_preview` invoke
 *  even though the active document has not changed. This cache survives across
 *  component lifecycles so view-mode switches are instant. */
const renderCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10;

function evictOldest() {
  while (renderCache.size > MAX_CACHE_SIZE) {
    const oldestKey = renderCache.keys().next().value;
    if (oldestKey) renderCache.delete(oldestKey);
  }
}

export function getCachedPreview(key: string): string | undefined {
  return renderCache.get(key);
}

export function setCachedPreview(key: string, html: string): void {
  // Delete first so the key is bumped to the most-recent position in an LRU Map.
  renderCache.delete(key);
  renderCache.set(key, html);
  evictOldest();
}
