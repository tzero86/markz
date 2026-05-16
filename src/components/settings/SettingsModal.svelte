<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getVersion } from "@tauri-apps/api/app";
  import {
    checkForUpdate,
    downloadUpdate,
    confirmAndRestart,
    updateStatus,
    updateVersion,
    updateError,
  } from "../../lib/updater";
  import { themeStore, type Theme } from "../../lib/themeStore";
  import logo from "../../assets/logo.png";

  let { open = $bindable(false), initialTab = "settings" as "settings" | "help" | "about" } = $props();

  let activeTab = $state<"settings" | "help" | "about">("settings");
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
  } | null = $state(null);

  let loading = $state(true);
  let appVersion = $state<string>("");

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
    { keys: ["Ctrl", "T"], action: "New file" },
    { keys: ["Ctrl", "W"], action: "Close tab" },
    { keys: ["Ctrl", "O"], action: "Open file" },
    { keys: ["Ctrl", "S"], action: "Save file" },
    { keys: ["Ctrl", "B"], action: "Toggle outline sidebar" },
    { keys: ["Ctrl", "+"], action: "Zoom in" },
    { keys: ["Ctrl", "-"], action: "Zoom out" },
    { keys: ["Ctrl", "0"], action: "Reset zoom" },
    { keys: ["Ctrl", "B"], action: "Bold (in editor)", context: "editor" },
    { keys: ["Ctrl", "I"], action: "Italic (in editor)", context: "editor" },
    { keys: ["Esc"], action: "Close modal / dropdown" },
  ];

  $effect(() => {
    if (open && !settings) {
      loadSettings();
    }
    if (open && !prevOpen) {
      activeTab = initialTab;
    }
    prevOpen = open;
  });

  async function loadSettings() {
    loading = true;
    try {
      settings = await invoke("get_settings");
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      loading = false;
    }
  }

  async function save() {
    if (!settings) return;
    try {
      await invoke("update_settings", { settings });
      // Apply theme immediately
      themeStore.set(settings.theme as Theme);
      // Notify app to reload settings
      window.dispatchEvent(
        new CustomEvent("markz:settings-changed", {
          detail: {
            fontFamily: settings.editor_font_family,
            fontSize: settings.editor_font_size,
            lineHeight: settings.line_height,
            showOutline: settings.show_outline,
            viewMode: settings.view_mode,
            previewFontSize: settings.preview_font_size,
            reducedMotion: settings.reduced_motion,
            uiFontSize: settings.ui_font_size,
            wordWrap: settings.word_wrap,
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
    const update = await checkForUpdate(false);
    if (update) {
      await downloadUpdate();
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case "idle":
        return "Idle";
      case "checking":
        return "Checking for updates…";
      case "available":
        return "Update available";
      case "downloading":
        return "Downloading update…";
      case "ready":
        return "Update ready — restart to apply";
      case "up-to-date":
        return "You're on the latest version";
      case "error":
        return "Update check failed";
      default:
        return status;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Settings">
      <div class="modal-header">
        <h2>Settings</h2>
        <button
          class="close-btn"
          onclick={() => (open = false)}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === "settings"}
          onclick={() => (activeTab = "settings")}
        >
          Settings
        </button>
        <button
          class="tab"
          class:active={activeTab === "help"}
          onclick={() => (activeTab = "help")}
        >
          Help
        </button>
        <button
          class="tab"
          class:active={activeTab === "about"}
          onclick={() => (activeTab = "about")}
        >
          About
        </button>
      </div>

      <div class="modal-body">
        {#if activeTab === "settings"}
          {#if loading}
            <div class="loading">Loading…</div>
          {:else if settings}
            <!-- Appearance -->
            <div class="settings-section">
              <h3>Appearance</h3>
              <div class="field-row">
                <label class="field-label" for="theme-select">Theme</label>
                <select id="theme-select" bind:value={settings.theme}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
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
                  <input
                    id="font-size"
                    type="number"
                    min="8"
                    max="32"
                    bind:value={settings.editor_font_size}
                  />
                  <span class="input-suffix">px</span>
                </div>
              </div>
              <div class="field-row">
                <label class="field-label" for="line-height">Line height</label>
                <div class="input-group">
                  <input
                    id="line-height"
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    bind:value={settings.line_height}
                  />
                </div>
              </div>
            </div>

            <!-- Editor -->
            <div class="settings-section">
              <h3>Editor</h3>
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
            </div>

            <!-- Layout -->
            <div class="settings-section">
              <h3>Layout</h3>
              <label class="toggle-row">
                <span class="toggle-label">
                  Show outline panel
                  <span class="toggle-hint">Display the document outline sidebar by default</span>
                </span>
                <input type="checkbox" bind:checked={settings.show_outline} />
              </label>
              <div class="field-row">
                <label class="field-label" for="view-mode">Default view mode</label>
                <select id="view-mode" bind:value={settings.view_mode}>
                  <option value="split">Split (editor + preview)</option>
                  <option value="editor">Editor only</option>
                  <option value="preview">Preview only</option>
                </select>
              </div>
            </div>

            <!-- Accessibility -->
            <div class="settings-section">
              <h3>Accessibility</h3>
              <div class="field-row">
                <label class="field-label" for="ui-font-size">Interface font size</label>
                <div class="input-group">
                  <input
                    id="ui-font-size"
                    type="number"
                    min="10"
                    max="24"
                    bind:value={settings.ui_font_size}
                  />
                  <span class="input-suffix">px</span>
                </div>
              </div>
              <div class="field-row">
                <label class="field-label" for="preview-font-size">Preview font size</label>
                <div class="input-group">
                  <input
                    id="preview-font-size"
                    type="number"
                    min="8"
                    max="32"
                    bind:value={settings.preview_font_size}
                  />
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

            <!-- Auto Save -->
            <div class="settings-section">
              <h3>Auto Save</h3>
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
                    <input
                      id="auto-save-interval"
                      type="number"
                      min="5"
                      max="300"
                      bind:value={settings.auto_save_interval_seconds}
                    />
                    <span class="input-suffix">seconds</span>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Export -->
            <div class="settings-section">
              <h3>Export</h3>
              <label class="toggle-row">
                <span class="toggle-label">
                  Embed remote images
                  <span class="toggle-hint">Download and embed remote images in DOCX exports</span>
                </span>
                <input
                  type="checkbox"
                  bind:checked={settings.embed_remote_images}
                />
              </label>
            </div>
          {:else}
            <div class="error">Failed to load settings.</div>
          {/if}
        {:else if activeTab === "help"}
          <div class="shortcuts-list">
            {#each shortcuts as shortcut}
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
        {:else}
          <div class="about-content">
            <div class="about-logo">
              <img src={logo} alt="MarkZ logo" class="about-logo-img" />
              <span class="logo-text">MarkZ</span>
              <span class="logo-version">v{appVersion}</span>
            </div>
            <p class="about-description">
              A dual-pane Markdown editor for engineers. Built with Tauri, Svelte
              5, CodeMirror 6, and Rust.
            </p>

            <div class="about-updates">
              <h4>Updates</h4>
              <div class="update-row">
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
                  <button class="update-btn primary" onclick={confirmAndRestart}>
                    Restart to Update
                  </button>
                {:else if $updateStatus === "downloading" || $updateStatus === "checking"}
                  <button class="update-btn" disabled>Checking…</button>
                {:else}
                  <button class="update-btn" onclick={handleCheckUpdate}>
                    Check for Updates
                  </button>
                {/if}
              </div>
              {#if $updateError}
                <p class="update-error">{$updateError}</p>
              {/if}
            </div>

            <div class="about-features">
              <h4>Features</h4>
              <ul>
                <li>Live preview with math, Mermaid diagrams, and syntax highlighting</li>
                <li>Export to JIRA, Confluence, Slack, GitHub, and DOCX</li>
                <li>Built-in engineering templates (RFC, ADR, Bug Report, etc.)</li>
                <li>Image paste & drag-and-drop support</li>
                <li>Dark / light / system themes</li>
                <li>Multi-tab editing with unsaved change warnings</li>
              </ul>
            </div>

            <div class="about-tech">
              <h4>Tech Stack</h4>
              <div class="tech-grid">
                <span class="tech-badge">Tauri v2</span>
                <span class="tech-badge">Svelte 5</span>
                <span class="tech-badge">CodeMirror 6</span>
                <span class="tech-badge">Rust</span>
                <span class="tech-badge">TypeScript</span>
                <span class="tech-badge">Vite</span>
              </div>
            </div>

            <div class="about-credits">
              <h4>Credits</h4>
              <p class="credits-text">
                Built by <a href="https://github.com/tzero86" target="_blank" rel="noopener">tzero86</a>.
                Powered by open source — thank you to the teams behind
                <a href="https://tauri.app" target="_blank" rel="noopener">Tauri</a>,
                <a href="https://svelte.dev" target="_blank" rel="noopener">Svelte</a>,
                <a href="https://codemirror.net" target="_blank" rel="noopener">CodeMirror</a>,
                <a href="https://pulldown-cmark.rs" target="_blank" rel="noopener">pulldown-cmark</a>,
                <a href="https://katex.org" target="_blank" rel="noopener">KaTeX</a>,
                <a href="https://mermaid.js.org" target="_blank" rel="noopener">Mermaid</a>,
                <a href="https://highlightjs.org" target="_blank" rel="noopener">highlight.js</a>,
                and <a href="https://docx-rs.rs" target="_blank" rel="noopener">docx-rs</a>.
              </p>
            </div>
          </div>
        {/if}
      </div>

      {#if activeTab === "settings"}
        <div class="modal-footer">
          <button class="btn-secondary" onclick={() => (open = false)}>Cancel</button>
          <button class="btn-primary" onclick={save}>Save</button>
        </div>
      {/if}
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
    width: 560px;
    max-width: 90vw;
    height: 640px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 200ms ease-out;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
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

  .tabs {
    display: flex;
    gap: var(--space-1);
    padding: 0 var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }
  .tab {
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 150ms ease, border-color 150ms ease;
  }
  .tab:hover {
    color: var(--text-primary);
  }
  .tab.active {
    color: var(--accent-default);
    border-bottom-color: var(--accent-default);
  }

  .modal-body {
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
    flex: 1;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--border-default);
  }

  .settings-section {
    margin-bottom: var(--space-5);
  }
  .settings-section:last-child {
    margin-bottom: 0;
  }
  .settings-section h3 {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 0 0 var(--space-3) 0;
  }
  .field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
  .field-row input[type="number"] {
    padding: var(--space-1) var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    min-width: 120px;
  }
  .field-row select:focus,
  .field-row input:focus {
    border-color: var(--accent-default);
  }
  .input-group {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }
  .input-suffix {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .toggle-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
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
  .error {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: center;
    padding: var(--space-8) 0;
  }

  /* Help tab */
  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
  }
  .logo-text {
    font-size: 28px;
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
    line-height: 1.6;
    margin: 0;
  }
  .about-features h4,
  .about-tech h4,
  .about-updates h4,
  .about-credits h4 {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 0 0 var(--space-2) 0;
  }
  .about-features ul {
    margin: 0;
    padding-left: var(--space-5);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.7;
  }
  .about-features li {
    margin: var(--space-1) 0;
  }
  .tech-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .tech-badge {
    padding: 4px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* Updates */
  .about-updates {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }
  .update-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
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
    padding: 6px 14px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    white-space: nowrap;
  }
  .update-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
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
    margin: var(--space-2) 0 0 0;
  }

  /* Credits */
  .about-credits {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }
  .credits-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
  .credits-text a {
    color: var(--accent-default);
    text-decoration: none;
  }
  .credits-text a:hover {
    text-decoration: underline;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
