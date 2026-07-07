<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    left: Snippet;
    right: Snippet;
    direction?: "horizontal" | "vertical" | "vertical-reversed";
    mode?: "split" | "editor" | "preview";
  }

  let { left, right, direction = "horizontal", mode = "split" }: Props = $props();

  let splitRatio = $state(50);
  let isDragging = $state(false);
  let containerRef: HTMLDivElement;

  const isHorizontal = $derived(direction === "horizontal");
  const isSplit = $derived(mode === "split");

  function sizeStyle(forLeft: boolean): string {
    if (!isSplit) {
      return isHorizontal ? "width: 100%;" : "height: 100%;";
    }
    const pct = forLeft ? splitRatio : 100 - splitRatio;
    return isHorizontal ? `width: ${pct}%;` : `height: ${pct}%;`;
  }

  const showLeft = $derived(mode !== "preview");
  const showRight = $derived(mode !== "editor");

  function onMouseDown(e: MouseEvent) {
    if (!isSplit) return;
    isDragging = true;
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isSplit) return;
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

<div class="split-pane" class:vertical={!isHorizontal} class:reversed={direction === "vertical-reversed"} bind:this={containerRef}>
  {#if direction === "vertical-reversed"}
    {#if showRight}
      <div class="pane top-left" style={sizeStyle(false)}>
        {@render right()}
      </div>
    {/if}
    {#if isSplit}
      <div class="divider" class:dragging={isDragging} class:vertical={true} onmousedown={onMouseDown} onkeydown={onKeyDown} role="separator" aria-label="Resize panes" tabindex="0"></div>
    {/if}
    {#if showLeft}
      <div class="pane bottom-right" style={sizeStyle(true)}>
        {@render left()}
      </div>
    {/if}
  {:else}
    {#if showLeft}
      <div class="pane top-left" style={sizeStyle(true)}>
        {@render left()}
      </div>
    {/if}
    {#if isSplit}
      <div class="divider" class:dragging={isDragging} class:vertical={!isHorizontal} onmousedown={onMouseDown} onkeydown={onKeyDown} role="separator" aria-label="Resize panes" tabindex="0"></div>
    {/if}
    {#if showRight}
      <div class="pane bottom-right" style={sizeStyle(false)}>
        {@render right()}
      </div>
    {/if}
  {/if}
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
    width: 1px;
  }
  .divider.vertical {
    cursor: row-resize;
    width: auto;
    height: 1px;
  }
  /* Visible grab handle */
  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 3px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--border-focus);
    opacity: 0;
    transition: opacity 150ms ease, background 150ms ease;
  }
  .divider.vertical::before {
    width: 24px;
    height: 3px;
  }
  .divider:hover::before,
  .divider.dragging::before {
    opacity: 1;
    background: var(--accent-default);
  }
  /* 6px invisible hit area via pseudo-element */
  .divider::after {
    content: '';
    position: absolute;
    inset: 0 -6px;
    z-index: -1;
  }
  .divider.vertical::after {
    inset: -6px 0;
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
  }
</style>
