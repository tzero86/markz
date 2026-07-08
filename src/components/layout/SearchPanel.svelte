<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { X, Search, Replace, FileText } from "@lucide/svelte";
  import { workspaceStore, type SearchResult } from "../../lib/workspaceStore";
  import { tabStore } from "../../lib/tabStore";
  import { trapFocus } from "../../lib/focusTrap";

  let { open = $bindable(false) } = $props();

  let query = $state("");
  let replaceText = $state("");
  let showReplace = $state(false);
  let results = $state<SearchResult[]>([]);
  let searching = $state(false);
  let searchInputRef = $state<HTMLInputElement | null>(null);

  async function doSearch() {
    if (!query.trim()) {
      results = [];
      return;
    }
    searching = true;
    await workspaceStore.search(query);
    const state = $workspaceStore;
    results = state.searchResults;
    searching = false;
  }

  async function openResult(result: SearchResult) {
    // Open the file
    tabStore.newTab("", result.path.split(/[\\/]/).pop() || "Untitled", result.path);
    // Load content
    try {
      const content = await invoke<string>("read_file_text", { path: result.path });
      tabStore.loadDocument(content, result.path);
    } catch (e) {
      console.error("Failed to open file:", e);
    }
    open = false;
  }

  async function replaceAll() {
    if (!query.trim() || !replaceText.trim() || results.length === 0) return;

    const filesToModify = new Map<string, string>();
    for (const r of results) {
      if (!filesToModify.has(r.path)) {
        try {
          const content = await invoke<string>("read_file_text", { path: r.path });
          filesToModify.set(r.path, content);
        } catch (e) {
          console.error("Failed to read file for replace:", e);
        }
      }
    }

    for (const [path, content] of filesToModify) {
      const newContent = content.replaceAll(query, replaceText);

      if (newContent !== content) {
        tabStore.addRecentlySaved(path);
        try {
          await invoke("save_document", { path, content: newContent });
        } catch (e) {
          console.error("Failed to save replaced file:", e);
        }
      }
    }

    // Refresh search results
    await doSearch();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      open = false;
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      doSearch();
    }
  }

  $effect(() => {
    if (open) {
      query = "";
      replaceText = "";
      results = [];
      setTimeout(() => searchInputRef?.focus(), 50);
    }
  });
</script>

<svelte:window onkeydown={(e) => {
  if (!open) return;
  if (e.key === "Escape") {
    e.preventDefault();
    open = false;
  }
}} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="search-overlay" onclick={() => (open = false)} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="search-panel" use:trapFocus onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="search-header">
        <div class="search-input-row">
          <Search size={14} strokeWidth={2} class="search-icon" />
          <input
            type="text"
            class="search-input"
            placeholder="Search across workspace..."
            bind:value={query}
            bind:this={searchInputRef}
            onkeydown={handleKeydown}
          />
          <button class="search-btn" onclick={doSearch} disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
          <button class="icon-btn" onclick={() => (showReplace = !showReplace)} title="Toggle replace">
            <Replace size={14} />
          </button>
          <button class="icon-btn" onclick={() => (open = false)} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {#if showReplace}
          <div class="replace-input-row">
            <input
              type="text"
              class="replace-input"
              placeholder="Replace with..."
              bind:value={replaceText}
              onkeydown={handleKeydown}
            />
            <button class="replace-btn" onclick={replaceAll} disabled={!query.trim() || !replaceText.trim()}>
              Replace All
            </button>
          </div>
        {/if}
      </div>

      <div class="search-results">
        {#if results.length === 0 && !searching && query.trim()}
          <div class="empty-state">No results found</div>
        {:else if results.length === 0 && !query.trim()}
          <div class="empty-state">Type a query and press Enter to search</div>
        {:else}
          {#each results as result (result.path + result.line_number)}
            <button class="result-item" onclick={() => openResult(result)}>
              <div class="result-file">
                <FileText size={12} strokeWidth={2} />
                <span class="result-path">{result.rel_path}</span>
                <span class="result-line">:{result.line_number}</span>
              </div>
              <div class="result-context">{result.context}</div>
            </button>
          {/each}
        {/if}
      </div>

      {#if results.length > 0}
        <div class="search-footer">{results.length} result{results.length === 1 ? "" : "s"}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
  }
  .search-panel {
    width: 600px;
    max-width: 90vw;
    max-height: 70vh;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .search-header {
    padding: var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .search-input-row,
  .replace-input-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .search-input,
  .replace-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }
  .search-input:focus,
  .replace-input:focus {
    border-color: var(--accent-default);
  }
  .search-btn,
  .replace-btn {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--accent-default);
    color: white;
    font-size: var(--text-sm);
    cursor: pointer;
    white-space: nowrap;
  }
  .search-btn:disabled,
  .replace-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
  }
  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .search-results {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: var(--space-1) 0;
  }
  .result-item {
    display: block;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
  }
  .result-item:hover,
  .result-item:focus {
    background: var(--bg-hover);
  }
  .result-file {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .result-path {
    font-weight: 500;
  }
  .result-line {
    color: var(--accent-default);
  }
  .result-context {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-all;
  }
  .empty-state {
    padding: var(--space-8);
    text-align: center;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
  .search-footer {
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--border-subtle);
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-align: right;
  }
</style>
