<script lang="ts">
  import { RotateCcw, Play } from "@lucide/svelte";
  import type { AppSettings } from "../../../lib/settingsTypes";
  import { ttsStore, type TtsEngine } from "../../../lib/ttsStore";
  import CssEditorModal from "../../ui/CssEditorModal.svelte";

  let {
    settings,
    searching,
    sectionMatches,
  }: {
    settings: AppSettings | null;
    searching: boolean;
    sectionMatches: (terms: string[]) => boolean;
  } = $props();

  let cssEditorOpen = $state(false);

  const CSS_TEMPLATE = `/* Custom CSS Template */\n:root {\n  --accent-default: #3b82f6;\n}`;

  function resetCustomCss() {
    if (!settings) return;
    settings.custom_css = "";
  }
  function openCssEditor() {
    cssEditorOpen = true;
  }
  function saveCustomCss(value: string) {
    if (!settings) return;
    settings.custom_css = value;
  }
  function resetTts() {
    if (!settings) return;
    settings.tts_engine = "online";
    settings.tts_voice_id = "";
    settings.tts_rate = 1.0;
    ttsStore.setEngine("online");
    ttsStore.setVoice(null);
    ttsStore.setRate(1.0);
  }
  function resetAutoSave() {
    if (!settings) return;
    settings.auto_save = true;
    settings.auto_save_interval_seconds = 30;
  }
  function resetExport() {
    if (!settings) return;
    settings.pandoc_path = null;
  }
</script>

{#if settings}
  {#if !searching || sectionMatches(["css", "custom style", "theme override"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Custom CSS</h3>
        <button class="reset-btn" onclick={resetCustomCss} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <p class="field-hint">Override CSS variables or add custom styles. Applied globally.</p>
      <div class="css-preview-wrap">
        <pre class="css-preview" class:empty={!settings.custom_css.trim()}>{settings.custom_css.trim() || "No custom CSS configured"}</pre>
        <button class="css-btn open-editor" onclick={openCssEditor}>Open CSS Editor</button>
      </div>
      <div class="css-actions">
        <button class="css-btn" onclick={() => { if (!settings) return; settings.custom_css = CSS_TEMPLATE; }}>Load Template</button>
        <button class="css-btn secondary" onclick={() => { if (!settings) return; settings.custom_css = ""; }}>Clear</button>
      </div>
      <CssEditorModal
        open={cssEditorOpen}
        value={settings.custom_css}
        onSave={saveCustomCss}
        onClose={() => { cssEditorOpen = false; }}
      />
    </div>
  {/if}

  {#if !searching || sectionMatches(["text to speech", "tts", "voice", "engine", "speed", "rate", "speak"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Text to Speech</h3>
        <button class="reset-btn" onclick={resetTts} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="tts-engine">Engine</label>
        <select
          id="tts-engine"
          value={settings.tts_engine}
          onchange={(e) => {
            if (!settings) return;
            const engine = e.currentTarget.value as TtsEngine;
            settings.tts_engine = engine;
            settings.tts_voice_id = "";
            ttsStore.setEngine(engine);
          }}
        >
          <option value="online">Online (Edge)</option>
          <option value="local">Local (Windows)</option>
        </select>
      </div>
      <div class="field-row">
        <label class="field-label" for="tts-voice">Voice</label>
        {#if $ttsStore.loadingVoices}
          <span class="voice-status">Loading voices…</span>
        {:else if $ttsStore.voices.length > 0}
          <select
            id="tts-voice"
            value={$ttsStore.voice?.id ?? ""}
            onchange={(e) => {
              if (!settings) return;
              const id = e.currentTarget.value;
              const voice = $ttsStore.voices.find((v) => v.id === id) || null;
              settings.tts_voice_id = id;
              ttsStore.setVoice(voice);
            }}
          >
            {#each $ttsStore.voices as voice}
              <option value={voice.id}>{voice.name} ({voice.language})</option>
            {/each}
          </select>
        {:else}
          <span class="voice-status">No voices loaded</span>
        {/if}
      </div>
      <div class="field-row">
        <label class="field-label" for="tts-rate">Speed</label>
        <div class="rate-control">
          <input
            id="tts-rate"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={$ttsStore.rate}
            oninput={(e) => {
              if (!settings) return;
              const rate = parseFloat(e.currentTarget.value);
              settings.tts_rate = rate;
              ttsStore.setRate(rate);
            }}
          />
          <span class="rate-value">{$ttsStore.rate.toFixed(1)}x</span>
        </div>
      </div>
      <div class="field-row">
        <button
          class="test-voice-btn"
          disabled={!$ttsStore.voice || $ttsStore.state === "loading"}
          onclick={() => {
            ttsStore.speak("Hello! This is a test of the text to speech voice.");
          }}
        >
          <Play size={14} />
          Test Voice
        </button>
      </div>
    </div>
  {/if}

  {#if !searching || sectionMatches(["auto save", "autosave", "interval", "backup"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Auto Save</h3>
        <button class="reset-btn" onclick={resetAutoSave} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <label class="toggle-row">
        <span class="toggle-label">
          Auto save
          <span class="toggle-hint">Automatically save changes at regular intervals</span>
        </span>
        <input type="checkbox" bind:checked={settings.auto_save} />
      </label>
      {#if settings.auto_save}
        <div class="field-row indent">
          <label class="field-label" for="auto-save-interval">Interval</label>
          <div class="input-group">
            <input id="auto-save-interval" type="number" min="5" max="300" bind:value={settings.auto_save_interval_seconds} />
            <span class="input-suffix">seconds</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if !searching || sectionMatches(["export", "pandoc", "path", "convert"])}
    <div class="settings-section">
      <div class="section-header">
        <h3>Export</h3>
        <button class="reset-btn" onclick={resetExport} title="Reset to defaults">
          <RotateCcw size={12} />
        </button>
      </div>
      <div class="field-row">
        <label class="field-label" for="pandoc-path">Pandoc path</label>
        <input
          id="pandoc-path"
          type="text"
          placeholder="Leave empty to use system PATH"
          bind:value={settings.pandoc_path}
        />
      </div>
    </div>
  {/if}
{/if}
