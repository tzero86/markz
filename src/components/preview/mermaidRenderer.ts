import mermaid from "mermaid";

let initialized = false;
let currentMermaidTheme: "dark" | "default" = "dark";

function getMermaidTheme(theme: "light" | "dark"): "dark" | "default" {
  return theme === "dark" ? "dark" : "default";
}

export async function renderMermaidBlocks(container: HTMLElement) {
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false, theme: currentMermaidTheme });
    initialized = true;
  }

  const blocks = container.querySelectorAll("pre code.language-mermaid");
  for (const block of blocks) {
    const pre = block.parentElement;
    if (!pre) continue;
    const code = block.textContent || "";
    const id = "mermaid-" + Math.random().toString(36).substring(2, 11);
    try {
      const { svg } = await mermaid.render(id, code);
      const div = document.createElement("div");
      div.className = "mermaid-diagram";
      div.setAttribute("data-source", code);
      div.innerHTML = svg;
      pre.replaceWith(div);
    } catch (e) {
      console.error("Mermaid render failed:", e);
    }
  }
}

/**
 * Re-render all existing mermaid diagrams in the container.
 * Used when zoom changes so diagrams scale with the preview font-size.
 */
export async function rerenderMermaidBlocks(container: HTMLElement) {
  const diagrams = container.querySelectorAll(".mermaid-diagram");
  if (diagrams.length === 0) return;

  for (const div of diagrams) {
    const code = div.getAttribute("data-source") || "";
    if (!code) continue;
    const id = "mermaid-" + Math.random().toString(36).substring(2, 11);
    try {
      const { svg } = await mermaid.render(id, code);
      div.innerHTML = svg;
    } catch (e) {
      console.error("Mermaid re-render failed:", e);
    }
  }
}

export async function setMermaidTheme(
  theme: "light" | "dark",
  container: HTMLElement
) {
  const newTheme = getMermaidTheme(theme);
  if (currentMermaidTheme === newTheme) return;
  currentMermaidTheme = newTheme;

  mermaid.initialize({ startOnLoad: false, theme: newTheme });

  const diagrams = container.querySelectorAll(".mermaid-diagram");
  for (const div of diagrams) {
    const code = div.getAttribute("data-source") || "";
    if (!code) continue;
    const id = "mermaid-" + Math.random().toString(36).substring(2, 11);
    try {
      const { svg } = await mermaid.render(id, code);
      div.innerHTML = svg;
    } catch (e) {
      console.error("Mermaid re-render failed:", e);
    }
  }
}
