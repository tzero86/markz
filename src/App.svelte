<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import EditorPane from "./components/editor/EditorPane.svelte";
  import PreviewPane from "./components/preview/PreviewPane.svelte";
  import TitleBar from "./components/layout/TitleBar.svelte";
  import TabBar from "./components/layout/TabBar.svelte";
  import StatusBar from "./components/layout/StatusBar.svelte";
  import GitDiffModal from "./components/layout/GitDiffModal.svelte";
  import PresentationMode from "./components/preview/PresentationMode.svelte";
  import SplitPane from "./components/layout/SplitPane.svelte";
  import OutlineSidebar from "./components/layout/OutlineSidebar.svelte";
  import ActivityBar from "./components/layout/ActivityBar.svelte";
  import SettingsModal from "./components/settings/SettingsModal.svelte";
  import TemplateBrowser from "./components/templates/TemplateBrowser.svelte";
  import SaveTemplateDialog from "./components/templates/SaveTemplateDialog.svelte";
import SearchPanel from "./components/layout/SearchPanel.svelte";
  import DebugPanel from "./components/layout/DebugPanel.svelte";
  import { debugLogStore } from "./lib/debugLogStore";
  import { initKeyboardShortcuts, newDocument, openDocumentByPath, readDocument } from "./lib/keyboard";
  import { initDebugLogging, startupCheckpoint } from "./lib/debug";
  import { contentZoomStore } from "./lib/contentZoomStore";
  import { ttsStore, type TtsEngine } from "./lib/ttsStore";
  import { tabStore, activeDocumentStore } from "./lib/tabStore";
  import CommandPalette from "./components/ui/CommandPalette.svelte";
  import type { PaletteMode } from "./lib/commandPalette";
  import { getSession } from "./lib/sessionStore";
  import { workspaceStore, IS_WINDOWS } from "./lib/workspaceStore";
  import { presetStore } from "./lib/themeStore";
  import { startupComplete } from "./lib/startupStore";
  import { sanitizeHtml } from "./lib/sanitizeHtml";
  import { isMarkdownPath } from "./lib/fileTypes";

  import { confirm } from "@tauri-apps/plugin-dialog";
  // Always start at 100% zoom — prevents stale localStorage values
  // (e.g.: 160% left over from a previous session) from persisting.
  contentZoomStore.reset();

  let settingsOpen = $state(false);
  let settingsInitialTab = $state<"settings" | "help" | "about">("settings");
  let templateBrowserOpen = $state(false);
  let saveTemplateOpen = $state(false);
  let gitDiffOpen = $state(false);
  let paletteOpen = $state(false);
  let paletteMode = $state<PaletteMode>("commands");
  let presentationOpen = $state(false);
  let slideDeck = $state<any>(null);
  let searchPanelOpen = $state(false);
  let activeActivity = $state<"files" | "outline" | "links">("outline");
  let sidebarPanelVisible = $state(false);
  let sidebarWidths = $state<{ files: number; outline: number; links: number }>({
    files: 280,
    outline: 220,
    links: 260,
  });
  let sidebarWidth = $derived(sidebarWidths[activeActivity]);
  let viewMode = $state<"split" | "editor" | "preview">("split");
  let splitDirection = $state<"horizontal" | "vertical" | "vertical-reversed">("horizontal");
  let zenMode = $state(false);
  let preZenSidebarVisible = $state(false);
  let preZenViewMode = $state<"split" | "editor" | "preview">("split");
  let escapePressCount = 0;
  let escapeTimeout: ReturnType<typeof setTimeout> | null = null;

  function enterZenMode() {
    if (zenMode) return;
    preZenSidebarVisible = sidebarPanelVisible;
    preZenViewMode = viewMode;
    sidebarPanelVisible = false;
    viewMode = "split";
    zenMode = true;
  }

  function exitZenMode() {
    if (!zenMode) return;
    sidebarPanelVisible = preZenSidebarVisible;
    viewMode = preZenViewMode;
    zenMode = false;
    escapePressCount = 0;
    if (escapeTimeout) {
      clearTimeout(escapeTimeout);
      escapeTimeout = null;
    }
  }

  function toggleZenMode() {
    if (zenMode) {
      exitZenMode();
    } else {
      enterZenMode();
    }
  }

  function handleZenEscape(e: KeyboardEvent) {
    if (!zenMode || e.key !== "Escape") return;
    escapePressCount++;
    if (escapePressCount >= 2) {
      e.preventDefault();
      exitZenMode();
      return;
    }
    if (escapeTimeout) clearTimeout(escapeTimeout);
    escapeTimeout = setTimeout(() => {
      escapePressCount = 0;
    }, 500);
  }

  async function loadSettings() {
    try {
      const s: any = await invoke("get_settings");
      applySettings(s);
      sidebarWidths = {
        files: s.sidebar_width_files ?? s.sidebarWidthFiles ?? s.sidebar_width ?? s.sidebarWidth ?? 280,
        outline: s.sidebar_width_outline ?? s.sidebarWidthOutline ?? s.sidebar_width ?? s.sidebarWidth ?? 220,
        links: s.sidebar_width_links ?? s.sidebarWidthLinks ?? s.sidebar_width ?? s.sidebarWidth ?? 260,
      };
      // Initialize TTS from saved preferences
      const engine = (s.tts_engine ?? "online") as TtsEngine;
      const voiceId = s.tts_voice_id ?? "";
      const rate = s.tts_rate ?? 1.0;
      ttsStore.initFromSettings(engine, voiceId, rate);
      // Initialize auto-save from saved preferences
      tabStore.setAutoSave(
        s.auto_save ?? s.autoSave ?? true,
        s.auto_save_interval_seconds ?? s.autoSaveIntervalSeconds ?? 30
      );
      // Initialize debug panel state from saved preferences
      debugLogStore.setCollapsed(s.debug_panel_collapsed ?? true);
      debugLogStore.setHeight(s.debug_panel_height ?? 180);
      debugLogStore.setFilter(s.debug_log_filter ?? "info");
      // Initialize theme preset from saved preferences
      const preset = s.theme_preset ?? "";
      if (preset) {
        presetStore.set(preset);
      }
    } catch {
      // Defaults already apply; ignore settings load failure.
    }
  }
  function applySettings(s: any) {
    activeActivity = s.show_outline ?? s.showOutline ?? true ? "outline" : "files";
    viewMode = s.view_mode || s.viewMode || "split";
    splitDirection = s.split_direction || s.splitDirection || "horizontal";
    document.documentElement.setAttribute("data-reduced-motion", String(s.reduced_motion ?? s.reducedMotion ?? false));
    document.documentElement.style.setProperty("--ui-font-size", `${s.ui_font_size ?? s.uiFontSize ?? 14}px`);
    // Inject custom CSS if provided
    let styleEl = document.getElementById("markz-custom-css") as HTMLStyleElement | null;
    const customCss = s.custom_css ?? s.customCss ?? "";
    if (customCss.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "markz-custom-css";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss;
    } else if (styleEl) {
      styleEl.textContent = "";
    }
  }
  /* Adaptive layout — responsive breakpoints */
  let windowWidth = $state(0);
  $effect(() => {
    function handleResize() {
      windowWidth = window.innerWidth;
    }
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  });

  /* Sidebar: auto-collapse below 1200px, but respect manual Ctrl+B toggle */
  let userToggledSidebar = $state(false);
  let autoCollapseSidebar = $derived(windowWidth > 0 && windowWidth < 1200);
  $effect(() => {
    if (autoCollapseSidebar && !userToggledSidebar && sidebarPanelVisible) {
      sidebarPanelVisible = false;
    }
    if (!autoCollapseSidebar) {
      userToggledSidebar = false;
    }
  });
  /* Persist debug panel state */
  $effect(() => {
    const collapsed = $debugLogStore.collapsed;
    const height = $debugLogStore.height;
    const filter = $debugLogStore.filter;
    // Debounce persistence slightly
    const timeout = setTimeout(() => {
      invoke("get_settings")
        .then((s: any) => {
          if (s) {
            s.debug_panel_collapsed = collapsed;
            s.debug_panel_height = height;
            s.debug_log_filter = filter;
            invoke("update_settings", { settings: s }).catch(() => {});
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  });
  /* Sync open-files watcher + surface external file changes */
  let lastActivePath: string | null = null;
  const externallyModifiedPaths = new Set<string>();
  /** Content last known to be on disk, per open path. It is refreshed whenever a
   *  tab for that path is clean — a clean buffer is by definition showing what the
   *  file holds — and pruned once no tab references the path. External changes are
   *  detected by comparing the file against THIS, never against the live buffer:
   *  a dirty buffer differing from disk only means the tab has unsaved edits. */
  const diskSnapshots = new Map<string, string>();

  async function checkExternalChanges(path: string) {
    if (!externallyModifiedPaths.has(path)) return;
    externallyModifiedPaths.delete(path);

    const active = tabStore.getActiveTab();
    if (active?.path === path && active.isDirty) {
      const proceed = await confirm(
        `"${path.split(/[\\/]/).pop()}" has changed on disk. Discard your unsaved changes and reload it?`,
        { title: "File Changed", kind: "warning" }
      );
      if (!proceed) return;
    } else if (active?.path !== path) {
      // Defer prompting until the user switches back to the stale tab.
      return;
    } else {
      const proceed = await confirm(
        `"${path.split(/[\\/]/).pop()}" has been modified externally. Reload it?`,
        { title: "File Changed", kind: "warning" }
      );
      if (!proceed) return;
    }

    try {
      const info = await invoke<{
        content: string;
        path: string;
        kind?: "text" | "image" | "binary";
        size?: number;
      }>("open_document", { path });
      // Reload through the same classification `openDocumentByPath` uses, so an
      // image/binary tab stays read-only instead of coming back as an editable
      // text buffer whose Ctrl+S would write typed text over the file.
      const kind = info.kind ?? "text";
      const readOnly = kind !== "text" || !isMarkdownPath(info.path);
      tabStore.loadDocument(kind === "text" ? info.content : "", info.path, readOnly, kind, info.size ?? 0);
    } catch (e) {
      console.error("Failed to reload externally changed file:", e);
    }
  }

  // Keep the open-files watcher in sync and surface external changes.
  const unsubscribeWorkspaceSync = tabStore.subscribe((state) => {
    const active = state.tabs.find((t) => t.id === state.activeTabId);
    const path = active?.path ?? null;

    // Track what each open file holds on disk: a clean tab is showing it, and a
    // path no tab references any more needs no snapshot. Session restore and
    // auto-save both land here, so no save/load call site has to remember.
    const openPaths = new Set<string>();
    for (const tab of state.tabs) {
      if (!tab.path) continue;
      openPaths.add(tab.path);
      if (!tab.isDirty) diskSnapshots.set(tab.path, tab.content);
    }
    for (const known of diskSnapshots.keys()) {
      if (!openPaths.has(known)) diskSnapshots.delete(known);
    }

    // During startup the restore process creates many tabs in quick succession.
    // Avoid the repeated per-tab cost of re-watching files and re-scanning the
    // workspace. We set these up once explicitly when startup finishes.
    if (get(startupComplete)) {
      // Sync file watcher with all open file paths
      const openPaths = state.tabs.map((t) => t.path).filter((p): p is string => !!p);
      invoke("watch_open_files", { paths: openPaths }).catch(() => {});

      if (path !== lastActivePath) {
        lastActivePath = path;
        // Reveal the file in the tree only when it belongs to the open root;
        // this never re-roots the workspace or evicts the open folder.
        workspaceStore.openFile(path).catch(() => {});
        // If we switched to a file that was externally modified, prompt to reload
        checkExternalChanges(path);
      }
    }
  });
  let forceSinglePane = $derived(windowWidth > 0 && windowWidth < 900);
  let effectiveViewMode = $derived(
    forceSinglePane ? "editor" : viewMode
  );

  /** Separator-bounded containment, mirroring `workspaceStore.pathInWorkspace`: a
   *  root contains a path only when the two name the same entry or the path sits
   *  below it — never when the root is a mere string prefix of it (`Doc` must not
   *  swallow `Documents/readme.md`). Separators are normalised on both sides (a
   *  session may store forward slashes where a tab path uses backslashes) and
   *  case is folded on Windows only, where `C:\Docs` and `c:\docs` are the same
   *  directory. */
  function pathWithinRoot(path: string | null | undefined, root: string | null | undefined): boolean {
    if (!path || !root) return false;
    const toComparable = (p: string) => {
      const slashed = p.replace(/\\/g, "/");
      return IS_WINDOWS ? slashed.toLowerCase() : slashed;
    };
    const normRoot = toComparable(root).replace(/\/+$/, "");
    const norm = toComparable(path);
    return norm === normRoot || norm.startsWith(normRoot + "/");
  }

  // Opening a folder changes the tree, never the tabs: reveal the active tab
  // when it lives inside the new root, and leave every tab untouched otherwise.
  let lastWorkspaceRoot: string | null = null;
  $effect(() => {
    const ws = $workspaceStore;
    const started = $startupComplete;
    if (!started) return;
    if (ws.rootPath === lastWorkspaceRoot) return;
    lastWorkspaceRoot = ws.rootPath;
    if (!ws.rootPath) return;

    const tabState = get(tabStore);
    const activeTab = tabState.tabs.find((t) => t.id === tabState.activeTabId);

    // Reveal the active tab in the new tree when it lives inside the root.
    // Everything else is left alone — opening a folder never changes tabs.
    if (activeTab?.path && pathWithinRoot(activeTab.path, ws.rootPath)) {
      workspaceStore.revealFilePath(activeTab.path).catch(() => {});
    }
  });

  function handleSelectActivity(activity: "files" | "outline" | "links") {
    console.log("[App] handleSelectActivity called:", activity, "current:", activeActivity, "visible:", sidebarPanelVisible);
    if (activeActivity === activity && sidebarPanelVisible) {
      sidebarPanelVisible = false;
    } else {
      activeActivity = activity;
      userToggledSidebar = true;
      sidebarPanelVisible = true;
    }
    console.log("[App] after handleSelectActivity:", activeActivity, sidebarPanelVisible);
  }

  onMount(() => {
    startupCheckpoint("App mounted");

    let unlisten: UnlistenFn | undefined;
    let unlistenLog: UnlistenFn | undefined;

    // Listen for files opened via OS association while the app is running.
    listen<string>("open-file", (event) => {
      if (event.payload) {
        openDocumentByPath(event.payload);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    // Listen for backend log events so they show up in the in-app debug panel.
    listen<{ level: "trace" | "debug" | "info" | "warn" | "error"; source: string; message: string; details?: string }>(
      "markz:log",
      (event) => {
        const { level, source, message, details } = event.payload;
        debugLogStore.add(level, source, message, details);
      }
    ).then((fn) => {
      unlistenLog = fn;
    });

    // Restore previous session if one exists, then handle any file the OS
    // asked us to open on startup (OS file open takes precedence).
    async function finishStartup() {
      const t0 = performance.now();
      try {
        // Load settings first so the UI theme/layout are correct before we
        // restore tabs and render the preview.
        const ts = performance.now();
        await loadSettings();
        debugLogStore.add("info", "startup", `loadSettings took ${(performance.now() - ts).toFixed(1)}ms`);
        const session = await getSession();
        debugLogStore.add("info", "startup", `getSession took ${(performance.now() - t0).toFixed(1)}ms`);
        if (session && session.tabs.length > 0) {
          const t1 = performance.now();
          await tabStore
            .restoreSession(
              (path: string) => readDocument(path),
              session.activeTabPath
            )
            .catch(() => false);
          debugLogStore.add("info", "startup", `restoreSession took ${(performance.now() - t1).toFixed(1)}ms`);
        }
        const paths = await invoke<string[]>("take_pending_open");
        if (paths.length > 0) {
          const t2 = performance.now();
          await openDocumentByPath(paths[0]);
          debugLogStore.add("info", "startup", `openDocumentByPath took ${(performance.now() - t2).toFixed(1)}ms`);
        }

        // Restore the workspace context. Prefer the saved workspace path if it
        // contains the active tab; otherwise fall back to the active tab's
        // directory so the file tree appears after reload.
        const active = tabStore.getActiveTab();
        if (active?.path) {
          const savedWs = session?.workspacePath;
          // Only follow the saved workspace when it genuinely contains the active
          // tab; a mere string prefix (`…\Doc` vs `…\Documents\readme.md`) must
          // not win, or the tree roots somewhere the open file does not live.
          const useSavedWs = !!savedWs && pathWithinRoot(active.path, savedWs);
          const t3 = performance.now();
          const target = useSavedWs && savedWs
            ? savedWs
            : active.path.replace(/\\/g, "/").split("/").slice(0, -1).join("/") || "/";
          workspaceStore.loadWorkspace(target).then(() => {
            debugLogStore.add("info", "startup", `workspaceStore.loadWorkspace took ${(performance.now() - t3).toFixed(1)}ms`);
          }).catch(() => {});
        } else if (session?.workspacePath) {
          const t3 = performance.now();
          workspaceStore.loadWorkspace(session.workspacePath).then(() => {
            debugLogStore.add("info", "startup", `workspaceStore.loadWorkspace took ${(performance.now() - t3).toFixed(1)}ms`);
          }).catch(() => {});
        }
        const state = get(tabStore);
        const openPaths = state.tabs.map((t) => t.path).filter((p): p is string => !!p);
        if (openPaths.length > 0) {
          invoke("watch_open_files", { paths: openPaths }).catch(() => {});
        }
      } finally {
        startupComplete.set(true);
        debugLogStore.add("info", "startup", `finishStartup total ${(performance.now() - t0).toFixed(1)}ms`);
        // Dismiss splash screen now. The file tree continues to populate in the
        // background, so the user never waits on large directory scans.
        const splash = document.getElementById("splash");
        if (splash) {
          splash.classList.add("fade-out");
          setTimeout(() => splash.remove(), 350);
        }
      }
    }

    finishStartup();

    // Content edits coalesce their session writes; make sure the pending one
    // lands before the window goes away.
    const flushSessionWhenHidden = () => {
      if (document.visibilityState === "hidden") tabStore.flushSession();
    };
    const flushSessionOnUnload = () => tabStore.flushSession();
    document.addEventListener("visibilitychange", flushSessionWhenHidden);
    window.addEventListener("beforeunload", flushSessionOnUnload);

    return () => {
      document.removeEventListener("visibilitychange", flushSessionWhenHidden);
      window.removeEventListener("beforeunload", flushSessionOnUnload);
      if (unlisten) {
        unlisten();
      }
      if (unlistenLog) {
        unlistenLog();
      }
    };
  });

  $effect(() => {
    const removeShortcuts = initKeyboardShortcuts();

    const handleToggleSidebar = () => {
      userToggledSidebar = true;
      sidebarPanelVisible = !sidebarPanelVisible;
    };
    window.addEventListener("markz:toggle-sidebar", handleToggleSidebar);

    const handleSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      applySettings(detail);
      tabStore.setAutoSave(
        detail.auto_save ?? detail.autoSave ?? true,
        detail.auto_save_interval_seconds ?? detail.autoSaveIntervalSeconds ?? 30
      );
    };
    window.addEventListener("markz:settings-changed", handleSettingsChanged);

    const handleFileExternallyChanged = (e: Event) => {
      const path = (e as CustomEvent).detail as string;
      if (!path || tabStore.isRecentlySaved(path)) return;
      externallyModifiedPaths.add(path);
      // If the changed file is currently active, prompt immediately
      const active = tabStore.getActiveTab();
      if (active?.path === path) {
        checkExternalChanges(path);
      }
    };
    window.addEventListener("markz:file-externally-changed", handleFileExternallyChanged);

    const handleCheckOpenFiles = async () => {
      const openPaths = get(tabStore).tabs.map((t) => t.path).filter((p): p is string => !!p);
      const results = await Promise.allSettled(
        openPaths.map(async (path) => {
          const info = await invoke<{ content: string; path: string }>("open_document", { path });
          return { path, content: info.content };
        })
      );
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status !== "fulfilled") continue;
        const { path, content } = result.value;
        const snapshot = diskSnapshots.get(path);
        if (snapshot === undefined) {
          // First sight of this file (e.g. a tab restored from a session that
          // was saved while dirty): adopt the current contents as the baseline.
          // Comparing against the buffer instead would misread every unsaved
          // edit as an external modification.
          diskSnapshots.set(path, content);
          continue;
        }
        if (content === snapshot) continue;
        externallyModifiedPaths.add(path);
        if (tabStore.getActiveTab()?.path === path) {
          checkExternalChanges(path);
        }
      }
    };
    window.addEventListener("markz:check-open-files", handleCheckOpenFiles);
    const handleSetActivity = (e: Event) => {
      activeActivity = (e as CustomEvent).detail;
      userToggledSidebar = true;
      sidebarPanelVisible = true;
    };
    const handleSetViewMode = (e: Event) => {
      viewMode = (e as CustomEvent).detail;
    };
    window.addEventListener("markz:set-view-mode", handleSetViewMode);
    const handleOpenSettings = () => {
      settingsInitialTab = "settings";
      settingsOpen = true;
    };
    window.addEventListener("markz:open-settings", handleOpenSettings);
    const handleOpenHelp = () => {
      settingsInitialTab = "help";
      settingsOpen = true;
    };
    window.addEventListener("markz:open-help", handleOpenHelp);
    const handleExportDocx = () => {
      window.dispatchEvent(new CustomEvent("markz:trigger-export", { detail: "docx" }));
    };
    window.addEventListener("markz:export-docx", handleExportDocx);
    const handlePrintPdf = () => {
      window.dispatchEvent(new CustomEvent("markz:trigger-print"));
    };
    const handleOpenPalette = (e: Event) => {
      paletteMode = (e as CustomEvent).detail;
      paletteOpen = true;
    };
    window.addEventListener("markz:open-palette", handleOpenPalette);
    window.addEventListener("markz:print-pdf", handlePrintPdf);
    const handleStartPresentation = async () => {
      const active = tabStore.getActiveTab();
      if (!active || (active.kind ?? "text") !== "text") return;
      const doc = tabStore.getActiveTab();
      if (!doc) return;
      try {
        let markdown = doc.content;
        if (doc.slideBreaks && doc.slideBreaks.length > 0) {
          const lines = markdown.split("\n");
          // Sort descending so insertions don't shift indices
          const sorted = [...doc.slideBreaks].sort((a, b) => b - a);
          for (const lineNum of sorted) {
            if (lineNum > 1 && lineNum <= lines.length) {
              lines.splice(lineNum - 1, 0, "---");
            }
          }
          markdown = lines.join("\n");
        }
        const deck = await invoke<any>("render_slides", {
          markdown,
          docPath: doc.path,
        });
        // The renderer passes raw HTML blocks through verbatim, so slide title
        // and content are untrusted. Sanitize them here — the single boundary
        // that produces the deck — so every {@html} sink in PresentationMode
        // receives pre-sanitized HTML. Non-HTML deck fields pass through as-is.
        slideDeck = {
          ...deck,
          slides: (deck?.slides ?? []).map((slide: any) => ({
            ...slide,
            title: typeof slide.title === "string" ? sanitizeHtml(slide.title) : slide.title,
            content: typeof slide.content === "string" ? sanitizeHtml(slide.content) : slide.content,
          })),
        };
        presentationOpen = true;
      } catch (e) {
        console.error("Failed to render slides:", e);
      }
    };
    window.addEventListener("markz:start-presentation", handleStartPresentation);
    const handleOpenTemplateBrowser = () => {
      templateBrowserOpen = true;
    };
    window.addEventListener("markz:open-template-browser", handleOpenTemplateBrowser);
    const handleOpenSaveTemplate = () => {
      saveTemplateOpen = true;
    };
    window.addEventListener("markz:open-save-template", handleOpenSaveTemplate);
    const handleOpenSearch = () => {
      searchPanelOpen = true;
    };
    window.addEventListener("markz:open-search", handleOpenSearch);
    const handleToggleDebugPanel = () => {
      debugLogStore.toggleCollapsed();
    };
    window.addEventListener("markz:toggle-debug-panel", handleToggleDebugPanel);
    const handleToggleZenMode = () => {
      toggleZenMode();
    };
    window.addEventListener("markz:toggle-zen-mode", handleToggleZenMode);
    window.addEventListener("keydown", handleZenEscape);
    const handleWindowFocus = () => {
      const active = tabStore.getActiveTab();
      if (active?.path) checkExternalChanges(active.path);
    };
    window.addEventListener("focus", handleWindowFocus);
    const handleOpenGitDiff = () => {
      gitDiffOpen = true;
    };
    window.addEventListener("markz:open-git-diff", handleOpenGitDiff);
    const handleWorkspaceChanged = () => {
      workspaceStore.refresh().catch(() => {});
    };
    window.addEventListener("markz:workspace-changed", handleWorkspaceChanged);
    return () => {
      removeShortcuts();
      unsubscribeWorkspaceSync();
      window.removeEventListener("markz:toggle-sidebar", handleToggleSidebar);
      window.removeEventListener("markz:settings-changed", handleSettingsChanged);
      window.removeEventListener("markz:open-git-diff", handleOpenGitDiff);
      window.removeEventListener("markz:workspace-changed", handleWorkspaceChanged);
      window.removeEventListener("markz:file-externally-changed", handleFileExternallyChanged);
      window.removeEventListener("markz:check-open-files", handleCheckOpenFiles);
      window.removeEventListener("markz:set-view-mode", handleSetViewMode);
      window.removeEventListener("markz:open-settings", handleOpenSettings);
      window.removeEventListener("markz:open-help", handleOpenHelp);
      window.removeEventListener("markz:export-docx", handleExportDocx);
      window.removeEventListener("markz:toggle-debug-panel", handleToggleDebugPanel);
      window.removeEventListener("markz:toggle-zen-mode", handleToggleZenMode);
      window.removeEventListener("keydown", handleZenEscape);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("markz:open-template-browser", handleOpenTemplateBrowser);
      window.removeEventListener("markz:open-save-template", handleOpenSaveTemplate);
      window.removeEventListener("markz:open-search", handleOpenSearch);
    };
  });
</script>

<div class="app" class:zen-mode={zenMode}>
  <a
    href="#editor"
    class="skip-link"
    onclick={(e) => {
      e.preventDefault();
      const editor = document.querySelector(".cm-content") as HTMLElement | null;
      editor?.focus();
    }}
  >
    Skip to editor
  </a>
  <TitleBar
    onOpenSettings={() => { settingsInitialTab = "settings"; settingsOpen = true; }}
    onOpenTemplateBrowser={() => (templateBrowserOpen = true)}
    onOpenSaveTemplate={() => (saveTemplateOpen = true)}
    onOpenHelp={() => { settingsInitialTab = "help"; settingsOpen = true; }}
  />
  <TabBar onNewTab={newDocument} />
  {#if $startupComplete}
    <div class="workspace">
      <ActivityBar
        {activeActivity}
        visible={sidebarPanelVisible}
        onSelectActivity={handleSelectActivity}
      />
      {#if sidebarPanelVisible}
        <div class="sidebar-wrapper" style="width: {sidebarWidth}px; min-width: {sidebarWidth}px;">
          <OutlineSidebar activity={activeActivity} />
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <div
            class="sidebar-resize-handle"
            role="separator"
            aria-label="Resize sidebar"
            onmousedown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              function onMove(ev: MouseEvent) {
                const delta = ev.clientX - startX;
                sidebarWidth = Math.max(180, Math.min(320, startWidth + delta));
              }
              function onUp() {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                // Persist per-activity width
                sidebarWidths = { ...sidebarWidths, [activeActivity]: sidebarWidth };
                invoke("get_settings")
                  .then((s: any) => {
                    if (s) {
                      s.sidebar_width_files = sidebarWidths.files;
                      s.sidebar_width_outline = sidebarWidths.outline;
                      s.sidebar_width_links = sidebarWidths.links;
                      invoke("update_settings", { settings: s }).catch(() => {});
                    }
                  })
                  .catch(() => {});
              }
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          ></div>
        </div>
      {/if}
      <SplitPane direction={splitDirection} mode={effectiveViewMode}>
        {#snippet left()}
          <EditorPane />
        {/snippet}
        {#snippet right()}
          <PreviewPane />
        {/snippet}
      </SplitPane>
    </div>
  {/if}
  <DebugPanel />
  <StatusBar {viewMode} {splitDirection} onSetViewMode={(mode) => (viewMode = mode)} onToggleSplitDirection={() => {
    const order: ("horizontal" | "vertical" | "vertical-reversed")[] = ["horizontal", "vertical", "vertical-reversed"];
    const idx = order.indexOf(splitDirection);
    const next = order[(idx + 1) % order.length];
    splitDirection = next;
    invoke("get_settings").then((s: any) => {
      if (s) {
        s.split_direction = next;
        invoke("update_settings", { settings: s }).catch(() => {});
      }
    }).catch(() => {});
  }} onOpenGitDiff={() => { gitDiffOpen = true; }} />
  <GitDiffModal bind:open={gitDiffOpen} docPath={$activeDocumentStore.path ?? ""} />
  <SettingsModal bind:open={settingsOpen} initialTab={settingsInitialTab} />
  <TemplateBrowser bind:open={templateBrowserOpen} />
  <CommandPalette bind:open={paletteOpen} mode={paletteMode} onClose={() => (paletteOpen = false)} />
  <SaveTemplateDialog bind:open={saveTemplateOpen} />
  {#if presentationOpen}
    <PresentationMode deck={slideDeck} onClose={() => { presentationOpen = false; slideDeck = null; }} />
  {/if}
  <SearchPanel bind:open={searchPanelOpen} />
  {#if zenMode}
    <button
      class="zen-exit-btn"
      onclick={exitZenMode}
      aria-label="Exit zen mode"
      title="Exit zen mode (Esc Esc)"
    >
      Exit Zen Mode
    </button>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-base);
    color: var(--text-primary);
    transition: background-color 300ms var(--ease-in-out),
                color 300ms var(--ease-in-out);
  }
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }
  .sidebar-wrapper {
    display: flex;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .sidebar-resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    z-index: 100;
    transition: background 150ms ease;
  }
  .sidebar-resize-handle:hover,
  .sidebar-resize-handle:active {
    background: var(--accent-default);
  }

  .skip-link {
    position: absolute;
    top: -40px;
    left: var(--space-3);
    z-index: 9999;
    padding: var(--space-2) var(--space-3);
    background: var(--accent-default);
    color: var(--text-inverse);
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: top 150ms var(--ease-out);
  }
  .skip-link:focus {
    top: var(--space-3);
    outline: 2px solid var(--text-inverse);
    outline-offset: 2px;
  }

  /* Zen / focus mode — hide all chrome except the editor/workspace */
  .app.zen-mode :global(.titlebar),
  .app.zen-mode :global(.tab-bar),
  .app.zen-mode :global(.activity-bar),
  .app.zen-mode .sidebar-wrapper,
  .app.zen-mode :global(.statusbar),
  .app.zen-mode :global(.debug-panel) {
    display: none !important;
  }
  .app.zen-mode .workspace {
    flex: 1;
    height: 100vh;
  }
  .zen-exit-btn {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 2000;
    padding: var(--space-2) var(--space-4);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    opacity: 0;
    transition: opacity 200ms ease, color 150ms ease;
    pointer-events: none;
  }
  .app.zen-mode .zen-exit-btn {
    opacity: 0.6;
    pointer-events: auto;
  }
  .app.zen-mode .zen-exit-btn:hover,
  .app.zen-mode .zen-exit-btn:focus {
    opacity: 1;
    color: var(--text-primary);
    outline: 2px solid var(--accent-default);
    outline-offset: 2px;
  }
</style>
