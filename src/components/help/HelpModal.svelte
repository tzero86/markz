<script lang="ts">
  import { onMount } from "svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import { X } from "@lucide/svelte";
  import {
    checkForUpdate,
    confirmAndDownload,
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
    { keys: ["Ctrl", "Shift", "O"], action: "Open folder / workspace" },
    { keys: ["Ctrl", "T"], action: "New file" },
    { keys: ["Ctrl", "Shift", "P"], action: "Command palette" },
    { keys: ["Ctrl", "P"], action: "Quick open files" },
    { keys: ["Ctrl", "S"], action: "Save file" },
    { keys: ["Ctrl", "W"], action: "Close active tab" },
    { keys: ["Ctrl", "B"], action: "Toggle sidebar panel" },
    { keys: ["Ctrl", "F"], action: "Find / Replace" },
    { keys: ["Ctrl", "Shift", "D"], action: "Git diff panel" },
    { keys: ["Ctrl", "="], action: "Zoom in" },
    { keys: ["Ctrl", "-"], action: "Zoom out" },
    { keys: ["Ctrl", "0"], action: "Reset zoom" },
    { keys: ["Esc"], action: "Close modal / dropdown" },
  ];

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
          <X size={16} strokeWidth={1.5} />
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
              <ul>
                <li>Live preview with math, Mermaid diagrams, and syntax highlighting</li>
                <li>Export to JIRA, Confluence, Slack, GitHub, HTML, and DOCX</li>
                <li>Workspace mode — open folders, file tree, project-wide search</li>
                <li>WikiLinks & backlinks — [[Target]] syntax with automatic discovery</li>
                <li>Inline table editing — double-click tables to edit in a grid</li>
                <li>Text snippets with tab-triggered expansion</li>
                <li>Auto-save with configurable debounce</li>
                <li>Session restore — all tabs persisted across launches</li>
                <li>Git integration — branch status and diff panel</li>
                <li>Built-in engineering templates (RFC, ADR, Bug Report, etc.)</li>
                <li>Image paste & drag-and-drop support</li>
                <li>Dark / light / system themes with custom CSS support</li>
              </ul>

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
    width: 560px;
    max-width: 90vw;
    max-height: 80vh;
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
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-subtle);
    padding: 0 var(--space-4);
  }
  .tabs .tab {
    padding: var(--space-2) var(--space-4);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease;
  }
  .tabs .tab:hover {
    color: var(--text-primary);
  }
  .tabs .tab.active {
    color: var(--accent-default);
    border-bottom-color: var(--accent-default);
  }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
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
    border-radius: var(--radius-sm);
  }
  .shortcut-row:hover {
    background: var(--bg-hover);
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
  kbd {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 20px;
    justify-content: center;
  }
  .plus {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .about-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-5);
    padding: var(--space-4) 0;
  }
  .about-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }
  .logo-text {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-accent);
    letter-spacing: -0.02em;
  }
  .logo-version {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
  .about-description {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 380px;
    line-height: 1.6;
  }
  .about-updates,
  .about-features,
  .about-tech,
  .about-credits {
    width: 100%;
    text-align: left;
    padding: var(--space-4) var(--space-4);
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
  }
  .about-updates h4,
  .about-features h4,
  .about-tech h4,
  .about-credits h4 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-3) 0;
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
  }
  .update-status.ready {
    color: var(--accent-default);
    font-weight: 600;
  }
  .update-status.error {
    color: var(--error);
  }
  .update-version {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  .update-error {
    font-size: var(--text-xs);
    color: var(--error);
    margin-top: var(--space-2);
  }
  .update-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms ease, border-color 150ms ease;
  }
  .update-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-focus);
  }
  .update-btn.primary {
    background: var(--accent-default);
    color: var(--text-inverse);
    border-color: var(--accent-default);
  }
  .update-btn.primary:hover {
    background: var(--accent-hover);
  }
  .about-features ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .about-features li {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    padding-left: var(--space-3);
    position: relative;
  }
  .about-features li::before {
    content: "—";
    position: absolute;
    left: 0;
    color: var(--text-tertiary);
  }
  .tech-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .tech-badge {
    display: inline-flex;
    padding: 2px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }
  .credits-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.7;
  }
  .credits-text a {
    color: var(--text-accent);
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
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
