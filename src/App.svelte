<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import EditorPane from "./components/editor/EditorPane.svelte";
  import PreviewPane from "./components/preview/PreviewPane.svelte";
  import TitleBar from "./components/layout/TitleBar.svelte";
  import TabBar from "./components/layout/TabBar.svelte";
  import StatusBar from "./components/layout/StatusBar.svelte";
  import SplitPane from "./components/layout/SplitPane.svelte";
  import OutlineSidebar from "./components/layout/OutlineSidebar.svelte";
  import SettingsModal from "./components/settings/SettingsModal.svelte";
  import TemplateBrowser from "./components/templates/TemplateBrowser.svelte";
  import SaveTemplateDialog from "./components/templates/SaveTemplateDialog.svelte";
  import { initKeyboardShortcuts, newDocument, openDocumentByPath } from "./lib/keyboard";
  import { initDebugLogging, startupCheckpoint } from "./lib/debug";
  import { contentZoomStore } from "./lib/contentZoomStore";
  import { ttsStore, type TtsEngine } from "./lib/ttsStore";
  import { tabStore } from "./lib/tabStore";
  import { getSession } from "./lib/sessionStore";

  // Always start at 100% zoom — prevents stale localStorage values
  // (e.g., 160% left over from a previous session) from persisting.
  contentZoomStore.reset();

  let settingsOpen = $state(false);
  let settingsInitialTab = $state<"settings" | "help" | "about">("settings");
  let templateBrowserOpen = $state(false);
  let saveTemplateOpen = $state(false);

  let outlineVisible = $state(true);
  let viewMode = $state<"split" | "editor" | "preview">("split");

  function applySettings(s: any) {
    outlineVisible = s.show_outline ?? s.showOutline ?? true;
    viewMode = s.view_mode || s.viewMode || "split";
    document.documentElement.setAttribute("data-reduced-motion", String(s.reduced_motion ?? s.reducedMotion ?? false));
    document.documentElement.style.setProperty("--ui-font-size", `${s.ui_font_size ?? s.uiFontSize ?? 14}px`);
  }

  invoke("get_settings")
    .then((s: any) => {
      applySettings(s);
      // Initialize TTS from saved preferences
      const engine = (s.tts_engine ?? "online") as TtsEngine;
      const voiceId = s.tts_voice_id ?? "";
      const rate = s.tts_rate ?? 1.0;
      ttsStore.initFromSettings(engine, voiceId, rate);
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
    if (autoCollapseSidebar && !userToggledSidebar && outlineVisible) {
      outlineVisible = false;
    }
    if (!autoCollapseSidebar) {
      userToggledSidebar = false;
    }
  });

  let forceSinglePane = $derived(windowWidth > 0 && windowWidth < 900);
  let effectiveViewMode = $derived(
    forceSinglePane ? "editor" : viewMode
  );

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
      outlineVisible = !outlineVisible;
    };
    window.addEventListener("markz:toggle-sidebar", handleToggleSidebar);

    const handleSettingsChanged = (e: Event) => {
      applySettings((e as CustomEvent).detail || {});
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

    return () => {
      removeShortcuts();
      window.removeEventListener("markz:toggle-sidebar", handleToggleSidebar);
      window.removeEventListener("markz:settings-changed", handleSettingsChanged);
      window.removeEventListener("wheel", handleWheel);
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
    <OutlineSidebar visible={outlineVisible} />
    {#if effectiveViewMode === "split"}
      <SplitPane>
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
  <StatusBar {viewMode} onSetViewMode={(mode) => (viewMode = mode)} />
  <SettingsModal bind:open={settingsOpen} initialTab={settingsInitialTab} />
  <TemplateBrowser bind:open={templateBrowserOpen} />
  <SaveTemplateDialog bind:open={saveTemplateOpen} />
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
