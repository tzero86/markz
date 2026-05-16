<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { cursorPosition } from "../../lib/editorStore";
  import { contentZoomStore } from "../../lib/contentZoomStore";

  let { viewMode, onSetViewMode }: { viewMode: "split" | "editor" | "preview"; onSetViewMode: (mode: "split" | "editor" | "preview") => void } = $props();

  let wordCount = $derived(
    $documentStore.content.trim() === ""
      ? 0
      : $documentStore.content.content.trim().split(/\s+/).filter((w) => w.length > 0).length
  );
  let charCount = $derived($documentStore.content.length);

  const modes: { mode: "split" | "editor" | "preview"; label: string; shortcut?: string }[] = [
    { mode: "split", label: "Split", shortcut: "Ctrl+1" },
    { mode: "editor", label: "Editor", shortcut: "Ctrl+2" },
    { mode: "preview", label: "Preview", shortcut: "Ctrl+3" },
  ];
</script>

<div class="statusbar">
  <div class="status-left">
    <div class="save-indicator" class:unsaved={$documentStore.isDirty}>
      <span class="save-dot"></span>
      <span class="save-text">{$documentStore.isDirty ? "Unsaved" : "Saved"}</span>
    </div>
    <div class="status-divider"></div>
    <span class="status-item cursor-info">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="7" x2="20" y2="7"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="5" y1="20" x2="19" y2="20"/>
      </svg>
      Ln {$cursorPosition.line}, Col {$cursorPosition.column}
    </span>
  </div>

  <div class="status-center">
    <button
      class="zoom-badge"
      onclick={() => contentZoomStore.reset()}
      title="Click to reset zoom (Ctrl+0)"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
      <span>{Math.round($contentZoomStore * 100)}%</span>
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
              <rect x="3" y="3" width="7" height="18" rx="1.5" />
              <rect x="14" y="3" width="7" height="18" rx="1.5" />
            </svg>
          {:else if mode === "editor"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1.5" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="14" y2="12" />
              <line x1="8" y1="16" x2="12" y2="16" />
            </svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1.5" />
              <path d="M8 9h8M8 13h6M8 17h4" />
            </svg>
          {/if}
          <span class="view-label">{label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="status-right">
    <span class="stat-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
      {wordCount}
    </span>
    <span class="stat-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
      {charCount}
    </span>
    <div class="status-divider"></div>
    <span class="status-item format-badge">Markdown</span>
    <span class="status-item format-badge">UTF-8</span>
  </div>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: background-color 300ms var(--ease-in-out),
                border-color 300ms var(--ease-in-out);
    gap: var(--space-4);
  }

  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .status-center {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    justify-content: center;
  }

  .status-divider {
    width: 1px;
    height: 14px;
    background: var(--border-default);
    margin: 0 2px;
  }

  /* Save indicator */
  .save-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 1px 8px 1px 6px;
    border-radius: var(--radius-full);
    background: var(--bg-subtle);
    transition: background 200ms ease;
  }
  .save-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--success);
    transition: background 200ms ease, box-shadow 200ms ease;
    box-shadow: 0 0 0 2px transparent;
  }
  .save-indicator.unsaved .save-dot {
    background: var(--warning);
    box-shadow: 0 0 0 2px var(--warning-bg);
    animation: pulse-dot 2s ease infinite;
  }
  .save-text {
    font-weight: 500;
    font-size: var(--text-xs);
    transition: color 200ms ease;
  }
  .save-indicator.unsaved .save-text {
    color: var(--warning);
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.85); opacity: 0.7; }
  }

  .status-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  .cursor-info {
    font-family: var(--font-mono);
    font-size: 11px;
  }

  /* Stat badges */
  .stat-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font-mono);
    transition: background 150ms ease;
  }
  .stat-badge:hover {
    background: var(--bg-hover);
  }

  .format-badge {
    padding: 1px 6px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Zoom badge */
  .zoom-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    font-size: 11px;
    font-family: var(--font-mono);
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms var(--ease-out);
  }
  .zoom-badge:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-focus);
    transform: translateY(-0.5px);
  }
  .zoom-badge:active {
    transform: scale(0.96);
  }

  /* View toggle */
  .view-toggle {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-xs);
  }
  .view-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 10px;
    height: 22px;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    position: relative;
    font-size: var(--text-xs);
  }
  .view-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .view-btn.active {
    background: var(--bg-active);
    color: var(--text-primary);
    font-weight: 500;
  }
  .view-btn.active::after {
    content: "";
    position: absolute;
    bottom: 1px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--accent-default);
    border-radius: var(--radius-full);
  }
  .view-btn:not(:last-child) {
    border-right: 1px solid var(--border-default);
  }
  .view-label {
    font-size: 11px;
  }

  @media (max-width: 700px) {
    .view-label {
      display: none;
    }
    .view-btn {
      padding: 0 6px;
    }
  }
</style>
