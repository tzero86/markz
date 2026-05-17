<script lang="ts">
  import { toastIcon, toastColor } from "../../lib/formatIcons";

  interface Props {
    message: string;
    visible: boolean;
    type?: "success" | "error" | "info" | "default";
    duration?: number;
    onDismiss?: () => void;
  }

  let { message, visible, type = "default", duration = 3000, onDismiss }: Props = $props();

  let progress = $state(100);
  let timer: ReturnType<typeof setInterval> | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (visible) {
      progress = 100;
      const interval = 50;
      const step = (100 / duration) * interval;

      timer = setInterval(() => {
        progress -= step;
        if (progress <= 0) {
          progress = 0;
          if (timer) clearInterval(timer);
        }
      }, interval);

      dismissTimer = setTimeout(() => {
        onDismiss?.();
      }, duration);

      return () => {
        if (timer) clearInterval(timer);
        if (dismissTimer) clearTimeout(dismissTimer);
      };
    }
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="toast toast-{type}"
    role="status"
    aria-live="polite"
    onclick={() => onDismiss?.()}
  >
    {#if type !== "default"}
      <span class="toast-icon" style="color: {toastColor(type)}">
        {@html toastIcon(type)}
      </span>
    {/if}
    <span class="toast-message">{message}</span>
    <div class="toast-progress" style="--progress: {progress}%; --progress-color: {toastColor(type)}"></div>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: var(--space-5);
    right: var(--space-5);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    padding-bottom: var(--space-3);
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
    font-weight: 500;
    z-index: 1000;
    cursor: pointer;
    overflow: hidden;
    animation: toastSlideIn 350ms var(--ease-spring);
    transition: transform 150ms var(--ease-out), opacity 150ms ease;
    min-width: 240px;
    max-width: 420px;
    border: 1px solid var(--border-subtle);
  }
  .toast:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-xl);
  }
  .toast:active {
    transform: scale(0.98);
  }
  .toast-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .toast-message {
    flex: 1;
    line-height: 1.4;
  }
  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: var(--progress);
    background: var(--progress-color);
    transition: width 50ms linear;
    border-radius: 0 0 0 var(--radius-lg);
  }

  /* Default left border accent */
  .toast-default {
    border-left: 3px solid var(--accent-default);
  }

  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(30px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  /* Exit animation handled by conditional rendering */
</style>
