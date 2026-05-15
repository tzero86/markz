import { writable, derived, get } from "svelte/store";

export type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  html.style.colorScheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
}

const stored =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("markz-theme") as Theme | null)
    : null;

const themeWritable = writable<Theme>(stored || "dark");

export const themeStore = {
  subscribe: themeWritable.subscribe,
  set: (theme: Theme) => {
    themeWritable.set(theme);
    applyTheme(theme);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("markz-theme", theme);
    }
  },
  cycle: () => {
    const current = get(themeWritable);
    const next: Theme =
      current === "system" ? "light" : current === "light" ? "dark" : "system";
    themeStore.set(next);
  },
};

export const resolvedTheme = derived(themeWritable, ($theme) => {
  if ($theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return $theme;
});

// Apply initial theme
applyTheme(get(themeWritable));

// Listen for system changes
if (typeof window !== "undefined") {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", () => {
    const current = get(themeWritable);
    if (current === "system") {
      applyTheme("system");
    }
  });
}
