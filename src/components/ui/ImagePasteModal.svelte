<script lang="ts">
  import { X } from "@lucide/svelte";
  import { trapFocus } from "../../lib/focusTrap";

  interface Props {
    open: boolean;
    previewUrl: string;
    filename: string;
    onConfirm: (altText: string) => void;
    onCancel: () => void;
  }

  let { open, previewUrl, filename, onConfirm, onCancel }: Props = $props();
  let altText = $state("");
  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (open) {
      altText = "";
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleConfirm();
    }
  }

  function handleConfirm() {
    onConfirm(altText.trim());
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === "Escape") onCancel(); }} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Insert image" use:trapFocus>
      <div class="modal-header">
        <h2>Insert Image</h2>
        <button class="close-btn" onclick={onCancel} aria-label="Cancel">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-body">
        <div class="image-preview">
          <img src={previewUrl} alt="Preview of {filename}" />
        </div>
        <p class="filename">{filename}</p>
        <label class="alt-label" for="image-alt-text">Alt text</label>
        <input
          id="image-alt-text"
          class="alt-input"
          type="text"
          bind:value={altText}
          bind:this={inputRef}
          placeholder="Describe this image"
          onkeydown={handleKeydown}
        />
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onCancel}>Cancel</button>
        <button class="btn-primary" onclick={handleConfirm}>Insert Image</button>
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
  .image-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    min-height: 120px;
    max-height: 240px;
    overflow: hidden;
  }
  .image-preview img {
    max-width: 100%;
    max-height: 220px;
    object-fit: contain;
  }
  .filename {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    text-align: center;
    word-break: break-all;
  }
  .alt-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
  }
  .alt-input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }
  .alt-input:focus {
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
  .btn-primary:hover {
    filter: brightness(1.1);
  }
</style>
