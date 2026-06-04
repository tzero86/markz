<script lang="ts">
  import { RotateCcw } from "@lucide/svelte";
  import type { AppSettings } from "../../../lib/settingsTypes";

  let {
    settings,
    searching,
    sectionMatches,
  }: {
    settings: AppSettings | null;
    searching: boolean;
    sectionMatches: (terms: string[]) => boolean;
  } = $props();

  function resetAppearance() {
    if (!settings) return;
    settings.theme = "system";
  }
  function resetLayout() {
    if (!settings) return;
    settings.view_mode = "split";
    settings.split_direction = "horizontal";
  }
  function resetAccessibility() {
    if (!settings) return;
    settings.ui_font_size = 14;
    settings.reduced_motion = false;
  }
</script>

{#if settings}
  {#if !searching || sectionMatches(["theme", "appearance", "color", "dark", "light", "system"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Appearance</h3>
        <button class="reset-btn" onclick={resetAppearance} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="theme-select">Theme</label>
        <select id="theme-select" bind:value={settings.theme}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </div>
  {/if}

  {#if !searching || sectionMatches(["layout", "view mode", "split", "direction", "outline", "sidebar"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Layout</h3>
        <button class="reset-btn" onclick={resetLayout} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="view-mode">Default view mode</label>
        <select id="view-mode" bind:value={settings.view_mode}>
          <option value="split">Split (editor + preview)</option>
          <option value="editor">Editor only</option>
          <option value="preview">Preview only</option>
        </select>
      </div>
      <div class="field-row">
        <label class="field-label" for="split-direction">Split direction</label>
        <select id="split-direction" bind:value={settings.split_direction}>
          <option value="horizontal">Horizontal (side by side)</option>
          <option value="vertical">Vertical (stacked)</option>
        </select>
      </div>
    </div>
  {/if}

  {#if !searching || sectionMatches(["accessibility", "interface font", "motion", "animation", "reduce"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Accessibility</h3>
        <button class="reset-btn" onclick={resetAccessibility} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="ui-font-size">Interface font size</label>
        <div class="input-group">
          <input id="ui-font-size" type="number" min="10" max="24" bind:value={settings.ui_font_size} />
          <span class="input-suffix">px</span>
        </div>
      </div>
      <label class="toggle-row">
        <span class="toggle-label">
          Reduced motion
          <span class="toggle-hint">Disable animations and transitions throughout the app</span>
        </span>
        <input type="checkbox" bind:checked={settings.reduced_motion} />
      </label>
    </div>
  {/if}
{/if}
