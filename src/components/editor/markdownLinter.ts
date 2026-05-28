import { linter, type Diagnostic } from "@codemirror/lint";
import { type EditorView } from "@codemirror/view";

export const markdownLinter = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;
  const text = doc.toString();
  const lines = text.split("\n");

  const headings: { line: number; level: number; text: string }[] = [];
  let inCodeBlock = false;
  let codeBlockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = doc.line(i + 1).from;

    // Code block boundary
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i;
        // Check for missing language specifier
        const lang = line.trim().slice(3).trim();
        if (!lang) {
          diagnostics.push({
            from: lineStart,
            to: lineStart + line.length,
            severity: "info",
            message: "Consider adding a language specifier to the code block (e.g. ```rust).",
          });
        }
      } else {
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) continue;

    // Trailing whitespace
    const trailingMatch = line.match(/\s+$/);
    if (trailingMatch) {
      diagnostics.push({
        from: lineStart + line.length - trailingMatch[0].length,
        to: lineStart + line.length,
        severity: "warning",
        message: "Trailing whitespace.",
      });
    }

    // Heading checks
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      headings.push({ line: i, level, text: headingText });
    }

    // Empty link
    const emptyLinkRe = /\[([^\]]*)\]\(\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = emptyLinkRe.exec(line)) !== null) {
      diagnostics.push({
        from: lineStart + m.index,
        to: lineStart + m.index + m[0].length,
        severity: "error",
        message: "Empty link URL.",
      });
    }

    // Image without alt text
    const noAltRe = /!\[\s*\]\([^)]+\)/g;
    while ((m = noAltRe.exec(line)) !== null) {
      diagnostics.push({
        from: lineStart + m.index,
        to: lineStart + m.index + m[0].length,
        severity: "warning",
        message: "Image missing alt text.",
      });
    }
  }

  // Check for unclosed code block
  if (inCodeBlock) {
    const lineStart = doc.line(codeBlockStart + 1).from;
    diagnostics.push({
      from: lineStart,
      to: lineStart + lines[codeBlockStart].length,
      severity: "error",
      message: "Unclosed code block.",
    });
  }

  // Heading level consistency
  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      const lineStart = doc.line(h.line + 1).from;
      diagnostics.push({
        from: lineStart,
        to: lineStart + lines[h.line].length,
        severity: "warning",
        message: `Heading level jumps from H${prevLevel} to H${h.level}. Consider using H${prevLevel + 1} instead.`,
      });
    }
    prevLevel = h.level;
  }

  // Duplicate headings
  const seenHeadings = new Map<string, number>();
  for (const h of headings) {
    const key = h.text.toLowerCase();
    if (seenHeadings.has(key)) {
      const lineStart = doc.line(h.line + 1).from;
      diagnostics.push({
        from: lineStart,
        to: lineStart + lines[h.line].length,
        severity: "info",
        message: `Duplicate heading "${h.text}" (also on line ${seenHeadings.get(key)! + 1}).`,
      });
    } else {
      seenHeadings.set(key, h.line);
    }
  }

  return diagnostics;
});

// Enable browser native spellcheck on the editor content
export const spellcheckFacet = EditorView.contentAttributes.of({
  spellcheck: "true",
});
