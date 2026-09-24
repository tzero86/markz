/** Read-along highlighting for text-to-speech.
 *
 *  TTS synthesises one audio clip per sentence, so the clip being played is
 *  known exactly and its sentence can be highlighted precisely. The position
 *  *inside* that sentence is interpolated from `audio.currentTime`, so the word
 *  highlight is an estimate: neither the Edge nor the Windows engine emits
 *  word-boundary events.
 *
 *  Highlighting never mutates the preview DOM. The active block gets a class
 *  for the block-level tint, and the sentence/word ranges are painted with the
 *  CSS Custom Highlight API, which keeps the preview's node structure intact
 *  (the pane is a live-rendered `{@html}` sink).
 */

export interface TextRange {
  start: number;
  end: number;
}

interface TextPiece {
  node: Text;
  /** Offsets of this node's collapsed text inside the segment text. */
  start: number;
  end: number;
  /** Node offset of every character of this node's collapsed text. */
  map: number[];
}

export interface TtsSegment {
  /** Block element the text belongs to; receives the active-block tint. */
  element: HTMLElement;
  /** Whitespace-collapsed text. Chunk offsets index into this string. */
  text: string;
  pieces: TextPiece[];
}

/** Blocks that read as a unit. Nesting is resolved per text node, so a task
 *  list item's paragraph and a nested list item are separate segments. */
const SEGMENT_SELECTOR =
  "p, li, h1, h2, h3, h4, h5, h6, blockquote, dt, dd, figcaption";

/** Subtrees that are never read aloud, and therefore never highlighted.
 *  Frontmatter is metadata, not prose. */
const SKIP_SELECTOR =
  "pre, .mermaid-diagram, svg, img, table, hr, script, style, .frontmatter";

/** Whitespace that collapses to a single space when reading aloud. */
const SPACE_CHARS: Record<string, true> = {
  " ": true,
  "\t": true,
  "\n": true,
  "\r": true,
  "\u00a0": true,
};

const READING_CLASS = "tts-reading";
const SENTENCE_HIGHLIGHT = "markz-tts-sentence";
const WORD_HIGHLIGHT = "markz-tts-word";

/** Collect what should be read aloud, as segments in document order. Each
 *  segment carries the DOM nodes its text came from, so a range of that text
 *  can be mapped back to a `Range`. */
export function collectSegments(container: HTMLElement): TtsSegment[] {
  const segments: TtsSegment[] = [];
  let current: TtsSegment | null = null;
  let currentBlock: Element | null = null;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).matches(SKIP_SELECTOR)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const textNode = node as Text;
    if (!textNode.data) continue;

    // Nearest enclosing block inside the container; consecutive text nodes
    // sharing it form one segment.
    const enclosing = textNode.parentElement?.closest(SEGMENT_SELECTOR) ?? null;
    const block: Element =
      enclosing && container.contains(enclosing) ? enclosing : container;

    if (block !== currentBlock || !current) {
      currentBlock = block;
      current = { element: block as HTMLElement, text: "", pieces: [] };
      segments.push(current);
    }
    appendPiece(current, textNode);
  }

  return segments.filter((segment) => segment.text.trim().length > 0);
}

/** Collapse one text node's whitespace and record where each surviving
 *  character sits in the node, so offsets stay mappable to DOM positions. */
function appendPiece(segment: TtsSegment, node: Text) {
  let collapsed = "";
  const map: number[] = [];
  let inWhitespace = false;

  for (let i = 0; i < node.data.length; i++) {
    const char = node.data[i];
    if (SPACE_CHARS[char]) {
      if (inWhitespace) continue;
      inWhitespace = true;
      collapsed += " ";
    } else {
      inWhitespace = false;
      collapsed += char;
    }
    map.push(i);
  }

  if (!collapsed) return;
  segment.pieces.push({
    node,
    start: segment.text.length,
    end: segment.text.length + collapsed.length,
    map,
  });
  segment.text += collapsed;
}

/** Split a segment's text into sentence-sized chunks, as offsets into that
 *  text. Mirrors the synthesis chunking: sentences first, then word-boundary
 *  splits for anything longer than `maxLen`. */
export function chunkRanges(text: string, maxLen = 350): TextRange[] {
  const ranges: TextRange[] = [];

  const push = (start: number, end: number) => {
    const trimmed = trimRange(text, start, end);
    if (!trimmed) return;
    if (trimmed.end - trimmed.start <= maxLen) {
      ranges.push(trimmed);
      return;
    }
    let cursor = trimmed.start;
    while (trimmed.end - cursor > maxLen) {
      let cut = text.lastIndexOf(" ", cursor + maxLen);
      if (cut <= cursor) cut = cursor + maxLen;
      ranges.push({ start: cursor, end: cut });
      cursor = skipSpaces(text, cut);
    }
    if (cursor < trimmed.end) ranges.push({ start: cursor, end: trimmed.end });
  };

  const sentence = /[^.!?]+[.!?]+(?:\s|$)/g;
  let match: RegExpExecArray | null;
  let last = 0;
  while ((match = sentence.exec(text)) !== null) {
    push(match.index, match.index + match[0].length);
    last = sentence.lastIndex;
  }
  if (last < text.length) push(last, text.length);

  return ranges;
}

