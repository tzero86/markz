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

/** Toggle a line prefix (e.g. "> ", "- ", "1. ") on each line in the selection.
 *  If all lines already have it, remove it.
 */
export function toggleLinePrefix(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  let allHavePrefix = true;
  const lines: { num: number; text: string; has: boolean }[] = [];

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const trimmed = line.text;
    const has = trimmed.startsWith(prefix);
    lines.push({ num: i, text: line.text, has });
    if (!has) allHavePrefix = false;
  }

  const changes = lines.map(({ num, text, has }) => {
    const line = view.state.doc.line(num);
    if (allHavePrefix && has) {
      return {
        from: line.from,
        to: line.from + prefix.length,
        insert: "",
      };
    } else if (!allHavePrefix && !has) {
      return { from: line.from, to: line.from, insert: prefix };
    }
    return null;
  });

  view.dispatch({
    changes: changes.filter(Boolean) as { from: number; to: number; insert: string }[],
  });
  view.focus();
}

/** Toggle heading level at the current line(s).
 *  If already at the requested level, remove the heading.
 */
export function toggleHeading(view: EditorView, level: number) {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    if (match && match[1].length === level) {
      // Remove heading
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from + match[0].length,
          insert: "",
        },
      });
    } else {
      // Replace or add heading
      const prefix = match ? match[0] : "";
      const newPrefix = "#".repeat(level) + " ";
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from + prefix.length,
          insert: newPrefix,
        },
      });
    }
  }
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
    selection: EditorSelection.cursor(from + fence.length + 1 + (selected ? selected.length : 0)),
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
