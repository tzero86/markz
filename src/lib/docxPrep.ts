import mermaid from "mermaid";
import katex from "katex";
import "katex/dist/katex.min.css";
import { toPng } from "html-to-image";

interface ImageItem {
  placeholder: string;
  original: string;
  dataUrl: string;
  success: boolean;
}

/**
 * Scan markdown for mermaid blocks and math expressions, render each to a PNG,
 * and return a modified markdown where originals are replaced with data-URL
 * image references that the DOCX backend can embed.
 */
export async function prepareMarkdownForDocx(markdown: string): Promise<string> {
  // Quick exit if nothing to render
  if (!markdown.includes("```mermaid") && !markdown.includes("$$") && !markdown.includes("$")) {
    return markdown;
  }

  // 1. Extract mermaid blocks first (they may contain $ chars)
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const mermaidItems: ImageItem[] = [];
  let mermaidCounter = 0;
  let afterMermaid = markdown.replace(mermaidRegex, (_match, content: string) => {
    const placeholder = `%%MERMAID_${mermaidCounter++}%%`;
    mermaidItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  // 2. Extract block math next
  const blockMathRegex = /\$\$\n?([\s\S]*?)\n?\$\$/g;
  const blockMathItems: ImageItem[] = [];
  let blockMathCounter = 0;
  let afterBlockMath = afterMermaid.replace(blockMathRegex, (_match, content: string) => {
    const placeholder = `%%MATH_BLOCK_${blockMathCounter++}%%`;
    blockMathItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  // 3. Extract inline math last
  const inlineMathRegex = /\$([^\s$](?:[^$]*?[^\s$])?)\$/g;
  const inlineMathItems: ImageItem[] = [];
  let inlineMathCounter = 0;
  let afterInlineMath = afterBlockMath.replace(inlineMathRegex, (_match, content: string) => {
    const placeholder = `%%MATH_INLINE_${inlineMathCounter++}%%`;
    inlineMathItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  // If nothing was extracted, return original
  if (mermaidItems.length === 0 && blockMathItems.length === 0 && inlineMathItems.length === 0) {
    return markdown;
  }

  // Show a white overlay to hide the rendering flash.
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;" +
    "background:#ffffff;z-index:2147483647;";
  document.body.appendChild(overlay);

  try {
    // Save the global mermaid config so we can restore it after export.
    // mermaid.initialize() resets *everything* to defaults; we must use
    // getConfig()/setConfig() to avoid polluting the preview panel's state.
    const originalConfig = mermaid.mermaidAPI.getConfig();

    // 4a. Render mermaid sequentially — mermaid uses mutable global config,
    //    so parallel renders would race and corrupt each other's output.
    for (const item of mermaidItems) {
      try {
        item.dataUrl = await renderMermaidToPng(item.original, originalConfig);
        item.success = true;
      } catch (e) {
        console.error("Mermaid render failed:", e);
      }
    }

    // 4b. Render math in parallel — KaTeX is stateless per-call.
    await Promise.all([
      ...blockMathItems.map(async (item) => {
        try {
          item.dataUrl = await renderMathToPng(item.original, true);
          item.success = true;
        } catch (e) {
          console.error("Block math render failed:", e);
        }
      }),
      ...inlineMathItems.map(async (item) => {
        try {
          item.dataUrl = await renderMathToPng(item.original, false);
          item.success = true;
        } catch (e) {
          console.error("Inline math render failed:", e);
        }
      }),
    ]);
  } finally {
    if (overlay.parentNode) {
      document.body.removeChild(overlay);
    }
  }

  // 5. Reconstruct markdown
  let result = afterInlineMath;
  for (const item of [...mermaidItems, ...blockMathItems, ...inlineMathItems]) {
    if (item.success) {
      result = result.replaceAll(item.placeholder, `![rendered](${item.dataUrl})`);
    } else {
      // Restore original syntax
      if (item.placeholder.startsWith("%%MERMAID_")) {
        result = result.replaceAll(item.placeholder, `\`\`\`mermaid\n${item.original}\`\`\``);
      } else if (item.placeholder.startsWith("%%MATH_BLOCK_")) {
        result = result.replaceAll(item.placeholder, `$$${item.original}$$`);
      } else {
        result = result.replaceAll(item.placeholder, `$${item.original}$`);
      }
    }
  }

  return result;
}

function sanitizeMermaidSvg(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.documentElement;

  // Sanitize every <style> block: strip @font-face, @import, and external url() refs
  svgEl.querySelectorAll("style").forEach((styleEl) => {
    let css = styleEl.textContent || "";
    css = css
      .replace(/@font-face\s*{[^{}]*}/gi, "")
      .replace(/@import\s+[^;]*;/gi, "")
      // Remove external url() references (http, https, protocol-relative, or bare font files)
      .replace(/url\(["']?(?:https?:\/\/|\/\/)[^)]*\)/gi, "")
      .replace(/url\(["']?[^"')]*\.(?:woff2?|ttf|otf|eot)["']?\)/gi, "")
      .replace(/font-family:\s*[^;{}]+/gi, "font-family: Arial, Helvetica, sans-serif");
    styleEl.textContent = css;
  });

  // Sanitize inline style attributes and force Arial on text elements
  const walker = doc.createTreeWalker(svgEl, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;
  while ((node = walker.nextNode() as Element | null)) {
    const style = node.getAttribute("style");
    if (style) {
      const cleaned = style
        .replace(/url\(["']?(?:https?:\/\/|\/\/)[^)]*\)/gi, "")
        .replace(/font-family:\s*[^;]+/gi, "font-family: Arial, Helvetica, sans-serif");
      node.setAttribute("style", cleaned);
    }
    if (node.tagName === "text" || node.tagName === "tspan") {
      node.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    }
  }

  return new XMLSerializer().serializeToString(svgEl);
}

async function renderMermaidToPng(content: string, originalConfig: any): Promise<string> {
  // Temporarily switch to "default" (light) theme for the export image.
  // Use setConfig so we don't wipe flowchart.useMaxWidth or other sizing
  // options that mermaidRenderer.ts may have configured.
  mermaid.mermaidAPI.setConfig({ ...originalConfig, theme: "default" });

  const id = "mermaid-export-" + Math.random().toString(36).substring(2, 11);
  const { svg } = await mermaid.render(id, content);

  // Restore the original config immediately after render so the preview
  // panel never sees the light-theme export settings.
  mermaid.mermaidAPI.setConfig(originalConfig);

  // Sanitize the SVG to remove external font/URL references
  const cleanedSvg = sanitizeMermaidSvg(svg);

  // Parse intrinsic dimensions from the sanitised SVG.
  const svgDoc = new DOMParser().parseFromString(cleanedSvg, "image/svg+xml");
  const svgEl = svgDoc.documentElement;

  let width = 0;
  let height = 0;
  const viewBox = svgEl.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4) {
      width = parts[2];
      height = parts[3];
    }
  }
  // Fall back to width/height attributes only when viewBox is absent
  if (!width || !height) {
    width = parseFloat(svgEl.getAttribute("width") || "0");
    height = parseFloat(svgEl.getAttribute("height") || "0");
  }
  width = width || 600;
  height = height || 400;

  // Embed the SVG as a base64 data URL inside an <img> tag.
  const base64 = btoa(unescape(encodeURIComponent(cleanedSvg)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image failed to load"));
    image.src = dataUrl;
  });

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;top:0;left:0;z-index:2147483646;" +
    "background:#ffffff;";
  img.style.width = width + "px";
  img.style.height = height + "px";
  wrapper.appendChild(img);
  document.body.appendChild(wrapper);

  try {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 50));

    return await toPng(wrapper, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  } finally {
    if (wrapper.parentNode) {
      document.body.removeChild(wrapper);
    }
  }
}

async function renderMathToPng(latex: string, isBlock: boolean): Promise<string> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:0;left:0;z-index:2147483646;" +
    "display:inline-block;background:#ffffff;color:#000000;" +
    (isBlock ? "padding:12px 16px;" : "padding:2px 4px;");
  document.body.appendChild(container);

  try {
    katex.render(latex, container, {
      throwOnError: false,
      displayMode: isBlock,
    });

    // Force black text on every KaTeX element (KaTeX may inherit theme colors)
    container.querySelectorAll("*").forEach((el) => {
      (el as HTMLElement).style.color = "#000000";
    });

    // Wait for fonts and layout to settle
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 50));

    return await toPng(container, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
