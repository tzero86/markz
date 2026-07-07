import type { HLJSApi } from "highlight.js";

let hljsPromise: Promise<HLJSApi> | null = null;

async function getHljs(): Promise<HLJSApi> {
  if (!hljsPromise) {
    hljsPromise = import("highlight.js").then((m) => m.default ?? (m as unknown as HLJSApi));
  }
  return await hljsPromise;
}

let currentHljsTheme: "light" | "dark" | null = null;

export async function setHljsTheme(theme: "light" | "dark") {
  if (currentHljsTheme === theme) return;
  currentHljsTheme = theme;

  // Ensure the library is loaded before swapping styles.
  await getHljs();

  if (theme === "dark") {
    await import("highlight.js/styles/github-dark.css");
  } else {
    await import("highlight.js/styles/github.css");
  }
}

async function highlightBlock(el: HTMLElement) {
  if (el.dataset.highlighted) return;
  const hljs = await getHljs();
  hljs.highlightElement(el);
  el.dataset.highlighted = "true";
}

export async function highlightCodeBlocks(container: HTMLElement) {
  const blocks = Array.from(container.querySelectorAll("pre code[class^='language-']"));
  for (const block of blocks) {
    const el = block as HTMLElement;
    if (el.classList.contains("language-mermaid")) continue;
    await highlightBlock(el);
  }
}

/** Highlight code blocks in small batches, yielding to the browser between
 *  batches so the main thread stays responsive during large documents. */
export async function highlightCodeBlocksChunked(
  container: HTMLElement,
  batchSize = 5
) {
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>("pre code[class^='language-']")
  );
  for (let i = 0; i < blocks.length; i += batchSize) {
    if (i > 0) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const end = Math.min(i + batchSize, blocks.length);
    for (let j = i; j < end; j++) {
      const el = blocks[j];
      if (el.classList.contains("language-mermaid")) continue;
      await highlightBlock(el);
    }
  }
}
