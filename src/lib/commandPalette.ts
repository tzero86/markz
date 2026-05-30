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
  action: () => void | Promise<void>;
}

export type PaletteMode = "commands" | "files";

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

// ---- Search ----

export function searchPalette(query: string, mode: PaletteMode): PaletteItem[] {
  if (mode === "commands") {
    const items = commandRegistry;
    if (!query) return items;
    return items
      .map((item) => ({ item, score: fuzzyScore(query, item.label + " " + (item.detail || "")) }))
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
