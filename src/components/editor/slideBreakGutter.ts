import { type Extension } from "@codemirror/state";
import {
  gutter,
  GutterMarker,
  EditorView,
} from "@codemirror/view";

class BreakMarker extends GutterMarker {
  constructor(public slideNumber: number) {
    super();
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "slide-break-gutter-marker";
    el.setAttribute("data-slide", String(this.slideNumber));
    el.title = `End of slide ${this.slideNumber} · Start of slide ${this.slideNumber + 1}`;

    const endHalf = document.createElement("div");
    endHalf.className = "sbgm-half sbgm-end";

    const startHalf = document.createElement("div");
    startHalf.className = "sbgm-half sbgm-start";

    const num = document.createElement("span");
    num.className = "sbgm-number";
    num.textContent = String(this.slideNumber);

    el.appendChild(endHalf);
    el.appendChild(startHalf);
    el.appendChild(num);
    return el;
  }
}

class EmptyMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement("div");
    el.className = "slide-break-gutter-empty";
    el.title = "Click to add slide break";
    return el;
  }
}

const EMPTY = new EmptyMarker();

/** Create a CodeMirror extension that renders slide-break markers in the
 *  gutter.  Clicking the gutter toggles a break at that line.
 *
 *  Each active marker shows a split-colour bookmark: warm amber top
 *  (end of slide N) and cool teal bottom (start of slide N+1), with the
 *  slide number in white at the centre. */
export function createSlideBreakExtension(
  breaks: number[],
  onToggle: (line: number) => void,
  enabled: boolean
): Extension[] {
  if (!enabled) return [];

  const breakSet = new Set(breaks);
  const sorted = [...breaks].sort((a, b) => a - b);

  return [
    gutter({
      class: "cm-slide-break-gutter",
      lineMarker(view, line) {
        const lineNo = view.state.doc.lineAt(line.from).number;
        if (!breakSet.has(lineNo)) return EMPTY;
        const idx = sorted.indexOf(lineNo);
        const slideNum = idx >= 0 ? idx + 1 : 0;
        return new BreakMarker(slideNum);
      },
      initialSpacer() {
        return EMPTY;
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
        width: "22px",
        cursor: "pointer",
        userSelect: "none",
      },
      ".slide-break-gutter-marker": {
        width: "14px",
        height: "14px",
        margin: "0 auto",
        position: "relative",
        borderRadius: "3px",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      },
      ".sbgm-half": {
        position: "absolute",
        left: "0",
        right: "0",
        height: "50%",
      },
      ".sbgm-end": {
        top: "0",
        background: "var(--slide-break-end)",
      },
      ".sbgm-start": {
        bottom: "0",
        background: "var(--slide-break-start)",
      },
      ".sbgm-number": {
        position: "absolute",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "7px",
        fontWeight: "700",
        color: "#fff",
        textShadow: "0 1px 1px rgba(0,0,0,0.3)",
        zIndex: "1",
        letterSpacing: "-0.02em",
      },
      ".slide-break-gutter-empty": {
        width: "8px",
        height: "8px",
        margin: "3px auto",
        borderRadius: "2px",
        border: "1px solid var(--text-tertiary)",
        opacity: "0.25",
        transition: "opacity 0.15s ease, background 0.15s ease",
      },
      ".cm-slide-break-gutter:hover .slide-break-gutter-empty": {
        opacity: "0.6",
        background: "var(--slide-break-end-bg)",
        borderColor: "var(--slide-break-end)",
      },
    }),
  ];
}
