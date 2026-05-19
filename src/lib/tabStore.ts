import { writable, get } from "svelte/store";
import { documentStore, type DocumentState } from "./documentStore";
import { confirm } from "@tauri-apps/plugin-dialog";

export interface Tab {
  id: string;
  content: string;
  path: string | null;
  title: string;
  isDirty: boolean;
  isLoading: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
}

let nextTabId = 1;
function genId() {
  return `tab-${nextTabId++}`;
}

function makeDefaultTab(): Tab {
  const content = [
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
    "### Special Characters & Escapes",
    "- Asterisk: \\*not italic\\*",
    "- Hash: \\# not heading",
    "- Backtick: \\`not code\\`",
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

  return {
    id: genId(),
    content,
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

  let syncing = false;

  // Sync documentStore changes back to active tab
  const unsub = documentStore.subscribe((doc) => {
    if (syncing) return;
    update((state) => {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      if (idx === -1) return state;
      const tab = state.tabs[idx];
      if (
        tab.content === doc.content &&
        tab.path === doc.path &&
        tab.title === doc.title &&
        tab.isDirty === doc.isDirty &&
        tab.isLoading === doc.isLoading
      ) {
        return state;
      }
      const newTabs = [...state.tabs];
      newTabs[idx] = { ...tab, ...doc };
      return { ...state, tabs: newTabs };
    });
  });

  function syncToDocument(tab: Tab) {
    syncing = true;
    documentStore.setState({
      content: tab.content,
      path: tab.path,
      title: tab.title,
      isDirty: tab.isDirty,
      isLoading: tab.isLoading,
    });
    syncing = false;
  }

  function newTab(content?: string, title?: string, path?: string | null) {
    const tab: Tab = {
      id: genId(),
      content: content ?? "",
      path: path ?? null,
      title:
        title ??
        (path ? path.split(/[\\/]/).pop() || "Untitled" : "Untitled"),
      isDirty: content ? true : false,
      isLoading: false,
    };
    update((state) => {
      const newTabs = [...state.tabs, tab];
      return { tabs: newTabs, activeTabId: tab.id };
    });
    syncToDocument(tab);
    return tab.id;
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
        const fresh = makeDefaultTab();
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      if (!isActive) {
        return { ...s, tabs: newTabs };
      }
      return { tabs: newTabs, activeTabId: newTabs[0].id };
    });

    if (isActive) {
      const newState = get({ subscribe });
      const activeTab = newState.tabs.find(
        (t) => t.id === newState.activeTabId
      );
      if (activeTab) {
        syncToDocument(activeTab);
      }
    }

    return true;
  }

  function switchTab(id: string) {
    let tabToSync: Tab | null = null;

    update((state) => {
      if (state.activeTabId === id) return state;
      const currentIdx = state.tabs.findIndex(
        (t) => t.id === state.activeTabId
      );
      const newIdx = state.tabs.findIndex((t) => t.id === id);
      if (newIdx === -1) return state;

      // Save current documentStore state into the old tab
      const currentDoc = get(documentStore);
      const newTabs = [...state.tabs];
      if (currentIdx !== -1) {
        newTabs[currentIdx] = {
          ...newTabs[currentIdx],
          content: currentDoc.content,
          path: currentDoc.path,
          title: currentDoc.title,
          isDirty: currentDoc.isDirty,
          isLoading: currentDoc.isLoading,
        };
      }

      tabToSync = newTabs[newIdx];
      return { tabs: newTabs, activeTabId: id };
    });

    if (tabToSync) {
      syncToDocument(tabToSync);
    }
  }

  function getActiveTab(): Tab | null {
    const state = get({ subscribe });
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  }

  function hasDirtyTabs(): boolean {
    const state = get({ subscribe });
    return state.tabs.some((t) => t.isDirty);
  }

  return {
    subscribe,
    newTab,
    closeTab,
    switchTab,
    getActiveTab,
    hasDirtyTabs,
  };
}

export const tabStore = createTabStore();
