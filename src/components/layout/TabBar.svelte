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
        <span class="tab-dot"></span>
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
    align-items: flex-end;
    gap: 2px;
    padding: 0 4px;
    height: 34px;
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
    gap: 6px;
    height: 30px;
    padding: 0 10px 0 14px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms ease, color 150ms ease;
    flex-shrink: 0;
    max-width: 200px;
    position: relative;
    margin-bottom: 1px;
  }
  .tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tab.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    margin-bottom: 0;
  }
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 6px;
    right: 6px;
    height: 2px;
    background: var(--accent-default);
    border-radius: 1px 1px 0 0;
  }
  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tab-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent-default);
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
    opacity: 0;
    transition: background 150ms ease, opacity 150ms ease, color 150ms ease;
    color: var(--text-tertiary);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .tab-close:hover {
    background: var(--bg-active);
    color: var(--text-primary);
    opacity: 1 !important;
  }
  .tab:hover .tab-close,
  .tab.active .tab-close {
    opacity: 0.6;
  }
</style>
