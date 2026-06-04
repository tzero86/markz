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

  const fontOptions = [
    "JetBrains Mono", "Fira Code", "Source Code Pro", "Cascadia Code",
    "Consolas", "Monaco", "Menlo", "Courier New", "monospace",
  ];

  function resetEditorFont() {
    if (!settings) return;
    settings.editor_font_family = "JetBrains Mono";
    settings.editor_font_size = 14;
    settings.line_height = 1.7;
  }
  function resetEditorBehavior() {
    if (!settings) return;
    settings.word_wrap = true;
    settings.show_line_numbers = true;
    settings.show_minimap = false;
    settings.auto_open_folder = true;
    settings.enable_spellcheck = true;
    settings.vim_mode = false;
  }
  function resetDictionary() {
    if (!settings) return;
    settings.custom_dictionary = [];
  }
</script>

{#if settings}
  {#if !searching || sectionMatches(["font family", "font size", "line height", "typography", "spacing"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Font</h3>
        <button class="reset-btn" onclick={resetEditorFont} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="font-family">Font family</label>
        <select id="font-family" bind:value={settings.editor_font_family}>
          {#each fontOptions as font}
            <option value={font}>{font}</option>
          {/each}
        </select>
      </div>
      <div class="field-row">
        <label class="field-label" for="font-size">Font size</label>
        <div class="input-group">
          <input id="font-size" type="number" min="8" max="32" bind:value={settings.editor_font_size} />
          <span class="input-suffix">px</span>
        </div>
      </div>
      <div class="field-row">
        <label class="field-label" for="line-height">Line height</label>
        <div class="input-group">
          <input id="line-height" type="number" min="1" max="3" step="0.1" bind:value={settings.line_height} />
        </div>
      </div>
    </div>
  {/if}

  {#if !searching || sectionMatches(["word wrap", "line numbers", "minimap", "auto open", "folder", "spellcheck", "vim", "keybindings", "editor"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Editor</h3>
        <button class="reset-btn" onclick={resetEditorBehavior} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <label class="toggle-row">
        <span class="toggle-label">
          Word wrap
          <span class="toggle-hint">Wrap long lines to fit the editor width</span>
        </span>
        <input type="checkbox" bind:checked={settings.word_wrap} />
      </label>
      <label class="toggle-row">
        <span class="toggle-label">
          Show line numbers
          <span class="toggle-hint">Display line numbers in the gutter</span>
        </span>
        <input type="checkbox" bind:checked={settings.show_line_numbers} />
      </label>
      <label class="toggle-row">
        <span class="toggle-label">
          Show minimap
          <span class="toggle-hint">Display a minimap of the document</span>
        </span>
        <input type="checkbox" bind:checked={settings.show_minimap} />
      </label>
      <label class="toggle-row">
        <span class="toggle-label">
          Auto-open folder
          <span class="toggle-hint">Automatically open the folder of a file when you open it</span>
        </span>
        <input type="checkbox" bind:checked={settings.auto_open_folder} />
      </label>
      <label class="toggle-row">
        <span class="toggle-label">
          Spellcheck
          <span class="toggle-hint">Enable browser-native spellchecking in the editor</span>
        </span>
        <input type="checkbox" bind:checked={settings.enable_spellcheck} />
      </label>
      <label class="toggle-row">
        <span class="toggle-label">
          Vim mode
          <span class="toggle-hint">Enable Vim keybindings in the editor</span>
        </span>
        <input type="checkbox" bind:checked={settings.vim_mode} />
      </label>
    </div>
  {/if}

  {#if !searching || sectionMatches(["dictionary", "spell", "words", "custom"])}
    {#if settings.custom_dictionary !== undefined}
      <div class="settings-section">
        <div class="section-header">
          <h3>Custom Dictionary</h3>
          <button class="reset-btn" onclick={resetDictionary} title="Reset to defaults">
            <RotateCcw size={12} />
          </button>
        </div>
        <p class="field-hint">Words listed here will be ignored by the spellchecker. One word per line.</p>
        <textarea
          id="custom-dictionary"
          class="custom-dict-input"
          rows={4}
          value={settings ? settings.custom_dictionary.join("\n") : ""}
          onchange={(e) => {
            if (!settings) return;
            const text = e.currentTarget.value;
            settings.custom_dictionary = text
              .split("\n")
              .map((w) => w.trim())
              .filter((w) => w.length > 0);
          }}
        ></textarea>
        {#if settings.custom_dictionary.length > 0}
          <div class="dict-chips">
            {#each settings.custom_dictionary as word, i}
              <span class="dict-chip">
                {word}
                <button
                  class="dict-chip-remove"
                  onclick={() => {
                    if (!settings) return;
                    settings.custom_dictionary = settings.custom_dictionary.filter((_, idx) => idx !== i);
                  }}
                  aria-label={`Remove ${word}`}
                >
                  ×
                </button>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
{/if}
