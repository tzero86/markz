import { loadKatex } from "../../lib/renderers/katex";
import type katexType from "katex";

async function getKatex(): Promise<typeof katexType> {
  return await loadKatex();
}

async function renderBlock(block: Element) {
  // Skip blocks that have already been rendered by KaTeX. This matters when
  // the preview cache restores post-processed HTML and the post-processing
  // effect runs again.
  if (block.querySelector(".katex")) return;

  const katex = await getKatex();
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

export async function renderMathBlocks(container: HTMLElement) {
  const blocks = container.querySelectorAll("div.math-block, span.math-inline");
  for (const block of blocks) {
    await renderBlock(block);
  }
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
      await renderBlock(blocks[j]);
    }
  }
}
