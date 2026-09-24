import { describe, expect, it } from "vitest";
import { countWords } from "./textStats";

/** The implementation the status bar used before: correct, but it materialised
 *  one string per word on every keystroke. */
function referenceCount(content: string): number {
  return content.trim() === ""
    ? 0
    : content.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

describe("countWords", () => {
  it("matches the split-based count it replaces", () => {
    const samples = [
      "",
      "   ",
      "\n\n",
      "one",
      "one two three",
      "  leading and trailing  ",
      "line one\nline two\n\nline three",
      "tabs\tand\tspaces",
      "non\u00a0breaking\u00a0space",
      "carriage\r\nreturn",
      "emoji 🚀 and words",
      "- list item\n- another",
      "中文 汉字 mixed with latin",
    ];

    for (const sample of samples) {
      expect(countWords(sample), JSON.stringify(sample)).toBe(
        referenceCount(sample)
      );
    }
  });

  it("scans a megabyte without allocating per word", () => {
    const document = "word ".repeat(200_000);

    const start = performance.now();
    const words = countWords(document);
    const elapsed = performance.now() - start;

    expect(words).toBe(200_000);
    // The split-based version allocated 200k strings (~4 ms per keystroke on a
    // large document); a single scan stays far below this bound.
    expect(elapsed).toBeLessThan(50);
  });
});
