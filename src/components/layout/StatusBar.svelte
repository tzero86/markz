<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { cursorPosition } from "../../lib/editorStore";
  import { contentZoomStore } from "../../lib/contentZoomStore";

  let { viewMode, onSetViewMode }: { viewMode: "split" | "editor" | "preview"; onSetViewMode: (mode: "split" | "editor" | "preview") => void } = $props();

  let wordCount = $derived(
    $documentStore.content.trim() === ""
      ? 0
      : $documentStore.content.trim().split(/\s+/).filter((w) => w.length > 0).length
  );
  let charCount = $derived($documentStore.content.length);

  const modes: { mode: "split" | "editor" | "preview"; label: string }[] = [
    { mode: "split", label: "Split" },
    { mode: "editor", label: "Editor" },
    { mode: "preview", label: "Preview" },
  ];

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }
</script>

<div class="statusbar">
  <div class="status-left">
    <div class="save-indicator" class:dirty={$documentStore.isDirty}>
      <span class="save-dot"></span>
      <span class="save-label">{$documentStore.isDirty ? "Unsaved" : "Saved"}</span>
    </div>
    <span class="status-sep"></span>
    <span class="status-item cursor">Ln {$cursorPosition.line}, Col {$cursorPosition.column}</span>
  </div>

  <div class="status-center">
    <button class="zoom-btn" onclick={() => contentZoomStore.reset()} title="Reset zoom (Ctrl+0)">
      {Math.round($contentZoomStore * 100)}%
    </button>
    <div class="view-toggle" role="group" aria-label="View mode">
      {#each modes as { mode, label }}
        <button
          class="view-btn"
          class:active={viewMode === mode}
          onclick={() => onSetViewMode(mode)}
          aria-label={label}
          title={label}
        >
          {#if mode === "split"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          {:else if mode === "editor"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="14" y2="12" />
              <line x1="8" y1="16" x2="12" y2="16" />
            </svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <path d="M8 9h8M8 13h6M8 17h4" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="status-right">
    <span class="status-item">{formatNumber(wordCount)} words</span>
    <span class="status-sep"></span>
    <span class="status-item">{formatNumber(charCount)} chars</span>
    <span class="status-sep"></span>
    <span class="status-item format">Markdown</span>
  </div>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    padding: 0 var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    font-size: 11px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .status-left, .status-right, .status-center {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .status-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
  .status-item {
    display: inline-flex;
    align-items: center;
  }
  .status-item.cursor {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
  }
  .status-item.format {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
    color: var(--text-tertiary);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
  }
  .status-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--border-default);
  }

  .save-indicator {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    transition: border-color 150ms ease, background 150ms ease;
  }
  .save-indicator.dirty {
    border-color: var(--accent-muted);
    background: var(--accent-subtle);
  }
  .save-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--success);
  }
  .save-indicator.dirty .save-dot {
    background: var(--accent-default);
    animation: pulse-dot 2s infinite;
  }
  .save-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .save-indicator.dirty .save-label {
    color: var(--text-accent);
  }

  .zoom-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 20px;
    padding: 0 6px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 10px;
    font-family: var(--font-mono);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
  }
  .zoom-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-focus);
  }

  .view-toggle {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    padding: 2px;
    gap: 1px;
  }
  .view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: calc(var(--radius-md) - 2px);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    padding: 0;
  }
  .view-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .view-btn.active {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
