import { invoke } from "@tauri-apps/api/core";

export interface SessionTab {
  content: string;
  path: string | null;
  title: string;
  isDirty: boolean;
  pinned?: boolean;
  /** 1-based line numbers where manual slide breaks are set. */
  slide_breaks?: number[];
}

export interface SessionState {
  tabs: SessionTab[];
  activeTabPath: string | null;
  workspacePath: string | null;
}

export async function saveSession(
  tabs: SessionTab[],
  activeTabPath: string | null,
  workspacePath: string | null
): Promise<void> {
  await invoke("save_session", {
    tabs: tabs.map((t) => ({
      content: t.content,
      path: t.path,
      title: t.title,
      is_dirty: t.isDirty,
      pinned: t.pinned ?? false,
      slide_breaks: t.slide_breaks,
    })),
    active_tab_path: activeTabPath,
    workspace_path: workspacePath,
  });
}

export async function getSession(): Promise<SessionState | null> {
  const result = await invoke<{
    tabs: Array<{
      content: string;
      path: string | null;
      title: string;
      is_dirty: boolean;
      pinned?: boolean;
      slide_breaks?: number[];
    }>;
    active_tab_path: string | null;
    workspace_path: string | null;
  } | null>("load_session");

  if (!result) return null;

  return {
    tabs: result.tabs.map((t) => ({
      content: t.content,
      path: t.path,
      title: t.title,
      isDirty: t.is_dirty,
      pinned: t.pinned ?? false,
      slide_breaks: t.slide_breaks,
    })),
    activeTabPath: result.active_tab_path,
    workspacePath: result.workspace_path,
  };
}

export async function clearSession(): Promise<void> {
  await invoke("clear_session_disk");
}

export async function hasSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.tabs.length > 0;
}
