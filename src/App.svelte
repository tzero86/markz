<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { invoke } from "@tauri-apps/api/core";
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
  import { initKeyboardShortcuts, newDocument, openDocumentByPath } from "./lib/keyboard";
  import { initDebugLogging, startupCheckpoint } from "./lib/debug";
  import { contentZoomStore } from "./lib/contentZoomStore";
  import { ttsStore, type TtsEngine } from "./lib/ttsStore";
  import { tabStore, activeDocumentStore } from "./lib/tabStore";
  import CommandPalette from "./components/ui/CommandPalette.svelte";
  import type { PaletteMode } from "./lib/commandPalette";
  import { getSession } from "./lib/sessionStore";
  import { workspaceStore } from "./lib/workspaceStore";
  import { presetStore } from "./lib/themeStore";

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
  let sidebarWidth = $state(220);
  let viewMode = $state<"split" | "editor" | "preview">("split");
  let splitDirection = $state<"horizontal" | "vertical" | "vertical-reversed">("horizontal");
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
  invoke("get_settings")
    .then((s: any) => {
      applySettings(s);
      sidebarWidth = s.sidebar_width ?? s.sidebarWidth ?? 220;
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
    })
    .catch(() => {});
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
  /* Sync directory panel to active file's folder and file watcher */
  let lastActivePath: string | null = null;
  const externallyModifiedPaths = new Set<string>();

  async function checkExternalChanges(path: string) {
    if (!externallyModifiedPaths.has(path)) return;
    externallyModifiedPaths.delete(path);
    const proceed = await confirm(
      `"${path.split(/[\\/]/).pop()}" has been modified externally. Reload it?`,
      { title: "File Changed", kind: "warning" }
    );
    if (!proceed) return;
    try {
      const info = await invoke<{ content: string; path: string }>("open_document", { path });
      tabStore.loadDocument(info.content, info.path);
    } catch (e) {
      console.error("Failed to reload externally changed file:", e);
    }
  }

  const unsubscribeWorkspaceSync = tabStore.subscribe((state) => {
    const active = state.tabs.find((t) => t.id === state.activeTabId);
    const path = active?.path ?? null;

    // Sync file watcher with all open file paths
    const openPaths = state.tabs.map((t) => t.path).filter((p): p is string => !!p);
    invoke("watch_open_files", { paths: openPaths }).catch(() => {});

    if (path === lastActivePath) return;
    lastActivePath = path;
    if (!path) {
      workspaceStore.closeWorkspace();
      return;
    }
    const parent = path.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    if (parent && parent !== get(workspaceStore).rootPath) {
      workspaceStore.loadWorkspace(parent).catch(() => {});
    }
    // If we switched to a file that was externally modified, prompt to reload
    checkExternalChanges(path);
  });
  let forceSinglePane = $derived(windowWidth > 0 && windowWidth < 900);
  let effectiveViewMode = $derived(
    forceSinglePane ? "editor" : viewMode
  );

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

    // Restore previous session if one exists
    getSession().then((session) => {
      if (session && session.tabs.length > 0) {
        tabStore
          .restoreSession(
            async (path: string) => {
              await openDocumentByPath(path);
            },
            session.activeTabPath
          )
          .then((restored) => {
            if (!restored) {
              // No valid session to restore; keep default welcome tab
            }
          })
          .catch(() => {
            // Fallback: default welcome tab is already present
          });
      }
      // Restore workspace folder if one was open
      if (session?.workspacePath) {
        workspaceStore.loadWorkspace(session.workspacePath).catch(() => {});
      } else if (session?.activeTabPath) {
        // Auto-open folder of restored active tab (if setting enabled)
        invoke("get_settings")
          .then((s: any) => {
            if (s?.auto_open_folder ?? true) {
              const parent = session.activeTabPath?.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
              if (parent) workspaceStore.loadWorkspace(parent).catch(() => {});
            }
          })
          .catch(() => {});
      }
    });

    // Dismiss splash screen
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 350);
    }
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
        slideDeck = deck;
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
      window.removeEventListener("markz:set-view-mode", handleSetViewMode);
      window.removeEventListener("markz:open-settings", handleOpenSettings);
      window.removeEventListener("markz:open-help", handleOpenHelp);
      window.removeEventListener("markz:export-docx", handleExportDocx);
      window.removeEventListener("markz:toggle-debug-panel", handleToggleDebugPanel);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("markz:open-template-browser", handleOpenTemplateBrowser);
      window.removeEventListener("markz:open-save-template", handleOpenSaveTemplate);
      window.removeEventListener("markz:open-search", handleOpenSearch);
    };
  });
</script>

<div class="app">
  <TitleBar
    onOpenSettings={() => { settingsInitialTab = "settings"; settingsOpen = true; }}
    onOpenTemplateBrowser={() => (templateBrowserOpen = true)}
    onOpenSaveTemplate={() => (saveTemplateOpen = true)}
    onOpenHelp={() => { settingsInitialTab = "help"; settingsOpen = true; }}
  />
  <TabBar onNewTab={newDocument} />
  <div class="workspace">
    <ActivityBar
      {activeActivity}
      visible={sidebarPanelVisible}
      onSelectActivity={handleSelectActivity}
    />
    {#if sidebarPanelVisible}
      <div class="sidebar-wrapper" style="width: {sidebarWidth}px; min-width: {sidebarWidth}px;">
        <OutlineSidebar activity={activeActivity} />
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
              // Persist width
              invoke("get_settings")
                .then((s: any) => {
                  if (s) {
                    s.sidebar_width = sidebarWidth;
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
    {#if effectiveViewMode === "split"}
      <SplitPane direction={splitDirection}>
        {#snippet left()}
          <EditorPane />
        {/snippet}
        {#snippet right()}
          <PreviewPane />
        {/snippet}
      </SplitPane>
    {:else if effectiveViewMode === "editor"}
      <div class="single-pane">
        <EditorPane />
      </div>
    {:else}
      <div class="single-pane">
        <PreviewPane />
      </div>
    {/if}
  </div>
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
  .single-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
</style>
