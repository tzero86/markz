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
    hljs.highlightElement(el);
  });
}
