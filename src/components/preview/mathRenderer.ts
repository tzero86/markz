import katex from "katex";
import "katex/dist/katex.min.css";

export function renderMathBlocks(container: HTMLElement) {
  container.querySelectorAll("div.math-block").forEach((block) => {
    const tex = block.textContent || "";
    try {
      block.innerHTML = katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      console.error("KaTeX render failed:", e);
    }
  });

  container.querySelectorAll("span.math-inline").forEach((block) => {
    const tex = block.textContent || "";
    try {
      block.innerHTML = katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
      });
    } catch (e) {
      console.error("KaTeX render failed:", e);
    }
  });
}
