import { writable, get } from "svelte/store";

interface NavHistoryState {
  stack: string[];
  index: number;
}

function createNavHistoryStore() {
  const { subscribe, set, update } = writable<NavHistoryState>({ stack: [], index: -1 });

  return {
    subscribe,
    push(path: string) {
      update((state) => {
        // Drop any forward history after the current position.
        const stack = state.stack.slice(0, state.index + 1);
        // Avoid pushing duplicate consecutive entries.
        if (stack[stack.length - 1] === path) {
          return state;
        }
        stack.push(path);
        // Keep the stack bounded to avoid unbounded growth.
        if (stack.length > 50) {
          stack.shift();
        }
        return { stack, index: stack.length - 1 };
      });
    },
    canGoBack(): boolean {
      const state = get({ subscribe });
      return state.index > 0;
    },
    canGoForward(): boolean {
      const state = get({ subscribe });
      return state.index >= 0 && state.index < state.stack.length - 1;
    },
    goBack(): string | null {
      const state = get({ subscribe });
      if (state.index <= 0) return null;
      const newIndex = state.index - 1;
      set({ ...state, index: newIndex });
      return state.stack[newIndex];
    },
    goForward(): string | null {
      const state = get({ subscribe });
      if (state.index >= state.stack.length - 1) return null;
      const newIndex = state.index + 1;
      set({ ...state, index: newIndex });
      return state.stack[newIndex];
    },
    current(): string | null {
      const state = get({ subscribe });
      return state.stack[state.index] ?? null;
    },
    clear() {
      set({ stack: [], index: -1 });
    },
  };
}

export const navHistoryStore = createNavHistoryStore();
