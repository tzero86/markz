<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import {
    X,
    Play,
    Palette,
    PenLine,
    Eye,
    Keyboard,
    Settings2,
    Info,
    RotateCcw,
    Search,
    ExternalLink,
  } from "@lucide/svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import { ttsStore, type TtsEngine } from "../../lib/ttsStore";
  import { get } from "svelte/store";
  import {
    checkForUpdate,
    confirmAndDownload,
    confirmAndRestart,
    updateStatus,
    updateVersion,
    updateError,
  } from "../../lib/updater";
  import { themeStore, type Theme } from "../../lib/themeStore";
  import logo from "../../assets/logo.png";

  type CategoryId = "general" | "editor" | "preview" | "shortcuts" | "advanced" | "about";

  let {
    open = $bindable(false),
    initialTab = "settings" as "settings" | "help" | "about",
  } = $props();

  let activeCategory = $state<CategoryId>("general");
  let prevOpen = $state(false);
  let settings: {
    theme: string;
    editor_font_size: number;
    editor_font_family: string;
    line_height: number;
    word_wrap: boolean;
    show_line_numbers: boolean;
    show_minimap: boolean;
    preview_max_width: number;
    auto_save: boolean;
    auto_save_interval_seconds: number;
    embed_remote_images: boolean;
    show_outline: boolean;
    view_mode: string;
    preview_font_size: number;
    reduced_motion: boolean;
    ui_font_size: number;
    tts_engine: string;
    tts_voice_id: string;
    tts_rate: number;
    custom_css: string;
    pandoc_path: string | null;
    custom_dictionary: string[];
    split_direction: string;
    vim_mode: boolean;
    auto_open_folder: boolean;
    enable_spellcheck: boolean;
  } | null = $state(null);

  let loading = $state(true);
  let appVersion = $state<string>("");
  let settingsSearch = $state("");

  const searching = $derived(settingsSearch.trim().length > 0);
  const CSS_TEMPLATE = `/* Custom CSS Template */\n:root {\n  --accent-default: #3b82f6;\n}`;

  function matchesSearch(terms: string[]): boolean {
    if (!settingsSearch.trim()) return true;
    const q = settingsSearch.toLowerCase();
    return terms.some((t) => t.toLowerCase().includes(q));
  }

  const categories: { id: CategoryId; label: string; icon: typeof Palette }[] = [
    { id: "general", label: "General", icon: Palette },
    { id: "editor", label: "Editor", icon: PenLine },
    { id: "preview", label: "Preview", icon: Eye },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "advanced", label: "Advanced", icon: Settings2 },
    { id: "about", label: "About", icon: Info },
  ];

  const fontOptions = [
    "JetBrains Mono",
    "Fira Code",
    "Source Code Pro",
    "Cascadia Code",
    "Consolas",
    "Monaco",
    "Menlo",
    "Courier New",
    "monospace",
  ];

  const shortcuts = [
    { keys: ["Ctrl", "O"], action: "Open file", category: "File" },
    { keys: ["Ctrl", "Shift", "O"], action: "Open folder / workspace", category: "File" },
    { keys: ["Ctrl", "T"], action: "New file", category: "File" },
    { keys: ["Ctrl", "S"], action: "Save file", category: "File" },
    { keys: ["Ctrl", "W"], action: "Close active tab", category: "File" },
    { keys: ["Ctrl", "Shift", "P"], action: "Command palette", category: "Navigation" },
    { keys: ["Ctrl", "P"], action: "Quick open files", category: "Navigation" },
    { keys: ["Ctrl", "B"], action: "Toggle sidebar panel", category: "View" },
    { keys: ["F5"], action: "Start presentation mode", category: "View" },
    { keys: ["Ctrl", "Shift", "F"], action: "Search workspace", category: "View" },
    { keys: ["Ctrl", "F"], action: "Find / Replace", category: "Edit" },
    { keys: ["Ctrl", "Shift", "D"], action: "Git diff panel", category: "View" },
    { keys: ["Ctrl", "="], action: "Zoom in", category: "View" },
    { keys: ["Ctrl", "-"], action: "Zoom out", category: "View" },
    { keys: ["Ctrl", "0"], action: "Reset zoom", category: "View" },
    { keys: ["Esc"], action: "Close modal / dropdown", category: "Navigation" },
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
      settings = await invoke("get_settings");
      if (!settings) return;
      const engine = (settings.tts_engine ?? "online") as TtsEngine;
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
            autoOpenFolder: settings.auto_open_folder,
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
  onMount(() => {
    getVersion().then((v) => (appVersion = v)).catch(() => (appVersion = ""));
  });

  async function handleCheckUpdate() {
    const update = await checkForUpdate();
    if (update) {
      await confirmAndDownload();
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case "idle": return "Idle";
      case "checking": return "Checking for updates…";
      case "available": return "Update available";
      case "downloading": return "Downloading update…";
      case "ready": return "Update ready — restart to apply";
      case "up-to-date": return "You're on the latest version";
      case "error": return "Update check failed";
      default: return status;
    }
  }

  /* ── Search helpers ── */
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

  function sectionMatches(terms: string[]): boolean {
    return matchesSearch(terms);
  }

  /* ── Reset helpers ── */
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
  function resetPreview() {
    if (!settings) return;
    settings.preview_font_size = 16;
    settings.preview_max_width = 820;
    settings.embed_remote_images = false;
  }
  function resetCustomCss() {
    if (!settings) return;
    settings.custom_css = "";
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

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Settings">
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

        <!-- Content -->
        <div class="modal-body">
          {#if loading}
            <div class="loading">Loading…</div>
          {:else if settings}
            <!-- ── General ── -->
            {#if (!searching && activeCategory === "general") || (searching && categoryHasMatches("general"))}
              <!-- Appearance -->
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

              <!-- Layout -->
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

              <!-- Accessibility -->
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

            <!-- ── Editor ── -->
            {#if (!searching && activeCategory === "editor") || (searching && categoryHasMatches("editor"))}
              <!-- Font -->
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

              <!-- Editor Behavior -->
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

              <!-- Custom Dictionary -->
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

            <!-- ── Preview ── -->
            {#if (!searching && activeCategory === "preview") || (searching && categoryHasMatches("preview"))}
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

            <!-- ── Shortcuts ── -->
            {#if (!searching && activeCategory === "shortcuts") || (searching && categoryHasMatches("shortcuts"))}
              {#if !searching || sectionMatches(["shortcut", "keyboard", "hotkey", "key binding", "ctrl"])}
                <div class="settings-section">
                  <h3>Keyboard Shortcuts</h3>
                  <div class="shortcuts-list">
                    {#each [
                      { name: "File", items: shortcuts.filter(s => s.category === "File") },
                      { name: "Edit", items: shortcuts.filter(s => s.category === "Edit") },
                      { name: "View", items: shortcuts.filter(s => s.category === "View") },
                      { name: "Navigation", items: shortcuts.filter(s => s.category === "Navigation") },
                    ] as category}
                      <div class="shortcut-category">
                        <h4 class="shortcut-category-name">{category.name}</h4>
                        {#each category.items as shortcut}
                          <div class="shortcut-row">
                            <span class="shortcut-action">{shortcut.action}</span>
                            <span class="shortcut-keys">
                              {#each shortcut.keys as key, i}
                                <kbd>{key}</kbd>
                                {#if i < shortcut.keys.length - 1}<span class="plus">+</span>{/if}
                              {/each}
                            </span>
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}

            <!-- ── Advanced ── -->
            {#if (!searching && activeCategory === "advanced") || (searching && categoryHasMatches("advanced"))}
              <!-- Custom CSS -->
              {#if !searching || sectionMatches(["css", "custom style", "theme override"])}
                <div class="settings-section">
                  <div class="section-header">
                    <h3>Custom CSS</h3>
                    <button class="reset-btn" onclick={resetCustomCss} title="Reset to defaults">
                      <RotateCcw size={12} />
                    </button>
                  </div>
                  <p class="field-hint">Override CSS variables or add custom styles. Applied globally.</p>
                  <textarea
                    class="custom-css-input"
                    bind:value={settings.custom_css}
                    rows={6}
                    placeholder={"/* Example: change accent color */\n:root {\n  --accent-default: #ff6b6b;\n}"}
                  ></textarea>
                  <div class="css-actions">
                    <button class="css-btn" onclick={() => { if (!settings) return; settings.custom_css = CSS_TEMPLATE; }}>Load Template</button>
                    <button class="css-btn secondary" onclick={() => { if (!settings) return; settings.custom_css = ""; }}>Clear</button>
                  </div>
                </div>
              {/if}

              <!-- TTS -->
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

              <!-- Auto Save -->
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

              <!-- Export -->
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

            <!-- ── About ── -->
            {#if (!searching && activeCategory === "about") || (searching && categoryHasMatches("about"))}
              {#if !searching || sectionMatches(["about", "version", "update", "credits", "features", "tech"])}
                <div class="settings-section about-content">
                  <div class="about-logo">
                    <img src={logo} alt="MarkZ logo" class="about-logo-img" />
                    <span class="logo-text">MarkZ</span>
                    <span class="logo-version">v{appVersion}</span>
                  </div>
                  <p class="about-description">
                    A dual-pane Markdown editor for engineers.
                  </p>

                  <div class="about-updates">
                    <span
                      class="update-status"
                      class:ready={$updateStatus === "ready"}
                      class:error={$updateStatus === "error"}
                    >
                      {statusLabel($updateStatus)}
                      {#if $updateVersion && ($updateStatus === "available" || $updateStatus === "downloading" || $updateStatus === "ready")}
                        <span class="update-version">(v{$updateVersion})</span>
                      {/if}
                    </span>
                    {#if $updateStatus === "ready"}
                      <button class="update-btn primary" onclick={confirmAndRestart}>Restart</button>
                    {:else if $updateStatus === "downloading" || $updateStatus === "checking"}
                      <button class="update-btn" disabled>Checking…</button>
                    {:else}
                      <button class="update-btn" onclick={handleCheckUpdate}>Check</button>
                    {/if}
                  </div>

                  <div class="about-links">
                    <a
                      href="https://github.com/tzero86/markz"
                      target="_blank"
                      rel="noopener"
                      class="about-link"
                    >
                      <ExternalLink size={14} strokeWidth={2} />
                      GitHub
                    </a>
                  </div>

                  <div class="tech-grid">
                    <span class="tech-badge">Tauri</span>
                    <span class="tech-badge">Svelte 5</span>
                    <span class="tech-badge">CodeMirror 6</span>
                    <span class="tech-badge">Rust</span>
                    <span class="tech-badge">TypeScript</span>
                    <span class="tech-badge">Vite</span>
                  </div>

                  <p class="about-credits">
                    Built by <a href="https://github.com/tzero86" target="_blank" rel="noopener">tzero86</a>. Powered by open source — thank you to
                    <a href="https://tauri.app" target="_blank" rel="noopener">Tauri</a>,
                    <a href="https://svelte.dev" target="_blank" rel="noopener">Svelte</a>,
                    <a href="https://codemirror.net" target="_blank" rel="noopener">CodeMirror</a>,
                    <a href="https://katex.org" target="_blank" rel="noopener">KaTeX</a>,
                    <a href="https://mermaid.js.org" target="_blank" rel="noopener">Mermaid</a>,
                    and <a href="https://docx-rs.rs" target="_blank" rel="noopener">docx-rs</a>.
                  </p>

                  {#if $updateError}
                    <p class="update-error">{$updateError}</p>
                  {/if}
                </div>
              {/if}
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

  /* Section */
  .settings-section {
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }
  .settings-section:last-of-type {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .settings-section h3 {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 0;
  }
  .reset-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .reset-btn:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 180px;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) 0;
  }
  .field-row.indent {
    padding-left: var(--space-5);
  }
  .field-label {
    font-size: var(--text-sm);
    color: var(--text-primary);
  }
  .field-row select,
  .field-row input[type="text"] {
    padding: var(--space-1) var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  .field-row input[type="number"] {
    padding: var(--space-1) var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    width: 72px;
    box-sizing: border-box;
  }
  .field-row select:focus,
  .field-row input:focus {
    border-color: var(--accent-default);
  }
  .input-group {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
  }
  .input-suffix {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
  .field-hint {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin: 0 0 var(--space-2) 0;
    line-height: 1.5;
  }
  .custom-css-input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    resize: vertical;
    outline: none;
  }
  .custom-css-input:focus {
    border-color: var(--accent-default);
  }
  .css-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  .css-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
  }
  .css-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
  }
  .css-btn.secondary {
    background: transparent;
    color: var(--text-secondary);
  }
  .custom-dict-input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    resize: vertical;
    outline: none;
  }
  .custom-dict-input:focus {
    border-color: var(--accent-default);
  }
  .dict-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .dict-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px var(--space-2);
    background: var(--accent-muted);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }
  .dict-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    padding: 0;
    margin-left: 2px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    border-radius: var(--radius-sm);
  }
  .dict-chip-remove:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .toggle-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-2) 0;
    cursor: pointer;
  }
  .toggle-label {
    display: flex;
    flex-direction: column;
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: 1.4;
  }
  .toggle-hint {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-top: 2px;
  }
  .toggle-row input[type="checkbox"] {
    width: 36px;
    height: 20px;
    appearance: none;
    background: var(--border-default);
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 2px;
    transition: background 150ms ease;
  }
  .toggle-row input[type="checkbox"]::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform 150ms ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .toggle-row input[type="checkbox"]:checked {
    background: var(--accent-default);
  }
  .toggle-row input[type="checkbox"]:checked::after {
    transform: translateX(16px);
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

  /* Help tab */
  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .shortcut-category {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .shortcut-category-name {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 0 0 var(--space-1) 0;
  }
  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
  }
  .shortcut-action {
    font-size: var(--text-sm);
    color: var(--text-primary);
  }
  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .shortcut-keys kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-secondary);
    box-shadow: 0 1px 0 var(--border-default);
  }
  .plus {
    color: var(--text-muted);
    font-size: 11px;
    margin: 0 2px;
  }

  /* About tab */
  .about-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .about-logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .about-logo-img {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
  }
  .logo-text {
    font-size: 26px;
    font-weight: 800;
    color: var(--accent-default);
    letter-spacing: -0.03em;
  }
  .logo-version {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
  .about-description {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  /* Minimal update row */
  .about-updates {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }
  .update-status {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .update-status.ready {
    color: var(--accent-default);
    font-weight: 600;
  }
  .update-status.error {
    color: #ef4444;
  }
  .update-version {
    color: var(--text-muted);
    font-weight: 400;
  }
  .update-btn {
    padding: 4px 12px;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms ease;
    white-space: nowrap;
  }
  .update-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-default);
  }
  .update-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .update-btn.primary {
    background: var(--accent-default);
    border-color: var(--accent-default);
    color: white;
  }
  .update-btn.primary:hover {
    background: var(--accent-hover);
  }
  .update-error {
    font-size: 12px;
    color: #ef4444;
    margin: 0;
  }

  /* GitHub link */
  .about-links {
    display: flex;
    gap: var(--space-3);
  }
  .about-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
    transition: all 150ms ease;
  }
  .about-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  /* Tech badges */
  .tech-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .tech-badge {
    padding: 3px 8px;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
  }

  /* Credits */
  .about-credits {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }
  .about-credits a {
    color: var(--accent-default);
    text-decoration: none;
  }
  .about-credits a:hover {
    text-decoration: underline;
  }

  /* TTS */
  .voice-status {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-style: italic;
  }
  .rate-control {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .rate-control input[type="range"] {
    width: 120px;
    accent-color: var(--accent-default);
    cursor: pointer;
  }
  .rate-value {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    min-width: 36px;
    text-align: right;
  }
  .test-voice-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--accent-default);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .test-voice-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .test-voice-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--border-default);
    color: var(--text-muted);
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
