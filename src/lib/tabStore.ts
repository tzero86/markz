import { writable, get, derived } from "svelte/store";
import { confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { saveSession, type SessionTab } from "./sessionStore";
import { workspaceStore } from "./workspaceStore";
import { debugLogStore } from "./debugLogStore";
export interface Tab {
  id: string;
  content: string;
  path: string | null;
  title: string;
  isDirty: boolean;
  isLoading: boolean;
  pinned?: boolean;
  /** 1-based line numbers where manual slide breaks are set. */
  slideBreaks?: number[];
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
}

let nextTabId = 1;
function genId() {
  return `tab-${nextTabId++}`;
}

const defaultContent = [
  "# Welcome to MarkZ",
  "",
  "> **The engineer's Markdown editor.** Built for speed, designed for clarity, and optimized for the tools you already use.",
  "",
  "MarkZ is a dual-pane Markdown editor that helps you write, preview, and export engineering documents without friction. Whether you're drafting RFCs, documenting APIs, or preparing content for JIRA and Confluence, MarkZ keeps you in flow.",
  "",
  "---",
  "",
  "## What Makes MarkZ Different",
  "",
  "| Feature | Description |",
  "|---------|-------------|",
  "| **Live Preview** | See your document render instantly as you type |",
  "| **Export Pipeline** | One-click export to JIRA, Confluence, Slack, GitHub, and DOCX |",
  "| **Image Handling** | Paste from clipboard or drag-and-drop — images are organized automatically |",
  "| **Syntax Highlighting** | 30+ languages with tree-sitter accuracy |",
  "| **Math & Diagrams** | KaTeX for equations, Mermaid for flowcharts |",
  "| **Templates** | Built-in RFC, ADR, Bug Report, and more |",
  "",
  "---",
  "",
  "## Quick Start",
  "",
  "### 1. Write Markdown",
  "MarkZ supports standard CommonMark plus extensions:",
  "",
  "**Formatting:** *italic*, **bold**, `inline code`, ~~strikethrough~~",
  "",
  "**Lists:**",
  "- Unordered items",
  "- [x] Completed tasks",
  "- [ ] Pending tasks",
  "",
  "**Code blocks** with syntax highlighting:",
  "```rust",
  'fn main() {',
  '    println!("Hello, MarkZ!");',
  '}',
  "```",
  "",
  "### 2. Preview Your Work",
  "The right pane renders your document in real time. Toggle between **HTML**, **JIRA**, **Confluence**, **Slack**, and **GitHub** preview modes to see exactly how your content will look in each platform.",
  "",
  "### 3. Export Cleanly",
  'MarkZ exports **only what you write** — no watermarks, no "created with" banners, no unwanted metadata. Your content stays yours.',
  "",
  "---",
  "",
  "## Keyboard Shortcuts",
  "",
  "| Shortcut | Action |",
  "|----------|--------|",
  "| `Ctrl + S` | Save document |",
  "| `Ctrl + O` | Open file |",
  "| `Ctrl + T` | New tab |",
  "| `Ctrl + W` | Close tab |",
  "| `Ctrl + B` | Toggle outline sidebar |",
  "| `Ctrl + =` | Zoom in |",
  "| `Ctrl + -` | Zoom out |",
  "| `Ctrl + 0` | Reset zoom |",
  "",
  "---",
  "",
  "## Formatting Reference",
  "",
  "This section exercises every formatting feature MarkZ supports.",
  "",
  "### Headings",
  "# Heading 1",
  "## Heading 2",
  "### Heading 3",
  "#### Heading 4",
  "##### Heading 5",
  "###### Heading 6",
  "",
  "### Inline Formatting",
  "Normal text, **bold text**, *italic text*, ~~strikethrough~~, and `inline code`.",
  "",
  "Combined: ***bold italic***, **`bold code`**, *`italic code`**.",
  "",
  "[External link to example.com](https://example.com)",
  "",
  "### Code Blocks",
  "",
  "#### Rust",
  "```rust",
  'fn main() {',
  '    let message = "Hello, MarkZ!";',
  '    println!("{}", message);',
  '}',
  "```",
  "",
  "#### Python",
  "```python",
  "def fibonacci(n):",
  "    a, b = 0, 1",
  "    for _ in range(n):",
  "        yield a",
  "        a, b = b, a + b",
  "",
  "print(list(fibonacci(10)))",
  "```",
  "",
  "#### JSON",
  "```json",
  '{',
  '  "name": "MarkZ",',
  '  "version": "0.1.0",',
  '  "features": ["preview", "export", "templates"]',
  '}',
  "```",
  "",
  "### Blockquotes",
  "> Single-level blockquote with **bold** and `code`.",
  "",
  "> Multi-paragraph blockquote.",
  ">",
  "> Second paragraph with a [link](https://example.com).",
  "",
  "> > Nested blockquote level 2",
  "> >",
  "> > > Nested blockquote level 3",
  "",
  "### Lists",
  "",
  "#### Unordered",
  "- First item",
  "- Second item",
  "  - Nested item A",
  "  - Nested item B",
  "    - Deep nested item",
  "- Third item",
  "",
  "#### Ordered",
  "1. First step",
  "2. Second step",
  "   1. Sub-step A",
  "   2. Sub-step B",
  "3. Third step",
  "",
  "#### Task List",
  "- [x] Completed task",
  "- [ ] Pending task",
  "- [ ] Another pending task",
  "  - [x] Sub-task done",
  "  - [ ] Sub-task waiting",
  "",
  "#### Mixed",
  "1. Ordered first",
  "   - Unordered nested",
  "   - Another nested",
  "2. Ordered second",
  "   1. Ordered nested",
  "   2. Another nested",
  "",
  "### Tables",
  "",
  "#### Simple Table",
  "| Feature | Status | Notes |",
  "|---------|--------|-------|",
  "| Headings | ✅ | All 6 levels |",
  "| Bold/Italic | ✅ | Combined styles |",
  "| Code Blocks | ✅ | Syntax highlighting |",
  "| Tables | ✅ | This one! |",
  "| Images | ✅ | Local & remote |",
  "",
  "#### Alignment Table",
  "| Left | Center | Right |",
  "|:-----|:------:|------:|",
  "| L1   | C1     | R1    |",
  "| L2   | C2     | R2    |",
  "| L3   | C3     | R3    |",
  "",
  "### Horizontal Rules",
  "Above rule.",
  "",
  "---",
  "",
  "Below rule with **bold** text.",
  "",
  "***",
  "",
  "Another rule.",
  "",
  "### Images",
  "",
  "#### Remote Images",
  "MarkZ renders remote images directly in the preview. These samples use free placeholder photos:",
  "",
  "![Remote landscape photo](https://picsum.photos/seed/markz1/600/300)",
  "",
  "![Remote portrait photo](https://picsum.photos/seed/markz2/300/400)",
  "",
  "![Remote square photo](https://picsum.photos/seed/markz3/400/400)",
  "",
  "> 💡 **Tip:** Toggle *Settings → Embed remote images* to download these into exports.",
  "",
  "### Special Characters & Escapes",
  "- Asterisk: \\*not italic\\*",
  "- Hash: \\# not heading",
  "- Backtick: \\`not code\\*",
  "- Ampersand: AT&T",
  "- Less/Greater: 5 < 10 > 2",
  "- Emoji: 🚀 ✅ ❌ 💡",
  "",
  "---",
  "",
  "## Math",
  "",
  "Inline math: $E = mc^2$ and $\\vec{F} = m\\vec{a}$",
  "",
  "Block math:",
  "$$",
  "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
  "$$",
  "",
  "Matrix:",
  "$$",
  "\\begin{bmatrix}",
  "a & b \\\\",
  "c & d",
  "\\end{bmatrix}^{-1}",
  "=",
  "\\frac{1}{ad-bc}",
  "\\begin{bmatrix}",
  "d & -b \\\\",
  "-c & a",
  "\\end{bmatrix}",
  "$$",
  "",
  "---",
  "",
  "## Mermaid Diagram",
  "",
  "```mermaid",
  "graph TD",
  "    A[Markdown Editor] --> B[Parser]",
  "    B --> C[AST]",
  "    C --> D[HTML Renderer]",
  "    C --> E[DOCX Converter]",
  "    C --> F[JIRA Converter]",
  "    D --> G[Preview Pane]",
  "    E --> H[File Export]",
  "    F --> I[Clipboard]",
  "```",
  "",
  "---",
  "",
  "## HTML Details (if supported)",
  "",
  "<details>",
  "<summary>Click to expand</summary>",
  "",
  "Hidden content inside a details block.",
  "",
  "</details>",
  "",
  "---",
  "",
  "*Welcome to MarkZ*",
].join("\n");
function makeEmptyTab(): Tab {
  return {
    id: genId(),
    content: "",
    path: null,
    title: "Untitled",
    isDirty: false,
    isLoading: false,
  };
}
function makeDefaultTab(): Tab {
  return {
    id: genId(),
    content: defaultContent,
    path: null,
    title: "Untitled",
    isDirty: false,
    isLoading: false,
  };
}
function createTabStore() {
  const defaultTab = makeDefaultTab();
  const { subscribe, set, update } = writable<TabState>({
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
  });

  function getActiveTab(): Tab | null {
    const state = get({ subscribe });
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  }

  function hasDirtyTabs(): boolean {
    const state = get({ subscribe });
    return state.tabs.some((t) => t.isDirty);
  }

  // --- Auto-save ---
  let autoSaveEnabled = false;
  let autoSaveIntervalMs = 30000;
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Session restore ---
  // While restoring a session we create many tabs in quick succession.
  // Skip the per-tab session persistence and let restoreSession persist once
  // at the end. This avoids N redundant disk writes during startup.
  let suppressPersist = false;

  // --- Recently saved tracking (to ignore self-triggered file-watch events) ---
  const recentlySavedPaths = new Set<string>();

  function addRecentlySaved(path: string) {
    recentlySavedPaths.add(path);
    setTimeout(() => recentlySavedPaths.delete(path), 2000);
  }

  function isRecentlySaved(path: string): boolean {
    return recentlySavedPaths.has(path);
  }

  function setAutoSave(enabled: boolean, intervalSeconds: number) {
    autoSaveEnabled = enabled;
    autoSaveIntervalMs = Math.max(intervalSeconds, 1) * 1000;
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  async function triggerAutoSave() {
    if (!autoSaveEnabled) return;
    const doc = getActiveTab();
    if (!doc || !doc.isDirty || !doc.path) return;
    addRecentlySaved(doc.path);
    try {
      await invoke("save_document", { path: doc.path, content: doc.content });
      markClean();
      autoSaveFlash.set(true);
      setTimeout(() => autoSaveFlash.set(false), 800);
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    if (!autoSaveEnabled) return;
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      triggerAutoSave();
    }, autoSaveIntervalMs);
  }
  function persistSession() {
    const state = get({ subscribe });
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    const sessionTabs: SessionTab[] = state.tabs.map((t) => ({
      content: t.content,
      path: t.path,
      title: t.title,
      isDirty: t.isDirty,
      pinned: t.pinned,
      slide_breaks: t.slideBreaks,
    }));
    const ws = get(workspaceStore);
    saveSession(sessionTabs, activeTab?.path ?? null, ws.rootPath);
  }

  function setContent(content: string) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], content, isDirty: true };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
    scheduleAutoSave();
  }

  function loadDocument(content: string, path: string) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = {
        ...newTabs[idx],
        content,
        path,
        title: path.split(/[\\/]/).pop() || "Untitled",
        isDirty: false,
        isLoading: false,
      };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  function setPath(path: string | null) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = {
        ...newTabs[idx],
        path,
        title: path ? path.split(/[\\/]/).pop() || "Untitled" : "Untitled",
      };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  function renameTabPath(oldPath: string, newPath: string) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.path === oldPath);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = {
        ...newTabs[idx],
        path: newPath,
        title: newPath.split(/[\\/]/).pop() || "Untitled",
      };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  function closeTabByPath(path: string) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.path === path);
      if (idx === -1) return state;
      const tab = state.tabs[idx];
      const newTabs = state.tabs.filter((t) => t.id !== tab.id);
      let activeTabId = state.activeTabId;
      if (activeTabId === tab.id) {
        activeTabId = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? "";
      }
      return { ...state, tabs: newTabs, activeTabId };
    });
    if (!suppressPersist) persistSession();
  }

  function markClean() {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], isDirty: false };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  function markDirty() {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], isDirty: true };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }
  function setSlideBreaks(lines: number[]) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], slideBreaks: [...lines].sort((a, b) => a - b) };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  function setLoading(loading: boolean) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], isLoading: loading };
      return { ...state, tabs: newTabs };
    });
  }

  // --- Tab lifecycle ---

  function newTab(content?: string, title?: string, path?: string | null) {
    const tab: Tab = {
      id: genId(),
      content: content ?? "",
      path: path ?? null,
      title:
        title ??
        (path ? path.split(/[\\/]/).pop() || "Untitled" : "Untitled"),
      isDirty: false,
      isLoading: false,
      pinned: false,
    };
    update((state) => {
      const newTabs = [...state.tabs, tab];
      return { tabs: newTabs, activeTabId: tab.id };
    });
    if (!suppressPersist) persistSession();
    return tab.id;
  }

  function togglePin(id: string) {
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return state;
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...newTabs[idx], pinned: !newTabs[idx].pinned };
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  async function maybeCloseWorkspace() {
    const state = get({ subscribe });
    const hasFileTabs = state.tabs.some((t) => t.path);
    if (!hasFileTabs && get(workspaceStore).rootPath) {
      await workspaceStore.closeWorkspace();
    }
  }

  async function closeTab(id: string): Promise<boolean> {
    const state = get({ subscribe });
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return true;

    if (tab.isDirty) {
      const proceed = await confirm(
        `"${tab.title}" has unsaved changes. Close without saving?`,
        { title: "Unsaved Changes", kind: "warning" }
      );
      if (!proceed) return false;
    }

    const isActive = state.activeTabId === id;
    update((s) => {
      const newTabs = s.tabs.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        const fresh = makeEmptyTab();
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      if (!isActive) {
        return { ...s, tabs: newTabs };
      }
      return { tabs: newTabs, activeTabId: newTabs[0].id };
    });

    await maybeCloseWorkspace();
    if (!suppressPersist) persistSession();
    return true;
  }
  async function closeAllExcept(keepId: string): Promise<void> {
    const state = get({ subscribe });
    const toClose = state.tabs.filter((t) => t.id !== keepId && !t.pinned);
    for (const tab of toClose) {
      if (tab.isDirty) {
        const proceed = await confirm(
          `"${tab.title}" has unsaved changes. Close without saving?`,
          { title: "Unsaved Changes", kind: "warning" }
        );
        if (!proceed) continue;
      }
    }
    update((s) => {
      const keepTab = s.tabs.find((t) => t.id === keepId);
      const pinned = s.tabs.filter((t) => t.pinned && t.id !== keepId);
      if (!keepTab) return { ...s, tabs: pinned, activeTabId: pinned[0]?.id ?? s.activeTabId };
      return { tabs: [keepTab, ...pinned], activeTabId: keepTab.id };
    });

    await maybeCloseWorkspace();
    if (!suppressPersist) persistSession();
  }
  async function closeAll(): Promise<void> {
    const state = get({ subscribe });
    const toClose = state.tabs.filter((t) => !t.pinned);
    for (const tab of toClose) {
      if (tab.isDirty) {
        const proceed = await confirm(
          `"${tab.title}" has unsaved changes. Close without saving?`,
          { title: "Unsaved Changes", kind: "warning" }
        );
        if (!proceed) return;
      }
    }
    update((s) => {
      const pinned = s.tabs.filter((t) => t.pinned);
      if (pinned.length === 0) {
        const fresh = makeEmptyTab();
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      return { tabs: pinned, activeTabId: pinned[0].id };
    });

    await maybeCloseWorkspace();
    if (!suppressPersist) persistSession();
  }
  function switchTab(id: string) {
    update((state) => {
      if (state.activeTabId === id) return state;
      const newIdx = state.tabs.findIndex((t) => t.id === id);
      if (newIdx === -1) return state;
      return { ...state, activeTabId: id };
    });
    if (!suppressPersist) persistSession();
  }

  function moveTab(fromIndex: number, toIndex: number) {
    update((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex < 0 ||
        toIndex >= state.tabs.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { ...state, tabs: newTabs };
    });
    if (!suppressPersist) persistSession();
  }

  async function restoreSession(
    readFile: (path: string) => Promise<{ content: string; path: string }>,
    setActivePath: string | null = null
  ): Promise<boolean> {
    const t0 = performance.now();
    const { getSession } = await import("./sessionStore");
    const session = await getSession();
    const t1 = performance.now();
    debugLogStore.add("info", "startup", `load_session took ${(t1 - t0).toFixed(1)}ms`);
    if (!session || session.tabs.length === 0) return false;

    suppressPersist = true;
    set({ tabs: [], activeTabId: "" });

    const seenPaths = new Set<string>();
    const breaksByPath = new Map<string, number[]>();
    for (const tab of session.tabs) {
      if (tab.path && tab.slide_breaks) {
        breaksByPath.set(tab.path, tab.slide_breaks);
      }
    }

    // Read all file-backed tabs in parallel instead of sequentially.
    const filePaths: string[] = [];
    for (const tab of session.tabs) {
      if (tab.path && !seenPaths.has(tab.path)) {
        seenPaths.add(tab.path);
        filePaths.push(tab.path);
      }
    }

    const t2 = performance.now();
    const fileResults = await Promise.allSettled(filePaths.map((p) => readFile(p)));
    const t3 = performance.now();
    debugLogStore.add("info", "startup", `read ${filePaths.length} restored files took ${(t3 - t2).toFixed(1)}ms`);
    const fileInfoByPath = new Map<string, { content: string; path: string }>();
    for (let i = 0; i < fileResults.length; i++) {
      const result = fileResults[i];
      if (result.status === "fulfilled") {
        fileInfoByPath.set(filePaths[i], result.value);
      }
    }

    // Build the restored tab list in one pass, then set the store once.
    // Setting once avoids N Svelte re-renders during startup.
    const restoredTabs: Tab[] = [];
    const restoredPaths = new Set<string>();
    for (const tab of session.tabs) {
      if (tab.path) {
        if (restoredPaths.has(tab.path)) continue;
        restoredPaths.add(tab.path);
        const info = fileInfoByPath.get(tab.path);
        if (!info) continue; // file no longer exists or is unreadable
        restoredTabs.push({
          id: genId(),
          content: info.content,
          path: info.path,
          title: info.path.split(/[\\/]/).pop() || "Untitled",
          isDirty: false,
          isLoading: false,
          pinned: tab.pinned ?? false,
          slideBreaks: breaksByPath.get(tab.path),
        });
      } else {
        restoredTabs.push({
          id: genId(),
          content: tab.content,
          path: null,
          title: tab.title,
          isDirty: tab.isDirty,
          isLoading: false,
          pinned: tab.pinned ?? false,
          slideBreaks: tab.slide_breaks,
        });
      }
    }

    let activeTabId = restoredTabs[restoredTabs.length - 1]?.id ?? "";
    if (setActivePath) {
      const target = restoredTabs.find((t) => t.path === setActivePath);
      if (target) activeTabId = target.id;
    }

    if (restoredTabs.length === 0) {
      const fresh = makeDefaultTab();
      set({ tabs: [fresh], activeTabId: fresh.id });
      suppressPersist = false;
      return false;
    }

    set({ tabs: restoredTabs, activeTabId });
    suppressPersist = false;
    persistSession();

    const t4 = performance.now();
    debugLogStore.add("info", "startup", `restoreSession total ${(t4 - t0).toFixed(1)}ms (${restoredTabs.length} tabs)`);
    return true;
  }

  return {
    subscribe,
    newTab,
    closeTab,
    closeAllExcept,
    closeAll,
    switchTab,
    togglePin,
    moveTab,
    getActiveTab,
    hasDirtyTabs,
    persistSession,
    restoreSession,
    setAutoSave,
    addRecentlySaved,
    isRecentlySaved,
    // Active-tab mutations
    setContent,
    loadDocument,
    setPath,
    markClean,
    markDirty,
    setLoading,
    setSlideBreaks,
    // Path-based mutations for workspace operations
    renameTabPath,
    closeTabByPath,
  };
}
export const autoSaveFlash = writable(false);

export const tabStore = createTabStore();

// Expose for e2e tests
if (typeof window !== "undefined") {
  (window as any).__markz_tabStore = tabStore;
}

// Derived store: reactive view of the active tab as a document shape.
// Components that previously subscribed to documentStore should use this instead.
export const activeDocumentStore = derived(tabStore, ($tabStore) => {
  const active = $tabStore.tabs.find((t) => t.id === $tabStore.activeTabId);
  if (active) {
    return {
      content: active.content,
      path: active.path,
      title: active.title,
      isDirty: active.isDirty,
      isLoading: active.isLoading,
      slideBreaks: active.slideBreaks,
    };
  }
  return {
    content: "",
    path: null,
    title: "Untitled",
    isDirty: false,
    isLoading: false,
    slideBreaks: undefined,
  };
});
