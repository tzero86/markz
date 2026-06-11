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

export interface PresetOption {
  value: ThemePreset;
  label: string;
  preview: string[]; // 4 hex colors: bg, accent, keyword, string
}

export const PRESET_OPTIONS: PresetOption[] = [
  { value: "default", label: "Default", preview: ["#0d0d0d", "#0d8a5d", "#4ec9b0", "#ce9178"] },
  { value: "nord", label: "Nord", preview: ["#2E3440", "#88C0D0", "#81A1C1", "#A3BE8C"] },
  { value: "dracula", label: "Dracula", preview: ["#282A36", "#BD93F9", "#FF79C6", "#F1FA8C"] },
  { value: "tokyo-night", label: "Tokyo Night", preview: ["#1A1B26", "#7AA2F7", "#BB9AF7", "#9ECE6A"] },
  { value: "gruvbox-dark", label: "Gruvbox Dark", preview: ["#282828", "#D79921", "#FB4934", "#B8BB26"] },
  { value: "gruvbox-light", label: "Gruvbox Light", preview: ["#FBF1C7", "#9D0006", "#859900", "#2AA198"] },
  { value: "solarized-dark", label: "Solarized Dark", preview: ["#002B36", "#268BD2", "#859900", "#2AA198"] },
  { value: "solarized-light", label: "Solarized Light", preview: ["#FDF6E3", "#268BD2", "#859900", "#2AA198"] },
  { value: "high-contrast", label: "High Contrast", preview: ["#000000", "#FFFF00", "#FFFF00", "#00FFFF"] },
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

