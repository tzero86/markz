import { describe, it, expect } from "vitest";
import { getSnippets, findSnippet, parseSnippetBody } from "./snippetStore";

describe("snippetStore", () => {
  it("getSnippets does not throw", () => {
    expect(() => getSnippets()).not.toThrow();
  });

  it("replaces TODAY placeholder with actual date", () => {
    const snippets = getSnippets();
    const frontmatter = snippets.find((s) => s.trigger === "frontmatter");
    expect(frontmatter).toBeDefined();
    const today = new Date().toISOString().split("T")[0];
    expect(frontmatter!.body).toContain(today);
    expect(frontmatter!.body).not.toContain("${TODAY}");
    expect(frontmatter!.body).not.toContain("TODAY");
  });

  it("finds existing snippets", () => {
    expect(findSnippet("rfc")).toBeDefined();
    expect(findSnippet("adr")).toBeDefined();
    expect(findSnippet("todo")).toBeDefined();
    expect(findSnippet("nonexistent")).toBeUndefined();
  });

  it("parseSnippetBody handles simple tab stops", () => {
    const { text, tabStops } = parseSnippetBody("Hello $1 world $2");
    expect(text).toBe("Hello  world ");
    expect(tabStops).toHaveLength(2);
    expect(tabStops[0].from).toBe(6);
    expect(tabStops[1].from).toBe(13);
  });

  it("parseSnippetBody handles placeholders", () => {
    const { text, tabStops } = parseSnippetBody("${1:Title} by ${2:Author}");
    expect(text).toBe("Title by Author");
    expect(tabStops).toHaveLength(2);
    expect(tabStops[0].placeholder).toBe("Title");
    expect(tabStops[1].placeholder).toBe("Author");
  });
});
