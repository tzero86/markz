import { writable, derived, get } from "svelte/store";

export type Theme = "light" | "dark" | "system";
export type ThemePreset =
  | "default"
  | "nord"
  | "dracula"
  | "tokyo-night"
  | "gruvbox-dark"
  | "gruvbox-light"
  | "solarized-dark"
  | "solarized-light"
  | "high-contrast";

export const PRESET_OPTIONS: { value: ThemePreset; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "nord", label: "Nord" },
  { value: "dracula", label: "Dracula" },
  { value: "tokyo-night", label: "Tokyo Night" },
  { value: "gruvbox-dark", label: "Gruvbox Dark" },
  { value: "gruvbox-light", label: "Gruvbox Light" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "high-contrast", label: "High Contrast" },
];

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  const resolved = resolveTheme(theme);
  html.setAttribute("data-theme", resolved);
  html.style.colorScheme = resolved;
}

function applyPreset(preset: ThemePreset | string) {
  const html = document.documentElement;
  if (!preset || preset === "default") {
    html.removeAttribute("data-theme-preset");
  } else {
    html.setAttribute("data-theme-preset", preset);
  }
}

const stored =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("markz-theme") as Theme | null)
    : null;

const storedPreset =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("markz-theme-preset") as ThemePreset | null)
    : null;

const themeWritable = writable<Theme>(stored || "dark");
const presetWritable = writable<ThemePreset>(storedPreset || "default");

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

export const presetStore = {
  subscribe: presetWritable.subscribe,
  set: (preset: ThemePreset) => {
    presetWritable.set(preset);
    applyPreset(preset);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("markz-theme-preset", preset);
    }
  },
  clear: () => {
    presetStore.set("default");
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

export const activePreset = derived(presetWritable, ($preset) => $preset);

// Apply initial theme + preset
applyTheme(get(themeWritable));
applyPreset(get(presetWritable));

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

