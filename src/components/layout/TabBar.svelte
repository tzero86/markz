<script lang="ts">
  import { tabStore, type Tab } from "../../lib/tabStore";

  let { onNewTab }: { onNewTab?: () => void } = $props();

  function handleSwitch(tab: Tab) {
    tabStore.switchTab(tab.id);
  }

  function handleClose(e: MouseEvent, tab: Tab) {
    e.stopPropagation();
    tabStore.closeTab(tab.id);
  }

  function handleNewTab() {
    onNewTab?.();
  }

  function handleKeydown(e: KeyboardEvent, tab: Tab) {
    if (e.key === "Enter") handleSwitch(tab);
    if (e.key === "Delete" || (e.key === "w" && e.metaKey)) {
      e.preventDefault();
      handleClose(e as unknown as MouseEvent, tab);
    }
  }
</script>

<div class="tab-bar">
  <div class="tab-scroll">
    {#each $tabStore.tabs as tab (tab.id)}
      <div
        class="tab"
        class:active={tab.id === $tabStore.activeTabId}
        onclick={() => handleSwitch(tab)}
        onkeydown={(e) => handleKeydown(e, tab)}
        role="tab"
        tabindex="0"
        aria-selected={tab.id === $tabStore.activeTabId}
        title={tab.path ?? tab.title}
      >
        <div class="tab-content">
          <span class="tab-title">{tab.title}</span>
          {#if tab.isDirty}
            <span class="tab-dot" aria-label="Unsaved changes"></span>
          {/if}
        </div>
        <button
          class="tab-close"
          onclick={(e) => handleClose(e, tab)}
          aria-label="Close {tab.title}"
          tabindex="-1"
        >
          {#if tab.isDirty}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          {:else}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          {/if}
        </button>
      </div>
    {/each}
  </div>
  <button
    class="new-tab-btn"
    onclick={handleNewTab}
    aria-label="New tab"
    title="New tab (Ctrl+T)"
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>
</div>

<style>
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    height: 36px;
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
    overflow: hidden;
  }

  .tab-scroll {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    padding: 0 4px;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
    height: 100%;
  }
  .tab-scroll::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 6px 0 12px;
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms var(--ease-out);
    flex-shrink: 0;
    max-width: 200px;
    position: relative;
    margin-bottom: -1px;
  }
  .tab:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
  .tab.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-color: var(--border-default);
    border-bottom-color: var(--bg-surface);
    box-shadow: 0 -1px 4px rgba(0,0,0,0.03);
    z-index: 2;
    font-weight: 600;
  }

  .tab-content {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    flex: 1;
  }
  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-default);
    flex-shrink: 0;
    display: inline-block;
  }

  /* Close button */
  .tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    opacity: 0;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    padding: 0;
  }
  .tab:hover .tab-close {
    opacity: 0.6;
  }
  .tab-close:hover {
    background: var(--bg-hover);
    opacity: 1 !important;
    color: var(--text-primary);
  }
  .tab.active .tab-close {
    opacity: 0.5;
  }
  .tab-close:active {
    transform: scale(0.9);
  }

  /* New tab button */
  .new-tab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0 6px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    flex-shrink: 0;
  }
  .new-tab-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    transform: scale(1.05);
  }
  .new-tab-btn:active {
    transform: scale(0.95);
  }
</style>
