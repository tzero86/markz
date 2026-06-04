import { type Extension } from "@codemirror/state";
import {
  gutter,
  GutterMarker,
  EditorView,
} from "@codemirror/view";

const breakIcon = new (class extends GutterMarker {
  toDOM() {
    const el = document.createElement("div");
    el.className = "slide-break-icon";
    el.textContent = "\u25b6"; // ▶
    el.title = "Slide break";
    return el;
  }
})();

const emptyIcon = new (class extends GutterMarker {
  toDOM() {
    const el = document.createElement("div");
    el.className = "slide-break-empty";
    el.textContent = "\u25b7"; // ▷
    el.title = "Click to add slide break";
    return el;
  }
})();

/** Create a CodeMirror extension that renders slide-break markers in the
 *  gutter.  Clicking the gutter toggles a break at that line. */
export function createSlideBreakExtension(
  breaks: number[],
  onToggle: (line: number) => void,
  enabled: boolean
): Extension[] {
  if (!enabled) return [];

  const breakSet = new Set(breaks);

  return [
    gutter({
      class: "cm-slide-break-gutter",
      lineMarker(view, line) {
        const lineNo = view.state.doc.lineAt(line.from).number;
        return breakSet.has(lineNo) ? breakIcon : emptyIcon;
      },
      initialSpacer() {
        return emptyIcon;
      },
      domEventHandlers: {
        mousedown(view, line) {
          const lineNo = view.state.doc.lineAt(line.from).number;
          onToggle(lineNo);
          return true;
        },
      },
    }),
    EditorView.baseTheme({
      ".cm-slide-break-gutter": {
        width: "20px",
        cursor: "pointer",
        userSelect: "none",
      },
      ".slide-break-icon": {
        color: "var(--accent-default)",
        fontSize: "10px",
        textAlign: "center",
        lineHeight: "inherit",
        opacity: "1",
      },
      ".slide-break-empty": {
        color: "var(--text-tertiary)",
        fontSize: "10px",
        textAlign: "center",
        lineHeight: "inherit",
        opacity: "0.3",
        transition: "opacity 0.15s",
      },
      ".cm-slide-break-gutter:hover .slide-break-empty": {
        opacity: "0.7",
      },
    }),
  ];
}
