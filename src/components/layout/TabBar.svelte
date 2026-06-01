<script lang="ts">
  import { X, Plus, Pin } from "@lucide/svelte";
  import { tabStore, type Tab } from "../../lib/tabStore";

  let { onNewTab }: { onNewTab?: () => void } = $props();

  let ctxMenuOpen = $state(false);
  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxTab: Tab | null = $state(null);
  let tabScrollEl: HTMLElement | null = $state(null);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  function handleSwitch(tab: Tab) {
    tabStore.switchTab(tab.id);
  }

  function handleClose(e: MouseEvent, tab: Tab) {
    e.stopPropagation();
    if (tab.pinned) return;
    tabStore.closeTab(tab.id);
  }

  function handleNewTab() {
    onNewTab?.();
  }

  function handleKeydown(e: KeyboardEvent, tab: Tab) {
    if (e.key === "Enter") handleSwitch(tab);
    if (!tab.pinned && (e.key === "Delete" || (e.key === "w" && e.metaKey))) {
      e.preventDefault();
      handleClose(e as unknown as MouseEvent, tab);
    }
  }

  function handleContextMenu(e: MouseEvent, tab: Tab) {
    e.preventDefault();
    ctxTab = tab;
    ctxMenuX = e.clientX;
    ctxMenuY = e.clientY;
    ctxMenuOpen = true;
  }

  function checkScroll() {
    if (!tabScrollEl) return;
    canScrollLeft = tabScrollEl.scrollLeft > 0;
    canScrollRight = tabScrollEl.scrollLeft + tabScrollEl.clientWidth < tabScrollEl.scrollWidth;
  }

  function handleWheel(e: WheelEvent) {
    if (!tabScrollEl) return;
    e.preventDefault();
    tabScrollEl.scrollLeft += e.deltaY;
  }

  function scrollLeft() {
    tabScrollEl?.scrollBy({ left: -120, behavior: "smooth" });
  }

  function scrollRight() {
    tabScrollEl?.scrollBy({ left: 120, behavior: "smooth" });
  }

  $effect(() => {
    $tabStore.tabs.length;
    tabScrollEl && checkScroll();
  });

  function closeCtxMenu() {
    ctxMenuOpen = false;
    ctxTab = null;
  }

  async function ctxCloseTab() {
    if (ctxTab) await tabStore.closeTab(ctxTab.id);
    closeCtxMenu();
  }

  async function ctxCloseOthers() {
    if (ctxTab) await tabStore.closeAllExcept(ctxTab.id);
    closeCtxMenu();
  }

  async function ctxCloseAll() {
    await tabStore.closeAll();
    closeCtxMenu();
  }

  function ctxTogglePin() {
    if (ctxTab) tabStore.togglePin(ctxTab.id);
    closeCtxMenu();
  }
</script>

<svelte:window onclick={() => { if (ctxMenuOpen) closeCtxMenu(); }} />

<div class="tab-bar">
  <div class="tab-scroll">
    {#each $tabStore.tabs.filter((t) => t.pinned) as tab (tab.id)}
      <div
        class="tab pinned"
        class:active={tab.id === $tabStore.activeTabId}
        onclick={() => handleSwitch(tab)}
        onkeydown={(e) => handleKeydown(e, tab)}
        oncontextmenu={(e) => handleContextMenu(e, tab)}
        role="tab"
        tabindex="0"
        aria-selected={tab.id === $tabStore.activeTabId}
        title={tab.path ?? tab.title}
      >
        <div class="tab-content">
          <Pin size={10} strokeWidth={2} class="pin-icon" />
          <span class="tab-title">{tab.title}</span>
          {#if tab.isDirty}
            <span class="tab-dot" aria-label="Unsaved changes"></span>
          {/if}
        </div>
      </div>
    {/each}
    {#if $tabStore.tabs.some((t) => t.pinned) && $tabStore.tabs.some((t) => !t.pinned)}
      <div class="tab-divider"></div>
    {/if}
    {#each $tabStore.tabs.filter((t) => !t.pinned) as tab (tab.id)}
      <div
        class="tab"
        class:active={tab.id === $tabStore.activeTabId}
        onclick={() => handleSwitch(tab)}
        onkeydown={(e) => handleKeydown(e, tab)}
        oncontextmenu={(e) => handleContextMenu(e, tab)}
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
            <X size={10} strokeWidth={2.5} />
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
    <Plus size={14} strokeWidth={2.5} />
  </button>
</div>

{#if ctxMenuOpen && ctxTab}
  <div
    class="tab-context-menu"
    style="left: {ctxMenuX}px; top: {ctxMenuY}px;"
    role="menu"
  >
    <button class="ctx-item" role="menuitem" onclick={ctxTogglePin}>
      {ctxTab?.pinned ? "Unpin" : "Pin"}
    </button>
    <button class="ctx-item" role="menuitem" onclick={ctxCloseTab}>
      Close
    </button>
    <button class="ctx-item" role="menuitem" onclick={ctxCloseOthers}>
      Close Others
    </button>
    <button class="ctx-item" role="menuitem" onclick={ctxCloseAll}>
      Close All
    </button>
  </div>
{/if}

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
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    margin-right: 4px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
  }
  .new-tab-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Context menu */
  .tab-context-menu {
    position: fixed;
    z-index: 100;
    min-width: 140px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .ctx-item {
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .ctx-item:hover {
    background: var(--bg-hover);
  }

  .tab-scroll-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    flex-shrink: 0;
    padding: 0;
  }
  .tab-scroll-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
