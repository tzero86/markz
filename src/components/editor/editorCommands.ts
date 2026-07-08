import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

/** Wrap the current selection with before/after strings.
 *  If selection is empty, places the cursor inside.
 */
export function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholder = "text"
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  const inner = selected || placeholder;
  const insert = before + inner + after;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(
      from + before.length + (selected ? selected.length : 0)
    ),
  });
  view.focus();
}

/** Map a document position through a set of non-overlapping sorted changes. */
function mapPosition(
  pos: number,
  changes: { from: number; to: number; insert: string }[]
): number {
  let offset = 0;
  for (const ch of changes) {
    if (pos <= ch.from) {
      return pos + offset;
    } else if (pos >= ch.to) {
      offset += ch.insert.length - (ch.to - ch.from);
    } else {
      return ch.from + offset;
    }
  }
  return pos + offset;
}

/** Toggle a line prefix (e.g. "> ", "- ", "1. ") on each line in the selection.
 *  If all lines already have it, remove it.
 *  Cursor positions are adjusted so the user can keep typing.
 */
export function toggleLinePrefix(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  let allHavePrefix = true;
  const lines: { num: number; text: string; has: boolean }[] = [];

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const has = line.text.startsWith(prefix);
    lines.push({ num: i, text: line.text, has });
    if (!has) allHavePrefix = false;
  }

  const changes: { from: number; to: number; insert: string }[] = [];
  const addedLines = new Set<number>();
  const removedLines = new Set<number>();

  for (const { num, has } of lines) {
    const line = view.state.doc.line(num);
    if (allHavePrefix && has) {
      changes.push({
        from: line.from,
        to: line.from + prefix.length,
        insert: "",
      });
      removedLines.add(num);
    } else if (!allHavePrefix && !has) {
      changes.push({ from: line.from, to: line.from, insert: prefix });
      addedLines.add(num);
    }
  }

  if (changes.length === 0) {
    view.focus();
    return;
  }

  // Adjust selection positions based on prefix additions/removals per line
  const adjustPos = (pos: number): number => {
    const line = view.state.doc.lineAt(pos);
    if (addedLines.has(line.number)) {
      return pos + prefix.length;
    }
    if (removedLines.has(line.number)) {
      const afterPrefix = line.from + prefix.length;
      if (pos >= afterPrefix) return pos - prefix.length;
      return line.from;
    }
    return pos;
  };

  const newSelection = EditorSelection.create(
    view.state.selection.ranges.map((r) =>
      EditorSelection.range(adjustPos(r.from), adjustPos(r.to), r.goalColumn)
    ),
    view.state.selection.mainIndex
  );

  view.dispatch({ changes, selection: newSelection });
  view.focus();
}

/** Toggle heading level at the current line(s).
 *  If already at the requested level, remove the heading.
 *  The selection is adjusted so the cursor stays on the correct side of the
 *  inserted/removed prefix and the user can keep typing.
 */
export function toggleHeading(view: EditorView, level: number) {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  const changes: { from: number; to: number; insert: string }[] = [];
  const lineDeltas = new Map<number, number>();

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    const newPrefix = "#".repeat(level) + " ";
    if (match && match[1].length === level) {
      // Remove heading
      const prefixLen = match[0].length;
      changes.push({
        from: line.from,
        to: line.from + prefixLen,
        insert: "",
      });
      lineDeltas.set(i, -prefixLen);
    } else {
      // Replace or add heading
      const prefixLen = match ? match[0].length : 0;
      changes.push({
        from: line.from,
        to: line.from + prefixLen,
        insert: newPrefix,
      });
      lineDeltas.set(i, newPrefix.length - prefixLen);
    }
  }

  if (changes.length === 0) {
    view.focus();
    return;
  }

  const adjustPos = (pos: number): number => {
    const line = view.state.doc.lineAt(pos);
    const delta = lineDeltas.get(line.number);
    if (delta === undefined) return pos;
    if (delta > 0) {
      return pos + delta;
    }
    // Heading removed: keep cursor at line start if it was inside the prefix.
    const removedLen = -delta;
    if (pos <= line.from + removedLen) {
      return line.from;
    }
    return pos + delta;
  };

  const newSelection = EditorSelection.create(
    view.state.selection.ranges.map((r) =>
      EditorSelection.range(adjustPos(r.from), adjustPos(r.to), r.goalColumn)
    ),
    view.state.selection.mainIndex
  );

  view.dispatch({ changes, selection: newSelection });
  view.focus();
}

/** Insert text at cursor position. */
export function insertText(view: EditorView, text: string, selectOffset?: number) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
    selection: EditorSelection.cursor(
      selectOffset !== undefined ? pos + selectOffset : pos + text.length
    ),
  });
  view.focus();
}

