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
  return {
    id: genId(),
    content: `# Welcome to MarkZ

Start writing your Markdown here...

## Features

- **Live preview** as you type
- **Syntax highlighting** for 30+ languages
- **Image support** via paste or drag-and-drop
- **Export** to JIRA, Confluence, Slack, GitHub
`,
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

  // Push initial tab into documentStore
  documentStore.setState({
    content: defaultTab.content,
    path: defaultTab.path,
    title: defaultTab.title,
    isDirty: defaultTab.isDirty,
    isLoading: defaultTab.isLoading,
  });

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
        syncToDocument(fresh);
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      if (!isActive) {
        return { ...s, tabs: newTabs };
      }
      const newActiveId = newTabs[0].id;
      syncToDocument(newTabs[0]);
      return { tabs: newTabs, activeTabId: newActiveId };
    });
    return true;
  }

  function switchTab(id: string) {
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

      syncToDocument(newTabs[newIdx]);
      return { tabs: newTabs, activeTabId: id };
    });
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
