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

  function resetPreview() {
    if (!settings) return;
    settings.preview_font_size = 16;
    settings.preview_max_width = 820;
    settings.embed_remote_images = false;
  }
</script>

{#if settings}
  {#if !searching || sectionMatches(["preview", "preview font", "max width", "images", "embed", "remote"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Preview</h3>
        <button class="reset-btn" onclick={resetPreview} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="preview-font-size">Preview font size</label>
        <div class="input-group">
          <input id="preview-font-size" type="number" min="8" max="32" bind:value={settings.preview_font_size} />
          <span class="input-suffix">px</span>
        </div>
      </div>
      <div class="field-row">
        <label class="field-label" for="preview-max-width">Preview max width</label>
        <div class="input-group">
          <input id="preview-max-width" type="number" min="400" max="1600" step="10" bind:value={settings.preview_max_width} />
          <span class="input-suffix">px</span>
        </div>
      </div>
      <label class="toggle-row">
        <span class="toggle-label">
          Embed remote images
          <span class="toggle-hint">Download and embed remote images in DOCX exports</span>
        </span>
        <input type="checkbox" bind:checked={settings.embed_remote_images} />
      </label>
    </div>
  {/if}
{/if}
