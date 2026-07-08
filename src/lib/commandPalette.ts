/**
 * Command Palette — fuzzy search over commands and files.
 *
 * Two entry points:
 *   Ctrl+Shift+P  → command mode (actions)
 *   Ctrl+P        → file mode (recent + workspace files)
 */

import { get } from "svelte/store";
import { tabStore, type Tab } from "./tabStore";
import { workspaceStore, type FileTreeNode } from "./workspaceStore";

export interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  icon?: string;
  category?: string;
  action: () => void | Promise<void>;
}

export type PaletteMode = "commands" | "files";

const FRECENCY_KEY = "markz:command-frecency";

function loadFrecency(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FRECENCY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFrecency(map: Record<string, number>) {
  try {
    localStorage.setItem(FRECENCY_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

let frecencyMap = loadFrecency();

export function recordCommandUse(id: string) {
  frecencyMap[id] = (frecencyMap[id] ?? 0) + 1;
  saveFrecency(frecencyMap);
}

export function getCommandFrecency(id: string): number {
  return frecencyMap[id] ?? 0;
}

function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let qi = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      if (lastMatch !== -1 && ti === lastMatch + 1) score += 0.5; // consecutive bonus
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "/" || t[ti - 1] === "\\") {
        score += 0.3; // word-start bonus
      }
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < q.length) return 0; // not all chars matched
  // Penalize length difference
  score -= (t.length - q.length) * 0.01;
  return Math.max(0, score);
}

function collectFiles(nodes: FileTreeNode[]): FileTreeNode[] {
  const out: FileTreeNode[] = [];
  for (const n of nodes) {
    if (n.is_dir && n.children) {
      out.push(...collectFiles(n.children));
    } else {
      out.push(n);
    }
  }
  return out;
}

// ---- Command registry ----

let commandRegistry: PaletteItem[] = [];

export function registerCommandPalette(items: PaletteItem[]) {
  commandRegistry = items;
}

export function getCommandItems(): PaletteItem[] {
  return commandRegistry;
}

// Category ordering for command mode when no query is entered.
const CATEGORY_ORDER = ["File", "View", "Export", "Tools"];

function categoryPriority(category?: string): number {
  const idx = CATEGORY_ORDER.indexOf(category ?? "");
  return idx === -1 ? 999 : idx;
}

function sortByFrecencyThenLabel(a: PaletteItem, b: PaletteItem): number {
  const fa = getCommandFrecency(a.id);
  const fb = getCommandFrecency(b.id);
  if (fb !== fa) return fb - fa;
  return a.label.localeCompare(b.label);
}

// ---- Search ----

export function searchPalette(query: string, mode: PaletteMode): PaletteItem[] {
  if (mode === "commands") {
    let items = commandRegistry;
    if (!query) {
      return items
        .slice()
        .sort((a, b) => {
          const pa = categoryPriority(a.category);
          const pb = categoryPriority(b.category);
          if (pa !== pb) return pa - pb;
          return sortByFrecencyThenLabel(a, b);
        });
    }
    return items
      .map((item) => {
        const base = fuzzyScore(query, item.label + " " + (item.detail || ""));
        return {
          item,
          score: base > 0 ? base + getCommandFrecency(item.id) * 0.05 : 0,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }

  // files mode
  const tabs = get(tabStore).tabs;
  const ws = get(workspaceStore);

  const seen = new Set<string>();
  const items: PaletteItem[] = [];

  // 1. Recent tabs (file-backed, most recent first)
  for (const tab of tabs.slice().reverse()) {
    if (tab.path && !seen.has(tab.path)) {
      seen.add(tab.path);
      items.push({
        id: `recent-${tab.path}`,
        label: tab.title,
        detail: tab.path,
        icon: "file",
        category: "Recent",
        action: () => {
          const existing = get(tabStore).tabs.find((t) => t.path === tab.path);
          if (existing) {
            tabStore.switchTab(existing.id);
          } else {
            tabStore.newTab("", tab.title, tab.path);
          }
        },
      });
    }
  }

  // 2. Workspace files
  if (ws.fileTree.length > 0) {
    const files = collectFiles(ws.fileTree);
    for (const f of files) {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        items.push({
          id: `ws-${f.path}`,
          label: f.name,
          detail: f.rel_path,
          icon: "file",
          category: "Workspace",
          action: () => {
            const existing = get(tabStore).tabs.find((t) => t.path === f.path);
            if (existing) {
              tabStore.switchTab(existing.id);
            } else {
              tabStore.newTab("", f.name, f.path);
            }
          },
        });
      }
    }
  }

  if (!query) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(query, item.label + " " + (item.detail || "")) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
