<script lang="ts">
  import { tick } from "svelte";

  export interface ContextMenuItem {
    id: string;
    label: string;
    action: () => void;
    disabled?: boolean;
    danger?: boolean;
  }

  interface Props {
    open: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
  }

  let { open = $bindable(false), x, y, items, onClose }: Props = $props();

  let menuEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (open) {
      tick().then(() => {
        menuEl?.focus();
        fitWithinViewport();
      });
    }
  });

  function fitWithinViewport() {
    if (!menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    if (x > maxX) x = Math.max(8, maxX);
    if (y > maxY) y = Math.max(8, maxY);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleItemClick(item: ContextMenuItem) {
    if (item.disabled) return;
    onClose();
    item.action();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="context-menu-backdrop" onclick={handleBackdropClick} oncontextmenu={(e) => { e.preventDefault(); onClose(); }}>
    <div
      bind:this={menuEl}
      class="context-menu"
      role="menu"
      tabindex="-1"
      style="left: {x}px; top: {y}px;"
      onkeydown={handleKeydown}
    >
      {#each items as item (item.id)}
        <button
          class="context-menu-item"
          class:disabled={item.disabled}
          class:danger={item.danger}
          role="menuitem"
          disabled={item.disabled}
          onclick={() => handleItemClick(item)}
        >
          {item.label}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .context-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
  }
  .context-menu {
    position: absolute;
    min-width: 160px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    padding: var(--space-1) 0;
    outline: none;
  }
  .context-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .context-menu-item:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .context-menu-item.danger {
    color: var(--text-error);
  }
  .context-menu-item.danger:hover:not(:disabled) {
    background: var(--bg-error-muted, rgba(239, 68, 68, 0.1));
    color: var(--text-error);
  }
  .context-menu-item:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
