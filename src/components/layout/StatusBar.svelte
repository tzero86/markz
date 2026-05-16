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
</script>

<div class="statusbar">
  <div class="status-left">
    {#if $documentStore.isDirty}
      <span class="status-item unsaved">Unsaved changes</span>
    {:else}
      <span class="status-item saved">Saved</span>
    {/if}
    <span class="status-item">Ln {$cursorPosition.line}, Col {$cursorPosition.column}</span>
  </div>
  <div class="status-center">
    <button class="zoom-indicator" onclick={() => contentZoomStore.reset()} title="Click to reset zoom (Ctrl+0)">
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
    <span class="status-item">{wordCount} words</span>
    <span class="status-item">{charCount} chars</span>
    <span class="status-item">Markdown</span>
    <span class="status-item">UTF-8</span>
  </div>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    padding: 0 var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .status-left, .status-right, .status-center {
    display: flex;
    align-items: center;
    gap: var(--space-4);
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
  .unsaved {
    color: var(--accent-default);
  }
  .saved {
    color: var(--success);
  }

  .view-toggle {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 20px;
    background: transparent;
    border: none;
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
  .view-btn:not(:last-child) {
    border-right: 1px solid var(--border-default);
  }

  .zoom-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 20px;
    padding: 0 4px;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
  }
  .zoom-indicator:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-focus);
  }
</style>
