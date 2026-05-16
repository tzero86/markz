<script lang="ts">
  import { onMount } from "svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import {
    checkForUpdate,
    downloadUpdate,
    confirmAndRestart,
    updateStatus,
    updateVersion,
    updateError,
  } from "../../lib/updater";

  let { open = $bindable(false) } = $props();

  let activeTab = $state<"shortcuts" | "about">("shortcuts");
  let appVersion = $state<string>("");

  const shortcuts = [
    { keys: ["Ctrl", "O"], action: "Open file" },
    { keys: ["Ctrl", "S"], action: "Save file" },
    { keys: ["Ctrl", "B"], action: "Toggle sidebar" },
    { keys: ["Ctrl", "B"], action: "Bold (in editor)", context: "editor" },
    { keys: ["Ctrl", "I"], action: "Italic (in editor)", context: "editor" },
    { keys: ["Esc"], action: "Close modal / dropdown" },
  ];

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Help">
      <div class="modal-header">
        <h2>Help</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === "shortcuts"}
          onclick={() => (activeTab = "shortcuts")}
        >
          Shortcuts
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
        {#if activeTab === "shortcuts"}
          <div class="shortcuts-list">
            {#each shortcuts as shortcut}
              <div class="shortcut-row">
                <span class="shortcut-action">{shortcut.action}</span>
                <span class="shortcut-keys">
                  {#each shortcut.keys as key, i}
                    <kbd>{key}</kbd>{#if i < shortcut.keys.length - 1}<span class="plus">+</span>{/if}
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="about-content">
            <div class="about-logo">
              <span class="logo-text">MarkZ</span>
              <span class="logo-version">v{appVersion}</span>
            </div>
            <p class="about-description">
              A dual-pane Markdown editor for engineers. Built with Tauri, Svelte 5,
              CodeMirror 6, and Rust.
            </p>

            <!-- Updates -->
            <div class="about-updates">
              <h4>Updates</h4>
              <div class="update-row">
                <span class="update-status" class:ready={$updateStatus === "ready"} class:error={$updateStatus === "error"}>
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
    width: 520px;
    max-width: 90vw;
    max-height: 70vh;
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

  .about-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .about-logo {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
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
    color: var(--error);
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
    color: var(--error);
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
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
