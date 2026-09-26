import type katexType from "katex";

let katexPromise: Promise<typeof katexType> | null = null;

/**
 * Lazily load KaTeX together with its stylesheet.
 *
 * A static import would pull both back into the eager graph of every consumer,
 * so the DOCX export chunk shipped a second copy of what the preview renderers
 * already load.
 *
 * The stylesheet is not decorative: KaTeX defines fractions, radicals and
 * spacing entirely in CSS, and the DOCX export rasterises the live DOM (the
 * rasteriser copies computed styles), so a missing stylesheet yields collapsed
 * inline text instead of rendered math.
 */
export function loadKatex(): Promise<typeof katexType> {
  if (!katexPromise) {
    katexPromise = Promise.all([
      import("katex"),
      import("katex/dist/katex.min.css"),
    ]).then(([k]) => k.default);
  }
  return katexPromise;
}
