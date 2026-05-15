import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { CursorPosition } from "../../lib/editorStore";

const themeCompartment = new Compartment();

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
        fontFamily: "var(--font-mono)",
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
      ".cm-scroller": {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-base)",
        lineHeight: "1.7",
      },
    },
    { dark: isDark }
  );
}

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading,
    fontSize: "18px",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  {
    tag: tags.strong,
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  {
    tag: tags.emphasis,
    fontStyle: "italic",
    color: "var(--text-secondary)",
  },
  {
    tag: tags.link,
    color: "var(--accent-default)",
    textDecoration: "underline",
  },
  { tag: tags.url, color: "var(--accent-default)" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--bg-hover)",
    borderRadius: "var(--radius-sm)",
    padding: "1px 3px",
  },
  { tag: tags.keyword, color: "var(--text-tertiary)" },
  {
    tag: tags.quote,
    color: "var(--text-secondary)",
    fontStyle: "italic",
  },
  { tag: tags.comment, color: "var(--text-tertiary)" },
  { tag: tags.list, color: "var(--text-primary)" },
]);

export interface EditorConfig {
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

  const extensions = [
    themeCompartment.of(createEditorTheme(isDark)),
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
