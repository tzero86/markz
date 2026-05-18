<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { ChevronLeft } from "@lucide/svelte";
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
    <span class="toggle-icon" class:rotated={!visible}>
      <ChevronLeft size={16} strokeWidth={1.5} />
    </span>
  </button>

  {#if visible}
    <div class="sidebar-header">Outline</div>
    <div class="toc-scroller">
      {#if toc.length === 0}
        <div class="empty">No headings</div>
      {:else}
        <ul class="toc-list">
          {#each toc as entry (entry.anchor)}
            <li class="toc-item" style="padding-left: {(entry.level - 1) * 12}px">
              <button
                class="toc-link"
                class:active={activeAnchor === entry.anchor}
                onclick={() => scrollToAnchor(entry.anchor)}
              >
                {entry.text}
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
    transition: width 200ms ease, min-width 200ms ease, border-color 200ms ease;
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
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, right 200ms ease, left 200ms ease;
    z-index: 2;
  }
  .sidebar.collapsed .toggle-btn {
    right: auto;
    left: 6px;
  }
  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toggle-icon {
    display: inline-flex;
    transition: transform 200ms ease;
  }
  .toggle-icon.rotated {
    transform: rotate(180deg);
  }
  .sidebar-header {
    padding: var(--space-3) var(--space-4);
    padding-right: 32px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    user-select: none;
  }
  .toc-scroller {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-2) 0;
  }
  .empty {
    padding: var(--space-4);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    text-align: center;
  }
  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc-item {
    padding: 0 var(--space-3);
  }
  .toc-link {
    display: block;
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
    transition: background 150ms ease, color 150ms ease;
  }
  .toc-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toc-link.active {
    color: var(--accent-default);
  }
</style>