/** Insert a table template with given rows and cols. */
export function insertTable(view: EditorView, rows: number, cols: number) {
  const header = "| " + Array(cols).fill("Header").join(" | ") + " |";
  const separator = "|" + Array(cols).fill(" --- ").join("|") + "|";
  const bodyLines: string[] = [];
  for (let r = 0; r < rows; r++) {
    bodyLines.push("| " + Array(cols).fill("Cell").join(" | ") + " |");
  }
  const table = ["", header, separator, ...bodyLines, ""].join("\n");
  insertText(view, table, undefined);
}

/** Surround selection with a fenced code block. */
export function insertCodeBlock(view: EditorView, lang = "") {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  const fence = "```" + lang;
  const insert = fence + "\n" + (selected || "code") + "\n```\n";
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(
      from + fence.length + 1 + (selected ? selected.length : 0)
    ),
  });
  view.focus();
}

/** Insert a markdown image link at the current cursor position. */
export function insertMarkdownImage(view: EditorView, alt: string, path: string) {
  const pos = view.state.selection.main.head;
  const text = `\n![${alt}](${path})\n`;
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
    selection: { anchor: pos + text.length },
  });
  view.focus();
}

/** Insert a fenced math block ($$...$$). */
export function insertMathBlock(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  const inner = selected || "E = mc^2";
  const prefix = "\n$$\n";
  const suffix = "\n$$\n";
  const insert = prefix + inner + suffix;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + prefix.length + inner.length),
  });
  view.focus();
}

/** Insert a Mermaid diagram block. */
export function insertMermaidBlock(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  const inner = selected || "graph TD\n    A[Start] --> B[End]";
  const prefix = "\n```mermaid\n";
  const suffix = "\n```\n";
  const insert = prefix + inner + suffix;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + prefix.length + inner.length),
  });
  view.focus();
}

/** Insert an HTML details/summary expandable section. */
export function insertDetailsBlock(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  const summary = "Summary";
  const content = selected || "Details content here";
  const insert = `<details>\n<summary>${summary}</summary>\n\n${content}\n\n</details>\n`;
  // Place cursor right after <summary> so user can edit the summary text
  const cursorPos = from + 10 + 9; // after "<details>\n<summary>"
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(cursorPos),
  });
  view.focus();
}

const LIST_OR_QUOTE_RE = /^\s*([-*+]\s+|\d+\.\s+|-\s*\[[ x]\]\s+|>\s+)/;

// Expose commands on window for E2E testing
if (typeof window !== "undefined") {
  (window as any).__markz_editorCommands = {
    toggleLinePrefix,
    indentSelection,
    insertMathBlock,
    insertMermaidBlock,
    insertDetailsBlock,
  };
}

/** Indent or outdent the current selection.
 *  On list/quote lines, adjusts line-start indentation.
 *  Otherwise inserts/removes spaces at the cursor.
 */
export function indentSelection(view: EditorView, direction: "indent" | "outdent"): boolean {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const isCollapsed = from === to;

  // For a collapsed cursor on non-list/quote text (not at line start),
  // insert/remove spaces at the cursor position
  if (
    isCollapsed &&
    from !== startLine.from &&
    !LIST_OR_QUOTE_RE.test(startLine.text)
  ) {
    if (direction === "indent") {
      view.dispatch({
        changes: { from, to, insert: "  " },
        selection: EditorSelection.cursor(from + 2),
      });
      return true;
    } else {
      const before = view.state.doc.sliceString(Math.max(0, from - 2), from);
      const spaces = before.match(/(\s+)$/)?.[1]?.length ?? 0;
      if (spaces > 0) {
        view.dispatch({
          changes: { from: from - spaces, to, insert: "" },
          selection: EditorSelection.cursor(from - spaces),
        });
        return true;
      }
      return false;
    }
  }

  // Indent/outdent all lines in the selection
  const endLine = view.state.doc.lineAt(to);
  const changes: { from: number; to: number; insert: string }[] = [];

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    if (direction === "indent") {
      changes.push({ from: line.from, to: line.from, insert: "  " });
    } else {
      const match = line.text.match(/^(\s{0,2})/);
      const spaces = match ? match[1].length : 0;
      if (spaces > 0) {
        changes.push({ from: line.from, to: line.from + spaces, insert: "" });
      }
    }
  }

  if (changes.length === 0) return false;

  view.dispatch({
    changes,
    selection: EditorSelection.create(
      view.state.selection.ranges.map((r) =>
        EditorSelection.range(mapPosition(r.from, changes), mapPosition(r.to, changes))
      ),
      view.state.selection.mainIndex
    ),
    userEvent: "input.indent",
  });
  return true;
}
