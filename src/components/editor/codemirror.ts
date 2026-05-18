import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { type Extension } from "@codemirror/state";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { CursorPosition } from "../../lib/editorStore";

const themeCompartment = new Compartment();
const fontCompartment = new Compartment();
const wrapCompartment = new Compartment();

function createEditorTheme(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      },
      ".cm-content": {
        color: "var(--text-primary)",
        caretColor: "var(--accent-default)",
        padding: "16px 0",
      },
      ".cm-cursor": {
        borderLeftColor: "var(--accent-default)",
        borderLeftWidth: "2px",
      },
      ".cm-selectionBackground": {
        background: "var(--accent-subtle) !important",
      },
      ".cm-activeLineGutter": {
        background: "var(--bg-hover)",
      },
      ".cm-gutters": {
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        color: "var(--text-tertiary)",
      },
      ".cm-lineNumbers": {
        color: "var(--text-tertiary)",
      },
      ".cm-activeLine": {
        backgroundColor: "transparent",
      },
    },
    { dark: isDark }
  );
}

function createFontExtension(
  fontFamily: string,
  fontSize: number,
  lineHeight: number
) {
  return EditorView.theme({
    ".cm-content": {
      fontFamily: `${fontFamily}, monospace`,
    },
    ".cm-scroller": {
      fontFamily: `${fontFamily}, monospace`,
      fontSize: `${fontSize}px`,
      lineHeight: `${lineHeight}`,
    },
  });
}

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading,
    color: "var(--syntax-heading)",
    fontWeight: "bold",
  },
  { tag: tags.strong, color: "var(--syntax-bold)", fontWeight: "bold" },
  { tag: tags.emphasis, color: "var(--syntax-italic)", fontStyle: "italic" },
  { tag: tags.strikethrough, color: "var(--text-tertiary)", textDecoration: "line-through" },
  { tag: tags.link, color: "var(--syntax-link)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--syntax-link)" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--syntax-code-bg)",
    borderRadius: "var(--radius-sm)",
    padding: "1px 3px",
  },
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: tags.quote, color: "var(--syntax-quote)", fontStyle: "italic" },
  { tag: tags.comment, color: "var(--syntax-comment)", fontStyle: "italic" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.bool, color: "var(--syntax-keyword)" },
  { tag: tags.regexp, color: "var(--syntax-regexp)" },
  { tag: tags.variableName, color: "var(--syntax-variable)" },
  { tag: tags.typeName, color: "var(--syntax-type)" },
  { tag: tags.function(tags.variableName), color: "var(--syntax-function)" },
  { tag: tags.operator, color: "var(--syntax-operator)" },
  { tag: tags.atom, color: "var(--syntax-number)" },
]);

export interface EditorConfig {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  onChange: (content: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
  onScroll?: () => void;
}

export interface EditorInstance {
  view: EditorView;
  destroy: () => void;
}

export function initEditor(
  parent: HTMLElement,
  initialContent: string,
  config: EditorConfig
): EditorInstance {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (document.documentElement.getAttribute("data-theme") === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const fontFamily = config.fontFamily ?? "JetBrains Mono";
  const fontSize = config.fontSize ?? 14;
  const lineHeight = config.lineHeight ?? 1.7;

  const extensions = [
    themeCompartment.of(createEditorTheme(isDark)),
    fontCompartment.of(createFontExtension(fontFamily, fontSize, lineHeight)),
    wrapCompartment.of([]),
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    highlightSelectionMatches(),
    markdown(),
    syntaxHighlighting(markdownHighlightStyle),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        config.onChange(update.state.doc.toString());
      }
      if (update.selectionSet && config.onCursorChange) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        config.onCursorChange({
          line: line.number,
          column: head - line.from + 1,
        });
      }
    }),
  ];

  const state = EditorState.create({
    doc: initialContent,
    extensions,
  });

  const view = new EditorView({
    state,
    parent,
  });

  const scroller = parent.querySelector(".cm-scroller") as HTMLElement | null;
  if (scroller && config.onScroll) {
    scroller.addEventListener("scroll", config.onScroll, { passive: true });
  }

  return {
    view,
    destroy() {
      if (scroller && config.onScroll) {
        scroller.removeEventListener("scroll", config.onScroll);
      }
      view.destroy();
    },
  };
}

export function setEditorTheme(view: EditorView, isDark: boolean) {
  view.dispatch({
    effects: themeCompartment.reconfigure(createEditorTheme(isDark)),
  });
}

export function setEditorFont(
  view: EditorView,
  fontFamily: string,
  fontSize: number,
  lineHeight: number
) {
  view.dispatch({
    effects: fontCompartment.reconfigure(
      createFontExtension(fontFamily, fontSize, lineHeight)
    ),
  });
}

export function setWordWrap(view: EditorView, enabled: boolean) {
  const ext: Extension = enabled ? EditorView.lineWrapping : [];
  view.dispatch({
    effects: wrapCompartment.reconfigure(ext),
  });
}