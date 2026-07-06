import hljs from "highlight.js";

let currentHljsTheme: "light" | "dark" | null = null;

export async function setHljsTheme(theme: "light" | "dark") {
  if (currentHljsTheme === theme) return;
  currentHljsTheme = theme;

  if (theme === "dark") {
    await import("highlight.js/styles/github-dark.css");
  } else {
    await import("highlight.js/styles/github.css");
  }
}

export function highlightCodeBlocks(container: HTMLElement) {
  container.querySelectorAll("pre code[class^='language-']").forEach((block) => {
    const el = block as HTMLElement;
    if (el.classList.contains("language-mermaid")) return;
    highlightBlock(el);
  });
}

function highlightBlock(el: HTMLElement) {
  if (el.dataset.highlighted) return;
  hljs.highlightElement(el);
  el.dataset.highlighted = "true";
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
      highlightBlock(el);
    }
  }
}
