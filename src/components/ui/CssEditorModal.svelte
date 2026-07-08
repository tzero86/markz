<script lang="ts">
  import { X } from "@lucide/svelte";
  import { trapFocus } from "../../lib/focusTrap";

  interface Props {
    open: boolean;
    value: string;
    onSave: (value: string) => void;
    onClose: () => void;
  }

  let { open, value, onSave, onClose }: Props = $props();
  let draft = $state("");

  $effect(() => {
    if (open) {
      draft = value;
    }
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    } else if (event.key === "Tab") {
      // Insert two spaces instead of moving focus.
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      draft = draft.slice(0, start) + "  " + draft.slice(end);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === "Escape") onClose(); }} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Custom CSS Editor" use:trapFocus>
      <div class="modal-header">
        <h2>Custom CSS Editor</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-body">
        <textarea
          class="css-editor"
          bind:value={draft}
          rows={20}
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          onkeydown={handleKeydown}
        ></textarea>
        <p class="hint">
          Overrides are applied globally. Use <kbd>Ctrl+Enter</kbd> to save, <kbd>Tab</kbd> to insert two spaces.
        </p>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn-primary" onclick={handleSave}>Apply CSS</button>
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
    z-index: 1100;
  }
  .modal-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    width: min(720px, calc(100vw - var(--space-8)));
    max-width: 100%;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--space-8));
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }
  .modal-header h2 {
    margin: 0;
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-primary);
  }
  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }
  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .modal-body {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
  }
  .css-editor {
    width: 100%;
    min-height: 280px;
    resize: vertical;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.6;
    color: var(--text-primary);
    outline: none;
    tab-size: 2;
  }
  .css-editor:focus {
    border-color: var(--accent-default);
  }
  .hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  .hint kbd {
    background: var(--bg-hover);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 1px 4px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: 1px solid var(--border-default);
  }
  .btn-secondary,
  .btn-primary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn-secondary {
    background: transparent;
    border-color: var(--border-default);
    color: var(--text-secondary);
  }
  .btn-secondary:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .btn-primary {
    background: var(--accent-default);
    color: var(--text-inverse);
  }
  .btn-primary:hover {
    filter: brightness(1.1);
  }
</style>
