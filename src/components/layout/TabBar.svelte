<script lang="ts">
  import { tabStore, type Tab } from "../../lib/tabStore";

  function handleSwitch(tab: Tab) {
    tabStore.switchTab(tab.id);
  }

  function handleClose(e: MouseEvent, tab: Tab) {
    e.stopPropagation();
    tabStore.closeTab(tab.id);
  }
</script>

<div class="tab-bar">
  {#each $tabStore.tabs as tab (tab.id)}
    <div
      class="tab"
      class:active={tab.id === $tabStore.activeTabId}
      onclick={() => handleSwitch(tab)}
      onkeydown={(e) => e.key === "Enter" && handleSwitch(tab)}
      role="tab"
      tabindex="0"
      aria-selected={tab.id === $tabStore.activeTabId}
      title={tab.path ?? tab.title}
    >
      <span class="tab-title">{tab.title}</span>
      {#if tab.isDirty}
        <span class="tab-dot">●</span>
      {/if}
      <button
        class="tab-close"
        onclick={(e) => handleClose(e, tab)}
        aria-label="Close tab"
        tabindex="-1"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 4px;
    height: 32px;
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar {
    display: none;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px 0 12px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms ease, color 150ms ease;
    flex-shrink: 0;
    max-width: 180px;
  }
  .tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tab.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-bottom-color: transparent;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    margin-bottom: -1px;
    height: 29px;
  }
  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tab-dot {
    font-size: 6px;
    color: var(--accent-default);
    flex-shrink: 0;
  }
  .tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    opacity: 0.6;
    transition: background 150ms ease, opacity 150ms ease;
  }
  .tab-close:hover {
    background: var(--bg-hover);
    opacity: 1;
  }
  .tab:hover .tab-close,
  .tab.active .tab-close {
    opacity: 1;
  }
</style>
