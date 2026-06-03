<script lang="ts">
  import { Files, ListTree, Link2 } from "@lucide/svelte";

  let props: {
    activeActivity: "files" | "outline" | "links";
    visible: boolean;
    onSelectActivity: (activity: "files" | "outline" | "links") => void;
  } = $props();

  const activities = [
    { id: "files" as const, icon: Files, label: "Files" },
    { id: "outline" as const, icon: ListTree, label: "Outline" },
    { id: "links" as const, icon: Link2, label: "Links" },
  ];

  function handleClick(activityId: "files" | "outline" | "links") {
    console.log("[ActivityBar] clicked:", activityId);
    props.onSelectActivity(activityId);
  }
</script>

<div class="activity-bar">
  {#each activities as activity}
    <button
      class="activity-btn"
      class:active={props.activeActivity === activity.id && props.visible}
      onclick={() => handleClick(activity.id)}
      aria-label={activity.label}
      title={activity.label}
    >
      <activity.icon size={15} strokeWidth={1.5} />
    </button>
  {/each}
</div>

<style>
  .activity-bar {
    width: 36px;
    min-width: 36px;
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
    width: 28px;
    height: 28px;
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
