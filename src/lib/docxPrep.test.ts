import { describe, it, expect } from "vitest";
import { extractDocxPlaceholders } from "./docxPrep";

describe("extractDocxPlaceholders", () => {
  it("returns unchanged markdown when no special content exists", () => {
    const md = "# Hello\n\nThis is plain text.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.modified).toBe(md);
    expect(result.mermaidItems).toHaveLength(0);
    expect(result.blockMathItems).toHaveLength(0);
    expect(result.inlineMathItems).toHaveLength(0);
    expect(result.codeBlockItems).toHaveLength(0);
    expect(result.inlineCodeItems).toHaveLength(0);
  });

  it("extracts mermaid blocks", () => {
    const md = "# Diagram\n\n```mermaid\ngraph TD\n  A --> B\n```\n\nDone.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.mermaidItems).toHaveLength(1);
    expect(result.mermaidItems[0].original).toBe("graph TD\n  A --> B");
    expect(result.modified).toContain("%%MERMAID_0%%");
    expect(result.modified).not.toContain("```mermaid");
  });

  it("extracts fenced code blocks", () => {
    const md = "```rust\nfn main() {}\n```\n";
    const result = extractDocxPlaceholders(md);
    expect(result.codeBlockItems).toHaveLength(1);
    expect(result.codeBlockItems[0].original).toBe("```rust\nfn main() {}\n```");
    expect(result.modified).toContain("%%CODE_BLOCK_0%%");
  });

  it("extracts inline code spans", () => {
    const md = "Use `print()` to output text.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineCodeItems).toHaveLength(1);
    expect(result.inlineCodeItems[0].original).toBe("`print()`");
    expect(result.modified).toContain("%%INLINE_CODE_0%%");
  });

  it("extracts block math", () => {
    const md = "$$\nx^2 + y^2 = z^2\n$$\n";
    const result = extractDocxPlaceholders(md);
    expect(result.blockMathItems).toHaveLength(1);
    expect(result.blockMathItems[0].original).toBe("x^2 + y^2 = z^2");
    expect(result.modified).toContain("%%MATH_BLOCK_0%%");
  });

  it("extracts inline math", () => {
    const md = "The value is $x = 5$ here.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineMathItems).toHaveLength(1);
    expect(result.inlineMathItems[0].original).toBe("x = 5");
    expect(result.modified).toContain("%%MATH_INLINE_0%%");
  });

  it("does not extract single-character inline math", () => {
    const md = "The variable $x$ is used.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineMathItems).toHaveLength(1);
    expect(result.inlineMathItems[0].original).toBe("x");
  });

  it("protects code blocks from math extraction", () => {
    const md = '```\n$var = "hello"\n```\n';
    const result = extractDocxPlaceholders(md);
    expect(result.codeBlockItems).toHaveLength(1);
    expect(result.inlineMathItems).toHaveLength(0);
    expect(result.modified).toContain("%%CODE_BLOCK_0%%");
    expect(result.modified).not.toContain("%%MATH_INLINE");
  });

  it("protects inline code from math extraction", () => {
    const md = "The cost is `$price * $qty`.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineCodeItems).toHaveLength(1);
    expect(result.inlineMathItems).toHaveLength(0);
  });

  it("protects mermaid blocks from math extraction", () => {
    const md = "```mermaid\ngraph TD\n  A[$price] --> B\n```\n";
    const result = extractDocxPlaceholders(md);
    expect(result.mermaidItems).toHaveLength(1);
    expect(result.codeBlockItems).toHaveLength(0);
    expect(result.inlineMathItems).toHaveLength(0);
  });

  it("handles multiple inline math expressions", () => {
    const md = "$a$ and $b$ and $c$\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineMathItems).toHaveLength(3);
    expect(result.inlineMathItems[0].original).toBe("a");
    expect(result.inlineMathItems[1].original).toBe("b");
    expect(result.inlineMathItems[2].original).toBe("c");
  });

  it("ignores bare $ signs in text", () => {
    const md = "The price is $50 USD.\n";
    const result = extractDocxPlaceholders(md);
    expect(result.inlineMathItems).toHaveLength(0);
  });

  it("ignores empty math delimiters", () => {
    const md = "Not math: $$ or $ $\n";
    const result = extractDocxPlaceholders(md);
    expect(result.blockMathItems).toHaveLength(0);
    expect(result.inlineMathItems).toHaveLength(0);
  });

  it("handles mixed content", () => {
    const md = `# Mixed

$$E = mc^2$$

Some text with \`inline code\` and $x$.

\`\`\`python
def hello():
    return "world"
\`\`\`
`;
    const result = extractDocxPlaceholders(md);
    expect(result.blockMathItems).toHaveLength(1);
    expect(result.inlineCodeItems).toHaveLength(1);
    expect(result.inlineMathItems).toHaveLength(1);
    expect(result.codeBlockItems).toHaveLength(1);
  });
});
