<script lang="ts">
  import { onMount } from "svelte";
  import EditorPane from "./components/editor/EditorPane.svelte";
  import PreviewPane from "./components/preview/PreviewPane.svelte";
  import TitleBar from "./components/layout/TitleBar.svelte";
  import StatusBar from "./components/layout/StatusBar.svelte";
  import SplitPane from "./components/layout/SplitPane.svelte";
  import OutlineSidebar from "./components/layout/OutlineSidebar.svelte";
  import SettingsModal from "./components/settings/SettingsModal.svelte";
  import TemplateBrowser from "./components/templates/TemplateBrowser.svelte";
  import SaveTemplateDialog from "./components/templates/SaveTemplateDialog.svelte";
  import HelpModal from "./components/help/HelpModal.svelte";
  import { initKeyboardShortcuts } from "./lib/keyboard";
  import { silentUpdateCheck } from "./lib/updater";

  let settingsOpen = $state(false);
  let templateBrowserOpen = $state(false);
  let saveTemplateOpen = $state(false);
  let helpOpen = $state(false);

  onMount(() => {
    // Silent background update check on startup
    silentUpdateCheck().catch(() => {});
    return initKeyboardShortcuts();
  });
</script>

<div class="app">
  <TitleBar
    onOpenSettings={() => (settingsOpen = true)}
    onOpenTemplateBrowser={() => (templateBrowserOpen = true)}
    onOpenSaveTemplate={() => (saveTemplateOpen = true)}
    onOpenHelp={() => (helpOpen = true)}
  />
  <div class="workspace">
    <OutlineSidebar />
    <SplitPane>
      {#snippet left()}
        <EditorPane />
      {/snippet}
      {#snippet right()}
        <PreviewPane />
      {/snippet}
    </SplitPane>
  </div>
  <StatusBar />
  <SettingsModal bind:open={settingsOpen} />
  <TemplateBrowser bind:open={templateBrowserOpen} />
  <SaveTemplateDialog bind:open={saveTemplateOpen} />
  <HelpModal bind:open={helpOpen} />
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
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }
</style>
