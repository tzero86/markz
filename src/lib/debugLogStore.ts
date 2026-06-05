import { writable, get } from "svelte/store";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
}

interface DebugLogState {
  entries: LogEntry[];
  filter: LogLevel;
  collapsed: boolean;
  height: number;
  unreadErrors: number;
}

const MAX_ENTRIES = 500;
let nextId = 1;

function createDebugLogStore() {
  const { subscribe, update, set } = writable<DebugLogState>({
    entries: [],
    filter: "info",
    collapsed: true,
    height: 180,
    unreadErrors: 0,
  });

  function add(level: LogLevel, source: string, message: string, details?: string) {
    update((state) => {
      const entry: LogEntry = {
        id: nextId++,
        timestamp: Date.now(),
        level,
        source,
        message,
        details,
      };
      const entries = [...state.entries, entry];
      if (entries.length > MAX_ENTRIES) {
        entries.shift();
      }
      const unreadErrors = state.collapsed && (level === "error" || level === "warn")
        ? state.unreadErrors + 1
        : state.unreadErrors;
      return { ...state, entries, unreadErrors };
    });
  }

  function clear() {
    update((state) => ({ ...state, entries: [], unreadErrors: 0 }));
  }

  function setFilter(filter: LogLevel) {
    update((state) => ({ ...state, filter }));
  }

  function toggleCollapsed() {
    update((state) => ({
      ...state,
      collapsed: !state.collapsed,
      unreadErrors: state.collapsed ? 0 : state.unreadErrors,
    }));
  }

  function setCollapsed(collapsed: boolean) {
    update((state) => ({
      ...state,
      collapsed,
      unreadErrors: collapsed ? state.unreadErrors : 0,
    }));
  }

  function setHeight(height: number) {
    update((state) => ({ ...state, height: Math.max(80, Math.min(600, height)) }));
  }

  function acknowledgeErrors() {
    update((state) => ({ ...state, unreadErrors: 0 }));
  }

  return {
    subscribe,
    add,
    clear,
    setFilter,
    toggleCollapsed,
    setCollapsed,
    setHeight,
    acknowledgeErrors,
    getState: () => get({ subscribe }),
  };
}

export const debugLogStore = createDebugLogStore();

/** Convenience helpers for common log patterns */
export function logOperation(
  source: string,
  operation: string,
  level: LogLevel = "info"
) {
  debugLogStore.add(level, source, operation);
}

export function logOperationResult(
  source: string,
  operation: string,
  success: boolean,
  detail?: string
) {
  if (success) {
    debugLogStore.add("info", source, `${operation} — done`, detail);
  } else {
    debugLogStore.add("error", source, `${operation} — failed`, detail);
  }
}

export function logOperationStart(source: string, operation: string) {
  debugLogStore.add("info", source, `${operation} — started`);
}

export function logOperationEnd(source: string, operation: string, detail?: string) {
  debugLogStore.add("info", source, `${operation} — done`, detail);
}

export function logError(source: string, message: string, detail?: string) {
  debugLogStore.add("error", source, message, detail);
}

export function logWarn(source: string, message: string, detail?: string) {
  debugLogStore.add("warn", source, message, detail);
}
