<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    left: Snippet;
    right: Snippet;
    direction?: "horizontal" | "vertical";
  }

  let { left, right, direction = "horizontal" }: Props = $props();

  let splitRatio = $state(50);
  let isDragging = $state(false);
  let containerRef: HTMLDivElement;

  const isHorizontal = $derived(direction === "horizontal");

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isHorizontal) {
      if (e.key === "ArrowLeft") {
        splitRatio = Math.max(20, splitRatio - 5);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        splitRatio = Math.min(80, splitRatio + 5);
        e.preventDefault();
      }
    } else {
      if (e.key === "ArrowUp") {
        splitRatio = Math.max(20, splitRatio - 5);
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        splitRatio = Math.min(80, splitRatio + 5);
        e.preventDefault();
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    if (isHorizontal) {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      splitRatio = Math.max(20, Math.min(80, pct));
    } else {
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      splitRatio = Math.max(20, Math.min(80, pct));
    }
  }

  function onMouseUp() {
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }
</script>

<div class="split-pane" class:vertical={!isHorizontal} bind:this={containerRef}>
  <div class="pane top-left" style={isHorizontal ? `width: ${splitRatio}%` : `height: ${splitRatio}%`}>
    {@render left()}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="divider" class:dragging={isDragging} class:vertical={!isHorizontal} onmousedown={onMouseDown} onkeydown={onKeyDown} role="separator" aria-label="Resize panes" tabindex="0"></div>
  <div class="pane bottom-right" style={isHorizontal ? `width: ${100 - splitRatio}%` : `height: ${100 - splitRatio}%`}>
    {@render right()}
  </div>
</div>

<style>
  .split-pane {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .split-pane.vertical {
    flex-direction: column;
  }
  .pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  }
  .divider {
    cursor: col-resize;
    z-index: 100;
    position: relative;
    background: var(--border-default);
    transition: background 150ms ease;
    flex-shrink: 0;
  }
  .divider.vertical {
    cursor: row-resize;
  }
  /* 4px invisible hit area via pseudo-element */
  .divider::after {
    content: '';
    position: absolute;
    inset: 0 -4px;
    z-index: -1;
  }
  .divider.vertical::after {
    inset: -4px 0;
  }
  .divider:hover,
  .divider.dragging {
    background: var(--accent-default);
  }
  .top-left {
    border-right: none;
    border-bottom: none;
  }
  .bottom-right {
    flex: 1;
  }
</style>
