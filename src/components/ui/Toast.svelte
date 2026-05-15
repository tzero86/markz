<script lang="ts">
  interface Props {
    message: string;
    visible: boolean;
  }

  let { message, visible }: Props = $props();
</script>

{#if visible}
  <div class="toast" role="status" aria-live="polite">{message}</div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-left: 3px solid var(--accent-default);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    font-size: var(--text-sm);
    z-index: 1000;
    animation: slideIn 200ms ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
