<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { get } from "svelte/store";
  import { documentStore } from "../../lib/documentStore";

  let { open = $bindable(false) } = $props();

  let name = $state("");
  let category = $state("Custom");
  let description = $state("");
  let saving = $state(false);

  const categories = [
    "Custom",
    "Engineering",
    "General",
    "Meeting",
    "Planning",
    "Review",
  ];

  $effect(() => {
    if (open) {
      const doc = get(documentStore);
      name = doc.title !== "Untitled" ? doc.title : "";
      description = "";
      category = "Custom";
    }
  });

  async function save() {
    if (!name.trim()) return;
    saving = true;
    try {
      const doc = get(documentStore);
      const id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await invoke("save_template", {
        id,
        name: name.trim(),
        category,
        description: description.trim(),
        content: doc.content,
      });
      open = false;
    } catch (e) {
      console.error("Failed to save template:", e);
    } finally {
      saving = false;
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
    <div class="modal-panel" role="dialog" aria-label="Save as Template">
      <div class="modal-header">
        <h2>Save as Template</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label for="tmpl-name">Name</label>
          <input
            id="tmpl-name"
            type="text"
            bind:value={name}
            placeholder="e.g., Sprint Retrospective"
          />
        </div>

        <div class="field">
          <label for="tmpl-category">Category</label>
          <select id="tmpl-category" bind:value={category}>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <label for="tmpl-desc">Description</label>
          <textarea
            id="tmpl-desc"
            bind:value={description}
            placeholder="Brief description of what this template is for..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => (open = false)}>Cancel</button>
        <button class="btn-primary" onclick={save} disabled={!name.trim() || saving}>
          {saving ? "Saving…" : "Save Template"}
        </button>
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
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .field label {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
  .field input,
  .field select,
  .field textarea {
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    transition: border-color 150ms ease;
    font-family: inherit;
  }
  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    border-color: var(--accent-default);
  }
  .field input::placeholder,
  .field textarea::placeholder {
    color: var(--text-muted);
  }
  .field textarea {
    resize: vertical;
    min-height: 60px;
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
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
