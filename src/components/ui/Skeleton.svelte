<script lang="ts">
  interface Props {
    lines?: number;
    width?: string;
  }
  let { lines = 4, width = "100%" }: Props = $props();
</script>

<div class="skeleton-stack" style="width: {width};">
  {#each Array(lines) as _, i (i)}
    <div class="skeleton-line" style="width: {i % 2 === 0 ? '100%' : '75%'};"></div>
  {/each}
</div>

<style>
  .skeleton-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
  }
  .skeleton-line {
    height: 1em;
    border-radius: var(--radius-sm);
    background: var(--bg-hover);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
</style>
