<script lang="ts">
  import { Columns2, AlignLeft, Eye, Type, ZoomIn, Text, GitBranch } from "@lucide/svelte";
  import { activeDocumentStore } from "../../lib/tabStore";
  import { cursorPosition } from "../../lib/editorStore";
  import { contentZoomStore } from "../../lib/contentZoomStore";
  import { invoke } from "@tauri-apps/api/core";
  let { viewMode, onSetViewMode }: { viewMode: "split" | "editor" | "preview"; onSetViewMode: (mode: "split" | "editor" | "preview") => void } = $props();

  let wordCount = $derived(
    $activeDocumentStore.content.trim() === ""
      ? 0
      : $activeDocumentStore.content.trim().split(/\s+/).filter((w) => w.length > 0).length
  );
  let charCount = $derived($activeDocumentStore.content.length);
  let readingTimeMinutes = $derived(Math.max(1, Math.ceil(wordCount / 200)));

  let gitStatus = $state<{ is_repo: boolean; branch: string | null; is_modified: boolean } | null>(null);

  $effect(() => {
    const path = $activeDocumentStore.path;
    if (!path) {
      gitStatus = null;
      return;
    }
    invoke("git_status", { docPath: path })
      .then((status) => { gitStatus = status as { is_repo: boolean; branch: string | null; is_modified: boolean }; })
      .catch(() => { gitStatus = null; });
  });
  const modes: { mode: "split" | "editor" | "preview"; label: string; shortcut?: string }[] = [
    { mode: "split", label: "Split", shortcut: "Ctrl+1" },
    { mode: "editor", label: "Editor", shortcut: "Ctrl+2" },
    { mode: "preview", label: "Preview", shortcut: "Ctrl+3" },
  ];
</script>

<div class="statusbar">
  <div class="status-left">
    <div class="save-indicator" class:unsaved={$activeDocumentStore.isDirty}>
      <span class="save-dot"></span>
      <span class="save-text">{$activeDocumentStore.isDirty ? "Unsaved" : "Saved"}</span>
    </div>
    <div class="status-divider"></div>
    <span class="status-item cursor-info">
      <Type size={12} strokeWidth={2} />
      Ln {$cursorPosition.line}, Col {$cursorPosition.column}
    </span>
  </div>

  <div class="status-center">
    <button
      class="zoom-badge"
      onclick={() => contentZoomStore.reset()}
      title="Click to reset zoom (Ctrl+0)"
    >
      <ZoomIn size={12} strokeWidth={2} />
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
            <Columns2 size={14} strokeWidth={2} />
          {:else if mode === "editor"}
            <AlignLeft size={14} strokeWidth={2} />
          {:else}
            <Eye size={14} strokeWidth={2} />
          {/if}
          <span class="view-label">{label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="status-right">
    {#if gitStatus?.is_repo}
      <span class="stat-badge git-badge" title={gitStatus.is_modified ? "Modified" : "Clean"}>
        <GitBranch size={11} strokeWidth={2} />
        {gitStatus.branch ?? "detached"}
        {#if gitStatus.is_modified}
          <span class="git-modified-dot" aria-label="Modified"></span>
        {/if}
      </span>
    {/if}
    <span class="stat-badge" title="{wordCount} words, {charCount} chars, ~{readingTimeMinutes} min read">
      <Text size={11} strokeWidth={2} />
      {wordCount} words
    </span>
    <span class="stat-badge" title="{charCount} characters">
      <Text size={11} strokeWidth={2} />
      {charCount} chars
    </span>
    <span class="stat-badge" title="~{readingTimeMinutes} min read">
      <Text size={11} strokeWidth={2} />
      ~{readingTimeMinutes}m
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
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    font-family: var(--font-mono);
  }

  /* View mode toggle */
  .view-toggle {
    display: flex;
    gap: 1px;
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
    padding: 2px;
  }
  .view-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .view-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }
  .view-btn.active {
    background: var(--bg-surface);
    color: var(--accent-default);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  /* Zoom badge */
  .zoom-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    background: var(--bg-subtle);
    border: none;
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .zoom-badge:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .git-badge {
    color: var(--accent-default);
    gap: 4px;
  }
  .git-modified-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--warning);
    display: inline-block;
    margin-left: 2px;
  }
</style>
