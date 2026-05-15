const STORAGE_KEY = "markz-recent-files";
const MAX_RECENT = 10;

export interface RecentFile {
  path: string;
  name: string;
  openedAt: number;
}

function load(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RecentFile[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function save(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // ignore
  }
}

export function getRecentFiles(): RecentFile[] {
  return load();
}

export function addRecentFile(path: string) {
  const files = load();
  const name = path.split(/[\\/]/).pop() || path;
  const filtered = files.filter((f) => f.path !== path);
  filtered.unshift({ path, name, openedAt: Date.now() });
  save(filtered.slice(0, MAX_RECENT));
}

export function clearRecentFiles() {
  save([]);
}
