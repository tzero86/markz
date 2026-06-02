<script lang="ts">
  import type { Component } from "svelte";

  interface Props {
    icon?: Component;
    iconSize?: number;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    action?: () => void;
  }

  let { icon, iconSize = 48, title, subtitle, actionLabel, action }: Props = $props();
</script>

<div class="empty-state" role="status" aria-label={title}>
  {#if icon}
    <div class="empty-icon" aria-hidden="true">
      <svelte:component this={icon} size={iconSize} strokeWidth={1.5} />
    </div>
  {/if}
  <h3 class="empty-title">{title}</h3>
  {#if subtitle}
    <p class="empty-subtitle">{subtitle}</p>
  {/if}
  {#if actionLabel && action}
    <button class="btn-secondary" onclick={action}>
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-8);
    text-align: center;
    color: var(--text-secondary);
    flex: 1;
    min-height: 0;
    animation: fadeIn 300ms var(--ease-out);
  }
  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    color: var(--text-tertiary);
    margin-bottom: var(--space-2);
  }
  .empty-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .empty-subtitle {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 320px;
    line-height: 1.6;
    margin: 0;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
