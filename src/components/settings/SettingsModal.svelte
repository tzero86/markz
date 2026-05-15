<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let { open = $bindable(false) } = $props();

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
  } | null = $state(null);

  let loading = $state(true);

  $effect(() => {
    if (open && !settings) {
      loadSettings();
    }
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal-panel" role="dialog" aria-label="Settings">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="loading">Loading…</div>
        {:else if settings}
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
    width: 480px;
    max-width: 90vw;
    max-height: 80vh;
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
  .settings-section {
    margin-bottom: var(--space-4);
  }
  .settings-section h3 {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 0 0 var(--space-3) 0;
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
  .loading,
  .error {
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
