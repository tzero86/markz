<script lang="ts">
  import { Files, ListTree, Link2 } from "@lucide/svelte";

  let {
    activeActivity,
    visible,
    onSelectActivity,
  }: {
    activeActivity: "files" | "outline" | "links";
    visible: boolean;
    onSelectActivity: (activity: "files" | "outline" | "links") => void;
  } = $props();

  const activities = [
    { id: "files" as const, icon: Files, label: "Files" },
    { id: "outline" as const, icon: ListTree, label: "Outline" },
    { id: "links" as const, icon: Link2, label: "Links" },
  ];
</script>

<div class="activity-bar">
  {#each activities as activity}
    <button
      class="activity-btn"
      class:active={activeActivity === activity.id && visible}
      onclick={() => onSelectActivity(activity.id)}
      aria-label={activity.label}
      title={activity.label}
    >
      <activity.icon size={20} strokeWidth={1.5} />
    </button>
  {/each}
</div>

<style>
  .activity-bar {
    width: 44px;
    min-width: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2) 0;
    gap: var(--space-1);
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    flex-shrink: 0;
  }
  .activity-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .activity-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .activity-btn.active {
    color: var(--accent-default);
    background: var(--accent-muted);
  }
</style>
