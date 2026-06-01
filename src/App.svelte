<script lang="ts">
  import { onMount } from "svelte";
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
  import { initKeyboardShortcuts, newDocument, openDocumentByPath } from "./lib/keyboard";
  import { initDebugLogging, startupCheckpoint } from "./lib/debug";
  import { contentZoomStore } from "./lib/contentZoomStore";
  import { ttsStore, type TtsEngine } from "./lib/ttsStore";
  import { tabStore, activeDocumentStore } from "./lib/tabStore";
  import CommandPalette from "./components/ui/CommandPalette.svelte";
  import type { PaletteMode } from "./lib/commandPalette";
  import { getSession } from "./lib/sessionStore";
  import { workspaceStore } from "./lib/workspaceStore";

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

  let activeActivity = $state<"files" | "outline" | "links">("outline");
  let sidebarPanelVisible = $state(false);
  let viewMode = $state<"split" | "editor" | "preview">("split");
  let splitDirection = $state<"horizontal" | "vertical">("horizontal");

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

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          contentZoomStore.increase();
        } else {
          contentZoomStore.decrease();
        }
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });

    const handleOpenGitDiff = () => {
      gitDiffOpen = true;
    };
    window.addEventListener("markz:open-git-diff", handleOpenGitDiff);

    const handleWorkspaceChanged = () => {
      workspaceStore.refresh();
    };
    window.addEventListener("markz:workspace-changed", handleWorkspaceChanged);

    const handleSetActivity = (e: Event) => {
      activeActivity = (e as CustomEvent).detail;
      userToggledSidebar = true;
      sidebarPanelVisible = true;
    };
    window.addEventListener("markz:set-activity", handleSetActivity);
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
        const deck = await invoke<any>("render_slides", {
          markdown: doc.content,
          docPath: doc.path,
        });
        slideDeck = deck;
        presentationOpen = true;
      } catch (e) {
        console.error("Failed to render slides:", e);
      }
    };
    window.addEventListener("markz:start-presentation", handleStartPresentation);
    return () => {
      removeShortcuts();
      window.removeEventListener("markz:toggle-sidebar", handleToggleSidebar);
      window.removeEventListener("markz:settings-changed", handleSettingsChanged);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("markz:open-git-diff", handleOpenGitDiff);
      window.removeEventListener("markz:workspace-changed", handleWorkspaceChanged);
      window.removeEventListener("markz:set-activity", handleSetActivity);
      window.removeEventListener("markz:set-view-mode", handleSetViewMode);
      window.removeEventListener("markz:open-settings", handleOpenSettings);
      window.removeEventListener("markz:open-help", handleOpenHelp);
      window.removeEventListener("markz:export-docx", handleExportDocx);
      window.removeEventListener("markz:open-palette", handleOpenPalette);
      window.removeEventListener("markz:print-pdf", handlePrintPdf);
      window.removeEventListener("markz:start-presentation", handleStartPresentation);
    };
  });
</script>

<div class="app">
  <TitleBar
    onOpenSettings={() => { settingsInitialTab = "settings"; settingsOpen = true; }}
    onOpenTemplateBrowser={() => (templateBrowserOpen = true)}
    onOpenSaveTemplate={() => (saveTemplateOpen = true)}
    onOpenHelp={() => { settingsInitialTab = "help"; settingsOpen = true; }}
    onOpenGitDiff={() => { gitDiffOpen = true; }}
  />
  <TabBar onNewTab={newDocument} />
  <div class="workspace">
    <ActivityBar
      {activeActivity}
      visible={sidebarPanelVisible}
      onSelectActivity={handleSelectActivity}
    />
    {#if sidebarPanelVisible}
      <OutlineSidebar activity={activeActivity} />
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
  <StatusBar {viewMode} {splitDirection} onSetViewMode={(mode) => (viewMode = mode)} onToggleSplitDirection={() => {
    const next = splitDirection === "horizontal" ? "vertical" : "horizontal";
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
  .single-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
</style>
