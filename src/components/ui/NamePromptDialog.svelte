<script lang="ts">
  import { X } from "@lucide/svelte";
  import { trapFocus } from "../../lib/focusTrap";

  interface Props {
    open: boolean;
    title: string;
    label: string;
    value?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
  }

  let {
    open,
    title,
    label,
    value = "",
    confirmLabel = "OK",
    onConfirm,
    onClose,
  }: Props = $props();

  let inputValue = $state("");

  $effect(() => {
    if (open) {
      inputValue = value;
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
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label={title} use:trapFocus>
      <div class="modal-header">
        <h2>{title}</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label for="prompt-input">{label}</label>
          <input id="prompt-input" type="text" bind:value={inputValue} />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn-primary" onclick={submit} disabled={!inputValue.trim()}>
          {confirmLabel}
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
    z-index: 1100;
  }
  .modal-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    width: min(420px, calc(100vw - var(--space-8)));
    max-width: 100%;
    display: flex;
    flex-direction: column;
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
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .field label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
  }
  .field input {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-primary);
    outline: none;
  }
  .field input:focus {
    border-color: var(--accent-default);
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
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
