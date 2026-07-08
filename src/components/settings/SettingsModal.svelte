<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import {
    X,
    Palette,
    PenLine,
    Eye,
    Keyboard,
    Settings2,
    Info,
    Search,
  } from "@lucide/svelte";
  import "./settings-shared.css";
  import { get } from "svelte/store";
  import { themeStore, presetStore, type Theme } from "../../lib/themeStore";
  import { ttsStore } from "../../lib/ttsStore";
  import type { AppSettings } from "../../lib/settingsTypes";
  import GeneralSettings from "./categories/GeneralSettings.svelte";
  import EditorSettings from "./categories/EditorSettings.svelte";
  import PreviewSettings from "./categories/PreviewSettings.svelte";
  import ShortcutsSettings from "./categories/ShortcutsSettings.svelte";
  import AdvancedSettings from "./categories/AdvancedSettings.svelte";
  import AboutSettings from "./categories/AboutSettings.svelte";
  import { trapFocus } from "../../lib/focusTrap";

  type CategoryId = "general" | "editor" | "preview" | "shortcuts" | "advanced" | "about";

  let {
    open = $bindable(false),
    initialTab = "settings" as "settings" | "help" | "about",
  } = $props();

  let activeCategory = $state<CategoryId>("general");
  let prevOpen = $state(false);
  let settings = $state<AppSettings | null>(null);
  let loading = $state(true);
  let settingsSearch = $state("");

  const searching = $derived(settingsSearch.trim().length > 0);

  const categories: { id: CategoryId; label: string; icon: typeof Palette }[] = [
    { id: "general", label: "General", icon: Palette },
    { id: "editor", label: "Editor", icon: PenLine },
    { id: "preview", label: "Preview", icon: Eye },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "advanced", label: "Advanced", icon: Settings2 },
    { id: "about", label: "About", icon: Info },
  ];

  $effect(() => {
    if (open && !settings) {
      loadSettings();
    }
    if (open && !prevOpen) {
      const map: Record<string, CategoryId> = {
        settings: "general",
        help: "shortcuts",
        about: "about",
      };
      activeCategory = map[initialTab] ?? "general";
    }
    prevOpen = open;
  });

  async function loadSettings() {
    loading = true;
    try {
      settings = await invoke<AppSettings>("get_settings");
      if (!settings) return;
      const engine = (settings.tts_engine ?? "online") as import("../../lib/ttsStore").TtsEngine;
      if (get(ttsStore).voices.length === 0) {
        ttsStore.loadVoices(engine);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      loading = false;
    }
  }

  async function save() {
    if (!settings) return;
    const ttsState = get(ttsStore);
    settings.tts_engine = ttsState.engine;
    settings.tts_voice_id = ttsState.voice?.id ?? "";
    settings.tts_rate = ttsState.rate;
    try {
      await invoke("update_settings", { settings });
      themeStore.set(settings.theme as Theme);
      presetStore.set(settings.theme_preset as import("../../lib/themeStore").ThemePreset);
      window.dispatchEvent(
        new CustomEvent("markz:settings-changed", {
          detail: {
            fontFamily: settings.editor_font_family,
            fontSize: settings.editor_font_size,
            lineHeight: settings.line_height,
            viewMode: settings.view_mode,
            previewFontSize: settings.preview_font_size,
            reducedMotion: settings.reduced_motion,
            uiFontSize: settings.ui_font_size,
            wordWrap: settings.word_wrap,
            showMinimap: settings.show_minimap,
            ttsEngine: settings.tts_engine,
            ttsVoiceId: settings.tts_voice_id,
            ttsRate: settings.tts_rate,
            customCss: settings.custom_css,
            pandocPath: settings.pandoc_path,
            embedRemoteImages: settings.embed_remote_images,
            enableSpellcheck: settings.enable_spellcheck,
            customDictionary: settings.custom_dictionary,
            splitDirection: settings.split_direction,
            vimMode: settings.vim_mode,
            theme: settings.theme,
          },
        })
      );
      open = false;
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      open = false;
    }
  }
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      open = false;
    }
  }

  /* ── Search helpers ── */
  function matchesSearch(terms: string[]): boolean {
    if (!settingsSearch.trim()) return true;
    const q = settingsSearch.toLowerCase();
    return terms.some((t) => t.toLowerCase().includes(q));
  }
  function sectionMatches(terms: string[]): boolean {
    return matchesSearch(terms);
  }
  function categoryHasMatches(cat: CategoryId): boolean {
    switch (cat) {
      case "general":
        return sectionMatches(["theme", "appearance", "color", "dark", "light", "system"]) ||
          sectionMatches(["layout", "view mode", "split", "direction", "outline", "sidebar"]) ||
          sectionMatches(["accessibility", "interface font", "motion", "animation", "reduce"]);
      case "editor":
        return sectionMatches(["font family", "font size", "line height", "typography", "spacing"]) ||
          sectionMatches(["word wrap", "line numbers", "minimap", "auto open", "folder", "spellcheck", "vim", "keybindings", "editor"]) ||
          sectionMatches(["dictionary", "spell", "words", "custom"]);
      case "preview":
        return sectionMatches(["preview", "preview font", "max width", "images", "embed", "remote"]);
      case "shortcuts":
        return sectionMatches(["shortcut", "keyboard", "hotkey", "key binding", "ctrl"]);
      case "advanced":
        return sectionMatches(["css", "custom style", "theme override"]) ||
          sectionMatches(["text to speech", "tts", "voice", "engine", "speed", "rate", "speak"]) ||
          sectionMatches(["auto save", "autosave", "interval", "backup"]) ||
          sectionMatches(["export", "pandoc", "path", "convert"]);
      case "about":
        return sectionMatches(["about", "version", "update", "credits", "features", "tech"]);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel settings-modal" role="dialog" aria-label="Settings" use:trapFocus>
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-layout">
        <!-- Sidebar -->
        <aside class="settings-sidebar">
          <div class="sidebar-search">
            <Search size={14} class="search-icon" />
            <input
              type="text"
              class="sidebar-search-input"
              placeholder="Search..."
              bind:value={settingsSearch}
              aria-label="Search settings"
            />
          </div>
          <div class="sidebar-nav" role="tablist" aria-label="Settings categories">
            {#each categories as cat}
              {#if !searching || categoryHasMatches(cat.id)}
                <button
                  class="sidebar-item"
                  class:active={activeCategory === cat.id}
                  onclick={() => {
                    activeCategory = cat.id;
                    settingsSearch = "";
                  }}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                >
                  <cat.icon size={16} strokeWidth={1.5} />
                  <span>{cat.label}</span>
                </button>
              {/if}
            {/each}
          </div>
        </aside>

        <!-- Body -->
        <div class="modal-body">
          {#if loading}
            <div class="loading">Loading settings…</div>
          {:else if settings}
            {#if (!searching && activeCategory === "general") || (searching && categoryHasMatches("general"))}
              <GeneralSettings {settings} {searching} {sectionMatches} />
            {/if}
            {#if (!searching && activeCategory === "editor") || (searching && categoryHasMatches("editor"))}
              <EditorSettings {settings} {searching} {sectionMatches} />
            {/if}
            {#if (!searching && activeCategory === "preview") || (searching && categoryHasMatches("preview"))}
              <PreviewSettings {settings} {searching} {sectionMatches} />
            {/if}
            {#if (!searching && activeCategory === "shortcuts") || (searching && categoryHasMatches("shortcuts"))}
              <ShortcutsSettings {searching} {sectionMatches} />
            {/if}
            {#if (!searching && activeCategory === "advanced") || (searching && categoryHasMatches("advanced"))}
              <AdvancedSettings {settings} {searching} {sectionMatches} />
            {/if}
            {#if (!searching && activeCategory === "about") || (searching && categoryHasMatches("about"))}
              <AboutSettings {searching} {sectionMatches} />
            {/if}

            {#if searching && !categoryHasMatches("general") && !categoryHasMatches("editor") && !categoryHasMatches("preview") && !categoryHasMatches("shortcuts") && !categoryHasMatches("advanced") && !categoryHasMatches("about")}
              <div class="no-results">No settings match your search.</div>
            {/if}
          {:else}
            <div class="error">Failed to load settings.</div>
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => (open = false)}>Cancel</button>
        <button class="btn-primary" onclick={save}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* settings-shared.css is imported globally in the script block */

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 150ms ease-out;
  }
  .modal-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
    width: 600px;
    max-width: 90vw;
    height: 640px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 200ms ease-out;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
  }
  .modal-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .modal-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Sidebar */
  .settings-sidebar {
    width: 160px;
    min-width: 160px;
    border-right: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
    padding: var(--space-3);
    gap: var(--space-2);
  }
  .sidebar-search {
    position: relative;
    display: flex;
    align-items: center;
  }
  .sidebar-search :global(.search-icon) {
    position: absolute;
    left: 8px;
    color: var(--text-muted);
    pointer-events: none;
  }
  .sidebar-search-input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-2) var(--space-2) 28px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }
  .sidebar-search-input:focus {
    border-color: var(--accent-default);
  }
  .sidebar-search-input::placeholder {
    color: var(--text-tertiary);
  }
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .sidebar-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 150ms ease, color 150ms ease;
  }
  .sidebar-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .sidebar-item.active {
    background: var(--accent-muted);
    color: var(--accent-default);
  }

  /* Body */
  .modal-body {
    flex: 1;
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
    min-width: 0;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--border-default);
    flex-shrink: 0;
  }

  .btn-primary {
    padding: var(--space-2) var(--space-4);
    background: var(--accent-default);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .btn-primary:hover {
    background: var(--accent-hover);
  }
  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .btn-secondary:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .loading,
  .error,
  .no-results {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: center;
    padding: var(--space-8) 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
