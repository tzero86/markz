/** Shared cache for rendered preview HTML.
 *
 *  PreviewPane may be unmounted/remounted when the user switches view modes.
 *  Without a module-level cache, the component would lose its local cache on
 *  every remount and re-run the (potentially expensive) `render_preview` invoke
 *  even though the active document has not changed. This cache survives across
 *  component lifecycles so view-mode switches are instant.
 *
 *  Entries are keyed by document path and validated against the exact content
 *  string they were rendered from. The tab store holds one string instance per
 *  document, so the hit path is a reference comparison: the previous key was
 *  `path + ":" + content`, which copied and hashed the whole document on every
 *  keystroke. */

interface CacheEntry {
  content: string;
  html: string;
}

const renderCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 10;

function evictOldest() {
  while (renderCache.size > MAX_CACHE_SIZE) {
    const oldestKey = renderCache.keys().next().value;
    if (oldestKey) renderCache.delete(oldestKey);
  }
}

export function getCachedPreview(
  key: string,
  content: string
): string | undefined {
  const entry = renderCache.get(key);
  return entry && entry.content === content ? entry.html : undefined;
}

export function setCachedPreview(
  key: string,
  content: string,
  html: string
): void {
  // Delete first so the key is bumped to the most-recent position in an LRU Map.
  renderCache.delete(key);
  renderCache.set(key, { content, html });
  evictOldest();
}
