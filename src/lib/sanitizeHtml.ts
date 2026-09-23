import DOMPurify from "dompurify";

/** Shared HTML sanitization policy for renderer output.
 *
 *  The markdown renderer emits untrusted HTML verbatim (raw HTML blocks pass
 *  through unchanged), so every string that reaches an `{@html}` sink must go
 *  through this function first. It is the app's single sanitization boundary:
 *  used by the preview pane and by the presentation deck boundary, so both
 *  paths share one DOMPurify configuration. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
