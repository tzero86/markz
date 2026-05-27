const STORAGE_KEY = "markz-session";

export interface SessionTab {
  path: string;
}

export interface SessionState {
  tabs: SessionTab[];
  activeTabPath: string | null;
}

function load(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.tabs) &&
      (typeof parsed.activeTabPath === "string" || parsed.activeTabPath === null)
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupted session
  }
  return null;
}

function save(state: SessionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getSession(): SessionState | null {
  return load();
}

export function saveSession(tabs: { path: string | null }[], activeTabPath: string | null) {
  const fileTabs = tabs
    .map((t) => t.path)
    .filter((p): p is string => p !== null);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const deduped: SessionTab[] = [];
  for (const path of fileTabs) {
    if (!seen.has(path)) {
      seen.add(path);
      deduped.push({ path });
    }
  }

  save({ tabs: deduped, activeTabPath });
}

export function hasSession(): boolean {
  return load() !== null;
}
