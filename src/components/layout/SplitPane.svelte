<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    left: Snippet;
    right: Snippet;
  }

  let { left, right }: Props = $props();

  let leftWidth = $state(50);
  let isDragging = $state(false);
  let containerRef: HTMLDivElement;

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      leftWidth = Math.max(20, leftWidth - 5);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      leftWidth = Math.min(80, leftWidth + 5);
      e.preventDefault();
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    leftWidth = Math.max(20, Math.min(80, pct));
  }

  function onMouseUp() {
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }
</script>

<div class="split-pane" bind:this={containerRef}>
  <div class="pane left" style="width: {leftWidth}%">
    {@render left()}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="divider" class:dragging={isDragging} onmousedown={onMouseDown} onkeydown={onKeyDown} role="separator" aria-label="Resize panes" tabindex="0"></div>
  <div class="pane right" style="width: {100 - leftWidth}%">
    {@render right()}
  </div>
</div>

<style>
  .split-pane {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .left {
    border-right: none;
  }
  .divider {
    width: 1px;
    cursor: col-resize;
    z-index: 100;
    position: relative;
    background: var(--border-default);
    transition: background 150ms ease;
    flex-shrink: 0;
  }
  /* 4px invisible hit area via pseudo-element */
  .divider::after {
    content: '';
    position: absolute;
    inset: 0 -4px;
    z-index: -1;
  }
  .divider:hover,
  .divider.dragging {
    background: var(--accent-default);
  }
  .right {
    flex: 1;
  }
</style>