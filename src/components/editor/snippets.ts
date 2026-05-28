import { EditorView, keymap } from "@codemirror/view";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { findSnippet, parseSnippetBody } from "../../lib/snippetStore";

export function snippetKeymap() {
  return keymap.of([
    {
      key: "Tab",
      run: (view: EditorView) => {
        const { state } = view;
        const { from, to } = state.selection.main;
        if (from !== to) return false; // Only expand when no selection

        const line = state.doc.lineAt(from);
        const before = state.doc.slice(line.from, from).toString();
        const wordMatch = before.match(/(\S+)$/);
        if (!wordMatch) return false;

        const trigger = wordMatch[1];
        const snippet = findSnippet(trigger);
        if (!snippet) return false;

        const { text, tabStops } = parseSnippetBody(snippet.body);
        const triggerStart = from - trigger.length;

        const changes = {
          from: triggerStart,
          to: from,
          insert: text,
        };

        // Build selection ranges from tab stops, offset by triggerStart
        const ranges: SelectionRange[] = tabStops.length > 0
          ? tabStops.map((stop) => {
              const sFrom = triggerStart + stop.from;
              const sTo = triggerStart + stop.to;
              return EditorSelection.range(sFrom, sTo);
            })
          : [EditorSelection.cursor(triggerStart + text.length)];

        view.dispatch({
          changes,
          selection: EditorSelection.create(ranges),
          scrollIntoView: true,
        });

        return true;
      },
    },
  ]);
}

export function cycleSnippetTabStops(view: EditorView): boolean {
  const { state } = view;
  const main = state.selection.main;
  const ranges = state.selection.ranges;
  // If we have multiple ranges (tab stops), cycle to the next one on Tab
  if (ranges.length > 1) {
    const currentIndex = ranges.findIndex(
      (r) => r.from <= main.from && main.to <= r.to
    );
    if (currentIndex >= 0) {
      const nextIndex = (currentIndex + 1) % ranges.length;
      view.dispatch({
        selection: EditorSelection.create([ranges[nextIndex]]),
        scrollIntoView: true,
      });
      return true;
    }
  }
  return false;
}
