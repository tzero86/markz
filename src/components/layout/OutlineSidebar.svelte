<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { generateToc, type TocEntry } from "../../lib/toc";

  let { visible }: { visible: boolean } = $props();

  let toc = $state<TocEntry[]>([]);
  let activeAnchor = $state<string | null>(null);

  $effect(() => {
    const content = $documentStore.content;
    toc = generateToc(content);
  });

  function scrollToAnchor(anchor: string) {
    const el = document.querySelector(`#${anchor}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      activeAnchor = anchor;
    }
  }

  function toggle() {
    window.dispatchEvent(new CustomEvent("markz:toggle-sidebar"));
  }
</script>

<div class="sidebar" class:collapsed={!visible}>
  <button
    class="toggle-btn"
    onclick={toggle}
    aria-label={visible ? "Collapse outline" : "Expand outline"}
    title={visible ? "Collapse outline" : "Expand outline"}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="toggle-icon"
      class:rotated={!visible}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>

  {#if visible}
    <div class="sidebar-header">
      <span class="sidebar-title">Outline</span>
      <span class="sidebar-count">{toc.length}</span>
    </div>
    <div class="toc-scroller">
      {#if toc.length === 0}
        <div class="empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>No headings yet</span>
        </div>
      {:else}
        <ul class="toc-list">
          {#each toc as entry (entry.anchor)}
            <li class="toc-item" style="padding-left: {(entry.level - 1) * 14}px">
              <button
                class="toc-link"
                class:active={activeAnchor === entry.anchor}
                onclick={() => scrollToAnchor(entry.anchor)}
              >
                <span class="toc-level-indicator" style="--level: {entry.level}"></span>
                <span class="toc-text">{entry.text}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    overflow: hidden;
    transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1),
                min-width 250ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 250ms ease;
    flex-shrink: 0;
  }
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
    border-right-color: transparent;
    background: transparent;
    overflow: visible;
  }
  .toggle-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, right 250ms ease, left 250ms ease;
    z-index: 2;
  }
  .sidebar.collapsed .toggle-btn {
    right: auto;
    left: 8px;
  }
  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toggle-icon {
    transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .toggle-icon.rotated {
    transform: rotate(180deg);
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    padding-right: 36px;
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    user-select: none;
  }
  .sidebar-title {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
  }
  .sidebar-count {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    padding: 1px 6px;
    min-width: 20px;
    text-align: center;
  }
  .toc-scroller {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-2) var(--space-2);
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8) var(--space-4);
    color: var(--text-tertiary);
    font-size: var(--text-sm);
    text-align: center;
  }
  .empty svg {
    opacity: 0.5;
  }
  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc-item {
    padding: 0;
    margin: 1px 0;
  }
  .toc-link {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 120ms ease, color 120ms ease;
  }
  .toc-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toc-link.active {
    background: var(--accent-subtle);
    color: var(--text-accent);
    font-weight: 500;
  }
  .toc-level-indicator {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
    opacity: 0.6;
    transition: background 120ms ease, opacity 120ms ease;
  }
  .toc-link:hover .toc-level-indicator,
  .toc-link.active .toc-level-indicator {
    background: currentColor;
    opacity: 1;
  }
  .toc-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
