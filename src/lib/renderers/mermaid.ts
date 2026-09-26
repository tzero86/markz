import type { default as MermaidType } from "mermaid";

type MermaidApi = typeof MermaidType;

let mermaidPromise: Promise<MermaidApi> | null = null;

/**
 * Lazily load the mermaid module.
 *
 * A static import would pull the ~1 MB bundle back into the eager graph of
 * every consumer, so the DOCX export chunk shipped a second copy of what the
 * preview renderer already loads.
 *
 * Configuration stays with the caller: mermaid keeps one global config while
 * the preview and the DOCX export each track their own theme, so initialize()
 * must not be baked in here.
 */
export function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}