/** The word covered by `progress` (0-1) within a chunk, so the highlight can
 *  follow the audio position. Approximate by design. */
export function wordRangeAt(
  text: string,
  chunk: TextRange,
  progress: number
): TextRange | null {
  const ratio = Math.min(Math.max(progress, 0), 1);
  let index = Math.floor(chunk.start + ratio * (chunk.end - chunk.start));
  if (index >= chunk.end) index = chunk.end - 1;

  let start = index;
  while (start < chunk.end && SPACE_CHARS[text[start]]) start++;
  if (start >= chunk.end) return null;
  while (start > chunk.start && !SPACE_CHARS[text[start - 1]]) start--;

  let end = start;
  while (end < chunk.end && !SPACE_CHARS[text[end]]) end++;
  return { start, end };
}

/** DOM range for a range of the segment's text, spanning nodes as needed.
 *  Returns null when the offsets fall outside the segment. */
export function domRange(segment: TtsSegment, range: TextRange): Range | null {
  if (range.end <= range.start) return null;
  const first = pieceAt(segment, range.start);
  const last = pieceAt(segment, range.end - 1);
  if (!first || !last) return null;

  const dom = document.createRange();
  dom.setStart(first.node, first.map[range.start - first.start]);
  dom.setEnd(last.node, last.map[range.end - 1 - last.start] + 1);
  return dom;
}

/** Tint the block being read and keep it in view. */
export function setActiveBlock(element: HTMLElement | null) {
  if (activeBlock === element) return;
  activeBlock?.classList.remove(READING_CLASS);
  activeBlock = element?.isConnected ? element : null;
  if (!activeBlock) return;
  activeBlock.classList.add(READING_CLASS);
  // jsdom (unit tests) does not implement scrollIntoView.
  if (typeof activeBlock.scrollIntoView === "function") {
    activeBlock.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/** Paint the sentence or word currently being spoken. */
export function highlightReading(
  segment: TtsSegment | null,
  range: TextRange | null,
  kind: "sentence" | "word"
) {
  if (kind === "sentence") paint(WORD_HIGHLIGHT, null, null);
  paint(kind === "sentence" ? SENTENCE_HIGHLIGHT : WORD_HIGHLIGHT, segment, range);
}

/** Drop the block tint and both highlights. */
export function clearReading() {
  activeBlock?.classList.remove(READING_CLASS);
  activeBlock = null;
  const highlights = highlightRegistry();
  highlights?.delete(SENTENCE_HIGHLIGHT);
  highlights?.delete(WORD_HIGHLIGHT);
}

let activeBlock: HTMLElement | null = null;

function pieceAt(segment: TtsSegment, index: number): TextPiece | null {
  for (const piece of segment.pieces) {
    if (index >= piece.start && index < piece.end) return piece;
  }
  return null;
}

function paint(name: string, segment: TtsSegment | null, range: TextRange | null) {
  const highlights = highlightRegistry();
  if (!highlights) return;
  const dom = segment && range ? domRange(segment, range) : null;
  const highlight = dom && HighlightCtor ? new HighlightCtor(dom) : null;
  if (highlight) highlights.set(name, highlight);
  else highlights.delete(name);
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

interface HighlightConstructor {
  new (...ranges: Range[]): unknown;
}

// `globalThis` is declared without `Highlight`; the optional property is how the
// constructor is feature-detected before use.
const globalWithHighlight: { Highlight?: HighlightConstructor } = globalThis;
const HighlightCtor = globalWithHighlight.Highlight;

/** `CSS.highlights` is Chromium 105+ / WebKit 17.2+; without it the block tint
 *  still works, only the sentence and word ranges are skipped. */
function highlightRegistry(): HighlightRegistry | null {
  if (typeof CSS === "undefined") return null;
  const css: { highlights?: HighlightRegistry } = CSS;
  return css.highlights ?? null;
}

function skipSpaces(text: string, from: number): number {
  let index = from;
  while (index < text.length && SPACE_CHARS[text[index]]) index++;
  return index;
}

function trimRange(text: string, start: number, end: number): TextRange | null {
  const from = skipSpaces(text, start);
  let to = end;
  while (to > from && SPACE_CHARS[text[to - 1]]) to--;
  return to > from ? { start: from, end: to } : null;
}
