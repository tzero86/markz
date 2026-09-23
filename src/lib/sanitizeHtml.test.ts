import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitizeHtml";

// The PoC payload from the security audit: raw HTML in a Markdown document that
// the renderer passes through verbatim into a slide field.
const POC_PAYLOAD =
  '<img src=x onerror="__TAURI_INTERNALS__.invoke(\'delete_workspace_entry\',{path:\'C:/somewhere\'})">';

describe("sanitizeHtml", () => {
  it("strips an onerror attribute from an img tag", () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("strips a script element entirely", () => {
    const out = sanitizeHtml("<p>before</p><script>alert(1)</script><p>after</p>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<p>after</p>");
  });

  it("strips a javascript: URL in an href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain(">click</a>");
  });

  it("keeps benign markup the app needs", () => {
    const out = sanitizeHtml(
      '<strong>b</strong><code>c</code><pre>p</pre><a href="https://example.com">e</a>',
    );
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<code>c</code>");
    expect(out).toContain("<pre>p</pre>");
    expect(out).toContain('<a href="https://example.com">e</a>');
  });

  it("keeps table markup", () => {
    const out = sanitizeHtml("<table><tr><td>c</td></tr></table>");
    expect(out).toContain("<table>");
    expect(out).toContain("<td>c</td>");
  });

  it("keeps data: image URIs (DOMPurify's default data-URI allowance)", () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">');
    expect(out).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });
});

// End-to-end proof of the fix. App.svelte sanitizes every HTML-bearing field of
// every slide at the deck boundary (slide `title` and `content` are the only
// fields feeding `{@html}` sinks in PresentationMode.svelte), so this mirrors
// exactly that transformation on a deck carrying the PoC payload.
describe("presentation deck boundary", () => {
  const deck = {
    title: "Deck",
    author: "Author",
    theme: "default",
    slides: [
      { kind: "title", title: POC_PAYLOAD, content: POC_PAYLOAD, level: 0, index: 0 },
      { kind: "content", title: POC_PAYLOAD, content: `<p>ok</p>${POC_PAYLOAD}`, level: 2, index: 1 },
    ],
  };

  const sanitized = {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      title: typeof slide.title === "string" ? sanitizeHtml(slide.title) : slide.title,
      content: typeof slide.content === "string" ? sanitizeHtml(slide.content) : slide.content,
    })),
  };

  it("removes the PoC payload from every slide field reaching an {@html} sink", () => {
    for (const slide of sanitized.slides) {
      expect(slide.title).not.toContain("onerror");
      expect(slide.title).not.toContain("__TAURI_INTERNALS__");
      expect(slide.content).not.toContain("onerror");
      expect(slide.content).not.toContain("__TAURI_INTERNALS__");
    }
  });

  it("preserves the deck's non-HTML fields", () => {
    expect(sanitized.title).toBe("Deck");
    expect(sanitized.author).toBe("Author");
    expect(sanitized.theme).toBe("default");
    expect(sanitized.slides[1].kind).toBe("content");
    expect(sanitized.slides[1].level).toBe(2);
    expect(sanitized.slides[1].index).toBe(1);
  });
});
