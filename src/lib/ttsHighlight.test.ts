import { describe, expect, it } from "vitest";
import {
  chunkRanges,
  clearReading,
  collectSegments,
  domRange,
  highlightReading,
  setActiveBlock,
  wordRangeAt,
} from "./ttsHighlight";

function container(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

describe("collectSegments", () => {
  it("splits blocks, collapses whitespace, and keeps inline markup whole", () => {
    const div = container("<p>Hello   <strong>brave</strong>\nworld</p><h2>Title</h2>");

    const segments = collectSegments(div);

    expect(segments.map((s) => s.text)).toEqual(["Hello brave world", "Title"]);
    expect(segments[0].element.tagName).toBe("P");
    expect(segments[1].element.tagName).toBe("H2");
  });

  it("keeps nested list items as separate segments in document order", () => {
    const div = container(
      "<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>"
    );

    expect(collectSegments(div).map((s) => s.text)).toEqual([
      "One",
      "Two",
      "Nested",
    ]);
  });

  it("reads the innermost block inside a quote", () => {
    const div = container("<blockquote><p>Quoted text</p></blockquote>");

    const segments = collectSegments(div);

    expect(segments.map((s) => s.text)).toEqual(["Quoted text"]);
    expect(segments[0].element.tagName).toBe("P");
  });

  it("skips code blocks, diagrams, images and tables", () => {
    const div = container(
      '<p>Read me</p><pre><code>skip me</code></pre>' +
        '<div class="mermaid-diagram">graph</div>' +
        "<table><tr><td>skip me too</td></tr></table>"
    );

    expect(collectSegments(div).map((s) => s.text)).toEqual(["Read me"]);
  });

  it("skips document metadata", () => {
    const div = container(
      '<div class="frontmatter"><div class="frontmatter-row">' +
        '<span class="frontmatter-key">title</span>' +
        '<span class="frontmatter-value">Draft</span></div></div>' +
        "<p>Body text</p>"
    );

    expect(collectSegments(div).map((s) => s.text)).toEqual(["Body text"]);
  });

  it("drops whitespace-only blocks", () => {
    const div = container("<p>   </p><p>Text</p>");

    expect(collectSegments(div).map((s) => s.text)).toEqual(["Text"]);
  });
});

describe("chunkRanges", () => {
  it("splits sentences and returns offsets into the segment text", () => {
    const text = "First sentence. Second one!";

    expect(chunkRanges(text)).toEqual([
      { start: 0, end: 15 },
      { start: 16, end: 27 },
    ]);
  });

  it("splits a long sentence at word boundaries", () => {
    const text = "one two three four five six seven";

    const chunks = chunkRanges(text, 12).map((range) =>
      text.slice(range.start, range.end)
    );

    expect(chunks).toEqual(["one two", "three four", "five six", "seven"]);
  });

  it("ignores blank text", () => {
    expect(chunkRanges("   ")).toEqual([]);
  });
});

describe("wordRangeAt", () => {
  const text = "alpha beta gamma";
  const chunk = { start: 0, end: 16 };

  it("tracks the first and last word at the ends of a clip", () => {
    expect(wordRangeAt(text, chunk, 0)).toEqual({ start: 0, end: 5 });
    expect(wordRangeAt(text, chunk, 1)).toEqual({ start: 11, end: 16 });
  });

  it("snaps a position inside a word to that word", () => {
    const word = wordRangeAt(text, chunk, 0.4);

    expect(word).not.toBeNull();
    expect(text.slice(word!.start, word!.end)).toBe("beta");
  });

  it("snaps a position on whitespace to the following word", () => {
    const word = wordRangeAt(text, chunk, 5 / 16);

    expect(word).not.toBeNull();
    expect(text.slice(word!.start, word!.end)).toBe("beta");
  });
});

describe("domRange", () => {
  it("maps an offset range inside a single text node", () => {
    const div = container("<p>Hello brave world</p>");
    const [segment] = collectSegments(div);

    const range = domRange(segment, { start: 6, end: 11 });

    expect(range?.toString()).toBe("brave");
  });

  it("maps a range that spans inline nodes", () => {
    const div = container("<p>one <em>two</em> three</p>");
    const [segment] = collectSegments(div);

    expect(segment.text).toBe("one two three");
    const range = domRange(segment, { start: 4, end: 13 });

    expect(range?.toString()).toBe("two three");
  });

  it("returns null for offsets outside the segment", () => {
    const div = container("<p>Hello</p>");
    const [segment] = collectSegments(div);

    expect(domRange(segment, { start: 40, end: 50 })).toBeNull();
  });
});

describe("active block tint", () => {
  it("is applied while reading and removed by clearReading", () => {
    const div = container("<p>Hello brave world</p>");
    const [segment] = collectSegments(div);

    setActiveBlock(segment.element);
    highlightReading(segment, { start: 0, end: 5 }, "sentence");
    expect(segment.element.classList.contains("tts-reading")).toBe(true);

    clearReading();
    expect(segment.element.classList.contains("tts-reading")).toBe(false);
  });
});
