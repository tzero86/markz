import { writable } from "svelte/store";

export interface DocumentState {
  content: string;
  path: string | null;
  title: string;
  isDirty: boolean;
  isLoading: boolean;
}

const defaultContent = `# Welcome to MarkZ

Start writing your Markdown here...

## Features

- **Live preview** as you type
- **Syntax highlighting** for 30+ languages
- **Image support** via paste or drag-and-drop
- **Export** to JIRA, Confluence, Slack, GitHub
`;

function createDocumentStore() {
  const { subscribe, set, update } = writable<DocumentState>({
    content: defaultContent,
    path: null,
    title: "Untitled",
    isDirty: false,
    isLoading: false,
  });

  return {
    subscribe,
    setContent: (content: string) =>
      update((s) => ({ ...s, content, isDirty: true })),
    loadDocument: (content: string, path: string) =>
      update((s) => ({
        ...s,
        content,
        path,
        title: path.split(/[\\/]/).pop() || "Untitled",
        isDirty: false,
        isLoading: false,
      })),
    setPath: (path: string | null) =>
      update((s) => ({
        ...s,
        path,
        title: path ? path.split(/[\\/]/).pop() || "Untitled" : "Untitled",
      })),
    markClean: () => update((s) => ({ ...s, isDirty: false })),
    markDirty: () => update((s) => ({ ...s, isDirty: true })),
    setLoading: (loading: boolean) =>
      update((s) => ({ ...s, isLoading: loading })),
    newFromTemplate: (content: string, name: string) =>
      set({
        content,
        path: null,
        title: name,
        isDirty: true,
        isLoading: false,
      }),
    reset: () =>
      set({
        content: defaultContent,
        path: null,
        title: "Untitled",
        isDirty: false,
        isLoading: false,
      }),
  };
}

export const documentStore = createDocumentStore();
