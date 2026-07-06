import katex from "katex";
import "katex/dist/katex.min.css";

function renderBlock(block: Element) {
  const tex = block.textContent || "";
  const displayMode = block.tagName.toLowerCase() === "div";
  try {
    block.innerHTML = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
    });
  } catch (e) {
    console.error("KaTeX render failed:", e);
  }
}

export function renderMathBlocks(container: HTMLElement) {
  container.querySelectorAll("div.math-block, span.math-inline").forEach(renderBlock);
}

/** Render math blocks in small batches, yielding to the browser between
 *  batches so the main thread stays responsive during large documents. */
export async function renderMathBlocksChunked(
  container: HTMLElement,
  batchSize = 10
) {
  const blocks = Array.from(
    container.querySelectorAll("div.math-block, span.math-inline")
  );
  for (let i = 0; i < blocks.length; i += batchSize) {
    if (i > 0) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const end = Math.min(i + batchSize, blocks.length);
    for (let j = i; j < end; j++) {
      renderBlock(blocks[j]);
    }
  }
}
