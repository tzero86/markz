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

interface ProtectedItem {
  placeholder: string;
  original: string;
}
/**
 * Extract mermaid blocks, code blocks, inline code, and math expressions
 * from markdown, replacing them with placeholders.
 * Exported for unit testing the extraction/reconstruction logic.
 */
export function extractDocxPlaceholders(markdown: string): {
  modified: string;
  mermaidItems: ImageItem[];
  blockMathItems: ImageItem[];
  inlineMathItems: ImageItem[];
  codeBlockItems: ProtectedItem[];
  inlineCodeItems: ProtectedItem[];
} {
  const mermaidRegex = /```mermaid\r?\n([\s\S]*?)\r?\n```/g;
  const mermaidItems: ImageItem[] = [];
  let mermaidCounter = 0;
  let afterMermaid = markdown.replace(mermaidRegex, (_match, content: string) => {
    const placeholder = `%%MERMAID_${mermaidCounter++}%%`;
    mermaidItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  const codeBlockRegex = /```[a-zA-Z0-9_+-]*\r?\n[\s\S]*?\r?\n```/g;
  const codeBlockItems: ProtectedItem[] = [];
  let codeBlockCounter = 0;
  let afterCodeBlocks = afterMermaid.replace(codeBlockRegex, (match: string) => {
    if (match.startsWith("```mermaid")) {
      return match;
    }
    const placeholder = `%%CODE_BLOCK_${codeBlockCounter++}%%`;
    codeBlockItems.push({ placeholder, original: match });
    return placeholder;
  });

  const inlineCodeRegex = /`[^`\r\n]+`/g;
  const inlineCodeItems: ProtectedItem[] = [];
  let inlineCodeCounter = 0;
  let afterInlineCode = afterCodeBlocks.replace(inlineCodeRegex, (match: string) => {
    const placeholder = `%%INLINE_CODE_${inlineCodeCounter++}%%`;
    inlineCodeItems.push({ placeholder, original: match });
    return placeholder;
  });

  const blockMathRegex = /\$\$\r?\n?([\s\S]*?)\r?\n?\$\$/g;
  const blockMathItems: ImageItem[] = [];
  let blockMathCounter = 0;
  let afterBlockMath = afterInlineCode.replace(blockMathRegex, (_match, content: string) => {
    const placeholder = `%%MATH_BLOCK_${blockMathCounter++}%%`;
    blockMathItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  const inlineMathRegex = /\$([^\s$](?:[^\r\n$]*?[^\s$])?)\$/g;
  const inlineMathItems: ImageItem[] = [];
  let inlineMathCounter = 0;
  let afterInlineMath = afterBlockMath.replace(inlineMathRegex, (_match, content: string) => {
    const placeholder = `%%MATH_INLINE_${inlineMathCounter++}%%`;
    inlineMathItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  return {
    modified: afterInlineMath,
    mermaidItems,
    blockMathItems,
    inlineMathItems,
    codeBlockItems,
    inlineCodeItems,
  };
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

  interface ProtectedItem {
    placeholder: string;
    original: string;
  }

  // 1. Extract mermaid blocks first (they may contain $ chars)
  const mermaidRegex = /```mermaid\r?\n([\s\S]*?)\r?\n```/g;
  const mermaidItems: ImageItem[] = [];
  let mermaidCounter = 0;
  let afterMermaid = markdown.replace(mermaidRegex, (_match, content: string) => {
    const placeholder = `%%MERMAID_${mermaidCounter++}%%`;
    mermaidItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  // 2. Extract non-mermaid fenced code blocks (they may contain $ chars)
  const codeBlockRegex = /```[a-zA-Z0-9_+-]*\r?\n[\s\S]*?\r?\n```/g;
  const codeBlockItems: ProtectedItem[] = [];
  let codeBlockCounter = 0;
  let afterCodeBlocks = afterMermaid.replace(codeBlockRegex, (match: string) => {
    if (match.startsWith("```mermaid")) {
      return match;
    }
    const placeholder = `%%CODE_BLOCK_${codeBlockCounter++}%%`;
    codeBlockItems.push({ placeholder, original: match });
    return placeholder;
  });

  // 3. Extract inline code spans (they may contain $ chars)
  const inlineCodeRegex = /`[^`\r\n]+`/g;
  const inlineCodeItems: ProtectedItem[] = [];
  let inlineCodeCounter = 0;
  let afterInlineCode = afterCodeBlocks.replace(inlineCodeRegex, (match: string) => {
    const placeholder = `%%INLINE_CODE_${inlineCodeCounter++}%%`;
    inlineCodeItems.push({ placeholder, original: match });
    return placeholder;
  });

  // 4. Extract block math next
  const blockMathRegex = /\$\$\r?\n?([\s\S]*?)\r?\n?\$\$/g;
  const blockMathItems: ImageItem[] = [];
  let blockMathCounter = 0;
  let afterBlockMath = afterInlineCode.replace(blockMathRegex, (_match, content: string) => {
    const placeholder = `%%MATH_BLOCK_${blockMathCounter++}%%`;
    blockMathItems.push({ placeholder, original: content, dataUrl: "", success: false });
    return placeholder;
  });

  // 5. Extract inline math last — must NOT cross line boundaries
  const inlineMathRegex = /\$([^\s$](?:[^\r\n$]*?[^\s$])?)\$/g;
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
    // 6a. Render mermaid sequentially — mermaid uses mutable global config,
    //    so parallel renders would race and corrupt each other's output.
    for (const item of mermaidItems) {
      try {
        item.dataUrl = await renderMermaidToPng(item.original);
        item.success = true;
      } catch (e) {
        console.error("Mermaid render failed:", e);
      }
    }

    // 6b. Render math in parallel — KaTeX is stateless per-call.
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

  // 7. Reconstruct markdown
  let result = afterInlineMath;
  for (const item of [...mermaidItems, ...blockMathItems, ...inlineMathItems]) {
    if (item.success) {
      result = result.replaceAll(item.placeholder, () => `![rendered](${item.dataUrl})`);
    } else {
      // Restore original syntax
      if (item.placeholder.startsWith("%%MERMAID_")) {
        result = result.replaceAll(item.placeholder, () => `\`\`\`mermaid\n${item.original}\`\`\``);
      } else if (item.placeholder.startsWith("%%MATH_BLOCK_")) {
        result = result.replaceAll(item.placeholder, () => `$$${item.original}$$`);
      } else {
        result = result.replaceAll(item.placeholder, () => `$${item.original}$`);
      }
    }
  }

  // Restore inline code and code blocks
  for (const item of inlineCodeItems) {
    result = result.replaceAll(item.placeholder, () => item.original);
  }
  for (const item of codeBlockItems) {
    result = result.replaceAll(item.placeholder, () => item.original);
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

async function renderMermaidToPng(content: string): Promise<string> {
  // Save current theme and force light theme for the DOCX export.
  // setConfig() does NOT re-initialize theme CSS; initialize() does.
  const currentTheme = mermaid.mermaidAPI.getConfig().theme;
  mermaid.initialize({ startOnLoad: false, theme: "default" });

  const id = "mermaid-export-" + Math.random().toString(36).substring(2, 11);
  const { svg } = await mermaid.render(id, content);

  // Restore the original theme immediately after render.
  mermaid.initialize({ startOnLoad: false, theme: currentTheme });

  // Sanitize the SVG to remove external font/URL references
  const cleanedSvg = sanitizeMermaidSvg(svg);

  // Parse the SVG and temporarily mount it so we can call getBBox()
  // to tighten the viewBox (removes excess empty canvas space).
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedSvg, "image/svg+xml");
  const svgEl = doc.documentElement as unknown as SVGSVGElement;

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
  document.body.appendChild(tempDiv);
  tempDiv.appendChild(svgEl);

  let width = 0;
  let height = 0;
  try {
    const bbox = svgEl.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      const pad = 16;
      const vx = Math.max(0, bbox.x - pad);
      const vy = Math.max(0, bbox.y - pad);
      const vw = bbox.width + pad * 2;
      const vh = bbox.height + pad * 2;
      svgEl.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);
      width = vw;
      height = vh;
    }
  } catch (e) {
    console.warn("getBBox failed for export SVG", e);
  }
  document.body.removeChild(tempDiv);

  if (!width || !height) {
    const viewBox = svgEl.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
    if (!width || !height) {
      width = parseFloat(svgEl.getAttribute("width") || "0");
      height = parseFloat(svgEl.getAttribute("height") || "0");
    }
    width = width || 600;
    height = height || 400;
  }

  // Serialize the tightened SVG and load it as an image
  const tightenedSvg = new XMLSerializer().serializeToString(svgEl);
  const base64 = btoa(unescape(encodeURIComponent(tightenedSvg)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image failed to load"));
    image.src = dataUrl;
  });

  // Draw directly to canvas — no html-to-image wrapper sizing issues.
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
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
