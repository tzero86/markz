/** Recognised Markdown file extensions (case-insensitive). */
const MARKDOWN_EXTS = new Set(["md", "markdown", "mdx", "mdown"]);

/** Return true if `path` ends with a recognised Markdown extension. */
export function isMarkdownPath(path: string): boolean {
  const filename = path.split(/[\\/]/).pop() ?? "";
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = filename.slice(dot + 1).toLowerCase();
  return MARKDOWN_EXTS.has(ext);
}
