import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  Decoration,
  ViewPlugin,
} from "@codemirror/view";
import { showMinimap } from "@replit/codemirror-minimap";

if (typeof window !== "undefined") {
  (window as any).EditorView = EditorView;
}
import { type Extension } from "@codemirror/state";
import { EditorState, Compartment, RangeSetBuilder } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, searchKeymap, search, openSearchPanel } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { CursorPosition } from "../../lib/editorStore";
import { indentSelection } from "./editorCommands";
import { snippetKeymap, cycleSnippetTabStops } from "./snippets";
import { markdownLinter, spellcheckFacet } from "./markdownLinter";
import { closeBrackets } from "@codemirror/autocomplete";
import { vim } from "@replit/codemirror-vim";
import { createSlideBreakExtension } from "./slideBreakGutter";

/** Smart list continuation: pressing Enter on a list item continues the list.
 *  If the line is empty (only the marker), removes the marker and exits the list. */
function smartListEnter(view: EditorView): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const lineText = line.text;

  // Match: optional whitespace, then list marker, then space/tab
  const match = lineText.match(/^(\s*)([-*+]|\d+\.)\s+/);
  if (!match) return false;

  const indent = match[1];
  const marker = match[2];
  const contentAfterMarker = lineText.slice(match[0].length);

  // If line only has the marker + whitespace, remove it and exit list
  if (contentAfterMarker.trim() === "") {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: "" },
      selection: { anchor: line.from },
    });
    return true;
  }

  // Continue the list: insert newline + marker at cursor position
  let nextMarker = marker;
  if (/^\d+\./.test(marker)) {
    const num = parseInt(marker, 10);
    nextMarker = `${num + 1}.`;
  }

  const insertText = `\n${indent}${nextMarker} `;
  view.dispatch({
    changes: { from: pos, to: pos, insert: insertText },
    selection: { anchor: pos + insertText.length },
  });
  return true;
}

const themeCompartment = new Compartment();
const fontCompartment = new Compartment();
const wrapCompartment = new Compartment();
const minimapCompartment = new Compartment();
const spellcheckCompartment = new Compartment();
const dictionaryCompartment = new Compartment();
const vimCompartment = new Compartment();
const slideBreakCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

function buildDictionaryPlugin(words: string[]): Extension {
  if (words.length === 0) return [];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp("(?:^|[^\w])" + escaped.join("|") + "(?![\w])", "gi");
  const mark = Decoration.mark({ attributes: { spellcheck: "false" } });
  const plugin = ViewPlugin.fromClass(
    class {
      decorations = Decoration.none;
      constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
      }
      update(update: any) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDeco(update.view);
        }
      }
      buildDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const { viewport } = view;
        const text = view.state.doc.toString();
        let m: RegExpExecArray | null;
        pattern.lastIndex = 0;
        while ((m = pattern.exec(text)) !== null) {
          const from = m.index + (m[0].match(/^[^\w]/) ? 1 : 0);
          const to = from + m[0].length - (m[0].match(/[^\w]$/) ? 1 : 0);
          if (to > viewport.from && from < viewport.to) {
            builder.add(from, to, mark);
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v: any) => v.decorations }
  );
  return plugin;
}

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
      ".cm-minimap-overlay-container .cm-minimap-overlay": {
        background: isDark ? "rgb(200, 200, 200)" : "rgb(121, 121, 121)",
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
  showMinimap?: boolean;
  customDictionary?: string[];
  slideBreaks?: number[];
  slideBreaksEnabled?: boolean;
  readOnly?: boolean;
  onSlideBreakToggle?: (line: number) => void;
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

  const slideBreaksEnabled = config.slideBreaksEnabled ?? false;

  const extensions = [
    themeCompartment.of(createEditorTheme(isDark)),
    fontCompartment.of(createFontExtension(fontFamily, fontSize, lineHeight)),
    wrapCompartment.of([]),
    minimapCompartment.of(createMinimapExtension(config.showMinimap ?? false)),
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    snippetKeymap(),
    keymap.of([
      ...markdownKeymap,
      {
        key: "Tab",
        run: (view) => {
          if (cycleSnippetTabStops(view)) return true;
          return indentSelection(view, "indent");
        },
      },
      {
        key: "Shift-Tab",
        run: (view) => indentSelection(view, "outdent"),
      },
      {
        key: "Enter",
        run: smartListEnter,
      },
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      {
        key: "Mod-h",
        run: openSearchPanel,
      },
    ]),
    search(),
    highlightSelectionMatches(),
    markdown(),
    syntaxHighlighting(markdownHighlightStyle),
    markdownLinter,
    spellcheckCompartment.of(spellcheckFacet),
    dictionaryCompartment.of(buildDictionaryPlugin(config.customDictionary ?? [])),
    slideBreakCompartment.of(
      createSlideBreakExtension(
        config.slideBreaks ?? [],
        config.onSlideBreakToggle ?? (() => {}),
        slideBreaksEnabled
      )
    ),
    readOnlyCompartment.of(EditorState.readOnly.of(config.readOnly ?? false)),
    closeBrackets(),
    // Extend bracket auto-pairing with Markdown emphasis/code delimiters.
    // closeBrackets() reads its config from language data; the default markdown
    // language only provides comment tokens, so we supply a custom config that
    // keeps the standard pairs and adds *, _, and `.
    EditorState.languageData.of(() => [
      {
        closeBrackets: {
          brackets: ["(", "[", "{", "'", '"', "*", "_", "`"],
          before: ")]}:;>",
        },
      },
    ]),
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

export function setReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
  });
}

function createMinimapExtension(enabled: boolean): Extension {
  if (!enabled) return [];
  return showMinimap.of({
    create: () => {
      const dom = document.createElement("div");
      return { dom };
    },
    displayText: "blocks",
    showOverlay: "always",
  });
}

export function setMinimap(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: minimapCompartment.reconfigure(createMinimapExtension(enabled)),
  });
}
export function setSpellcheck(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: spellcheckCompartment.reconfigure(enabled ? spellcheckFacet : []),
  });
}
export function setCustomDictionary(view: EditorView, words: string[]) {
  view.dispatch({
    effects: dictionaryCompartment.reconfigure(buildDictionaryPlugin(words)),
  });
}

export function setVimMode(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: vimCompartment.reconfigure(enabled ? vim() : []),
  });
}

export function setSlideBreaks(
  view: EditorView,
  breaks: number[],
  onToggle: (line: number) => void,
  enabled: boolean
) {
  view.dispatch({
    effects: slideBreakCompartment.reconfigure(
      createSlideBreakExtension(breaks, onToggle, enabled)
    ),
  });
}
