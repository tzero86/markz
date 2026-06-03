<script lang="ts">
  import { onMount } from "svelte";
  import { highlightCodeBlocks, setHljsTheme } from "./syntaxHighlighter";

  export interface Slide {
    kind: "title" | "section" | "content" | "code" | "image";
    title: string | null;
    content: string;
    level: number;
    index: number;
  }

  export interface SlideDeck {
    title: string | null;
    author: string | null;
    theme: string;
    slides: Slide[];
  }

  interface Props {
    deck: SlideDeck | null;
    onClose: () => void;
  }

  let { deck, onClose }: Props = $props();

  // Fixed slide canvas size (standard 4:3 ratio, scaled to fit viewport)
  const SLIDE_W = 1024;
  const SLIDE_H = 768;

  let currentIndex = $state(0);
  let direction = $state(1);
  let touchStartX = $state(0);
  let containerEl: HTMLDivElement | undefined = $state();
  let slideScale = $state(1);
  let slideOffsetX = $state(0);
  let slideOffsetY = $state(0);

  let totalSlides = $derived(displaySlides.length);
  let currentSlide = $derived(displaySlides[currentIndex] ?? null);
  let displayNumber = $derived(currentIndex + 1);

  function goTo(index: number) {
    if (index < 0 || index >= totalSlides) return;
    direction = index > currentIndex ? 1 : -1;
    currentIndex = index;
  }
  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }
  function first() { goTo(0); }
  function last() { goTo(totalSlides - 1); }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "Enter" || e.key === "PageDown") {
      e.preventDefault();
      next();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Backspace") {
      e.preventDefault();
      prev();
      return;
    }
    if (e.key === "Home") { e.preventDefault(); first(); return; }
    if (e.key === "End") { e.preventDefault(); last(); return; }
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }
  function handleTouchEnd(e: TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  }

  // ── Auto-hide controls ───────────────────────────────────────────────────────
  let controlsVisible = $state(true);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  function showControls() {
    controlsVisible = true;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { controlsVisible = false; }, 3000);
  }

  // ── Full-screen ──────────────────────────────────────────────────────────────
  let isFullscreen = $state(false);
  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      isFullscreen = true;
    } else {
      await document.exitFullscreen();
      isFullscreen = false;
    }
  }

  // ── Fixed canvas splitting + scale-to-fit ────────────────────────────────────
  // We split heading-based slides so each fits within a 1024×768 canvas, then
  // uniformly scale each canvas to the viewport. This guarantees no clipped
  // content AND no viewport-dependent measurement (the canvas is always 1024×768).

  // Shared offscreen measurer matching the real canvas CSS
  let measurer: HTMLDivElement | null = null;

  function getMeasurer(): HTMLDivElement {
    if (!measurer) {
      measurer = document.createElement("div");
      measurer.style.cssText = "position:fixed;visibility:hidden;left:-9999px;top:0;width:1024px;height:768px;overflow:hidden;";
      measurer.style.padding = "32px 48px";
      measurer.style.fontSize = "18px";
      measurer.style.lineHeight = "1.6";
      measurer.style.fontFamily = "var(--font-sans)";
      measurer.style.boxSizing = "border-box";
      document.body.appendChild(measurer);
    }
    return measurer;
  }

  /** Split a single slide's HTML into blocks, measure each against the fixed
   *  1024×768 canvas, and return slides that each fit within the canvas. */
  function splitSlideContent(content: string, title: string | null): { title: string | null; content: string }[] {
    const m = getMeasurer();

    // Parse content into block-level HTML chunks
    const re = /(<(?:p|h[2-6]|pre|ul|ol|blockquote|table|hr)\b[^>]*>[\s\S]*?<\/(?:p|h[2-6]|pre|ul|ol|blockquote|table)>|<hr\s*\/?>)/gi;
    const blocks: string[] = [];
    let match;
    let lastIdx = 0;
    while ((match = re.exec(content)) !== null) {
      if (match.index > lastIdx) {
        const text = content.slice(lastIdx, match.index).trim();
        if (text) blocks.push(text);
      }
      blocks.push(match[0]);
      lastIdx = re.lastIndex;
    }
    if (lastIdx < content.length) {
      const rest = content.slice(lastIdx).trim();
      if (rest) blocks.push(rest);
    }
    if (blocks.length === 0) return [{ title, content }];

    // Build heading HTML if present
    let headingHtml = "";
    if (title) {
      headingHtml = `<h2 style="font-size:28px;font-weight:700;margin:0 0 6px;border-bottom:2px solid var(--accent-default);padding-bottom:8px;">${title}</h2>`;
    }

    // Pack blocks into slides, measuring total height after each addition
    const results: { title: string | null; content: string }[] = [];
    let currentBlocks: string[] = [];

    for (const block of blocks) {
      const candidateHtml = headingHtml + [...currentBlocks, block].join("");
      m.innerHTML = candidateHtml;
      const totalH = m.getBoundingClientRect().height;

      if (totalH <= 768) {
        currentBlocks = [...currentBlocks, block];
      } else {
        if (currentBlocks.length > 0) {
          results.push({ title, content: currentBlocks.join("\n") });
        }
        currentBlocks = [block];
      }
    }
    if (currentBlocks.length > 0) {
      results.push({ title, content: currentBlocks.join("\n") });
    }

    m.innerHTML = "";
    return results.length > 0 ? results : [{ title, content }];
  }

  let fittedSlides = $state<Slide[]>([]);

  $effect(() => {
    if (!deck) return;
    // Split each heading-based slide into canvas-fitting slides
    const split: Slide[] = [];
    for (const slide of deck.slides) {
      if (slide.kind === "title" || slide.kind === "section") {
        split.push(slide);
        continue;
      }
      const parts = splitSlideContent(slide.content, slide.title);
      for (const part of parts) {
        split.push({ ...slide, title: part.title, content: part.content, index: split.length });
      }
    }
    fittedSlides = split;
  });

  // Re-split on resize (in case CSS/fonts change)
  // Use the fitted slides for display
  let displaySlides = $derived(fittedSlides.length > 0 ? fittedSlides : deck?.slides ?? []);

  function computeScale() {
    if (!containerEl) return;
    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const scaleX = cw / SLIDE_W;
    const scaleY = ch / SLIDE_H;
    const s = Math.min(scaleX, scaleY);
    slideScale = Math.min(s, 1.4);
    slideOffsetX = (cw - SLIDE_W * s) / 2;
    slideOffsetY = (ch - SLIDE_H * s) / 2;
  }

  $effect(() => {
    if (containerEl) {
      computeScale();
      const ro = new ResizeObserver(computeScale);
      ro.observe(containerEl);
      return () => ro.disconnect();
    }
  });

  onMount(() => {
    // Clean up measurer
    return () => { if (measurer) { document.body.removeChild(measurer); measurer = null; } };
  });

  onMount(() => {
    currentIndex = 0;
    direction = 1;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", showControls);
    document.addEventListener("fullscreenchange", () => {
      isFullscreen = !!document.fullscreenElement;
      requestAnimationFrame(computeScale);
    });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", showControls);
      if (hideTimer) clearTimeout(hideTimer);
    };
  });

  let slideEl: HTMLElement | undefined = $state();

  $effect(() => {
    if (slideEl && currentSlide) {
      highlightCodeBlocks(slideEl);
    }
  });

  $effect(() => {
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme) {
      setHljsTheme(theme === "dark" ? "dark" : "light");
    }
  });

  function slideClass(kind: string): string {
    switch (kind) {
      case "title": return "slide-title";
      case "section": return "slide-section";
      case "code": return "slide-code";
      case "image": return "slide-image";
      default: return "slide-content";
    }
  }
</script>

{#if deck}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="presentation-overlay"
    class:controls-hidden={!controlsVisible}
    onclick={(e) => { if (e.target === e.currentTarget) next(); }}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="presentation"
  >
    <div class="slide-header">
      <span class="slide-deck-title">{deck.title || ""}</span>
      <button class="header-btn" onclick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
        {#if isFullscreen}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        {/if}
      </button>
    </div>
    <div class="slide-container" bind:this={containerEl}>
      <div class="slide-canvas" style="width:{SLIDE_W}px;height:{SLIDE_H}px;transform:scale({slideScale});left:{slideOffsetX}px;top:{slideOffsetY}px;">
        {#key currentIndex}
          <div
            class="slide {slideClass(currentSlide?.kind ?? 'content')}"
            style:--dir={direction}
            bind:this={slideEl}
          >
            {#if currentSlide?.kind === "title"}
              <div class="slide-body title-layout">
                {#if currentSlide.title}
                  <h1 class="title-heading">{@html currentSlide.title}</h1>
                {/if}
                {#if deck.author}
                  <p class="title-author">{deck.author}</p>
                {/if}
                {#if !currentSlide.title && deck.title}
                  <h1 class="title-heading">{deck.title}</h1>
                {/if}
                {#if currentSlide.content}
                  <div class="slide-html title-subtitle">{@html currentSlide.content}</div>
                {/if}
              </div>
            {:else if currentSlide?.kind === "section"}
              <div class="slide-body section-layout">
                {#if currentSlide.title}
                  <h1 class="section-heading">{@html currentSlide.title}</h1>
                {/if}
              </div>
            {:else}
              <div class="slide-body content-layout">
                {#if currentSlide?.title}
                  <h2 class="content-heading">{@html currentSlide.title}</h2>
                {/if}
                <div class="slide-html">{@html currentSlide?.content ?? ""}</div>
              </div>
            {/if}
          </div>
        {/key}
      </div>
    </div>
    <div class="presentation-controls" class:visible={controlsVisible}>
      <button class="ctrl-btn" onclick={(e) => { e.stopPropagation(); prev(); }} disabled={currentIndex === 0} aria-label="Previous slide">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="slide-counter">{displayNumber} / {totalSlides}</span>
      <button class="ctrl-btn" onclick={(e) => { e.stopPropagation(); next(); }} disabled={currentIndex === totalSlides - 1} aria-label="Next slide">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="ctrl-sep"></div>
      <button class="ctrl-btn close-btn" onclick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close presentation">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .presentation-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--bg-base);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
  }

  .slide-container {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  .slide-canvas {
    position: absolute;
    transform-origin: 0 0;
    overflow: hidden;
  }

  .slide {
    width: 1024px;
    height: 768px;
    display: flex;
    flex-direction: column;
    animation: slideIn 400ms var(--ease-out) forwards;
    overflow: hidden;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(calc(var(--dir, 1) * 60px));
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .slide-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    contain: content;
  }

  .title-layout {
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;
  }

  .title-heading {
    font-size: 52px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.1;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .title-author {
    font-size: 20px;
    color: var(--text-tertiary);
    margin: 0;
  }

  .title-subtitle {
    font-size: 20px;
    color: var(--text-secondary);
    max-width: 600px;
    margin-top: 8px;
  }

  .section-layout {
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--accent-default);
    border-radius: var(--radius-xl);
  }

  .section-heading {
    font-size: 42px;
    font-weight: 700;
    color: white;
    margin: 0;
    line-height: 1.2;
    padding: 0 48px;
  }

  .content-layout {
    gap: 24px;
    padding: 16px 0;
  }

  .content-heading {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 6px;
    line-height: 1.2;
    border-bottom: 2px solid var(--accent-default);
    padding-bottom: 8px;
    flex-shrink: 0;
  }

  .slide-html {
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1.6;
    flex-shrink: 1;
    min-height: 0;
    overflow: hidden;
  }

  .slide-html :global(p) { margin: 0.4em 0; }
  .slide-html :global(ul),
  .slide-html :global(ol) { margin: 0.4em 0; padding-left: 1.5em; }
  .slide-html :global(li) { margin: 0.2em 0; }
  .slide-html :global(ul ul),
  .slide-html :global(ol ol),
  .slide-html :global(ul ol),
  .slide-html :global(ol ul) { margin: 0; }

  .slide-html :global(pre) {
    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    overflow-x: auto;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.4;
    max-height: 400px;
    scrollbar-width: thin;
  }
  .slide-html :global(pre::-webkit-scrollbar) {
    width: 4px;
    height: 4px;
  }
  .slide-html :global(pre::-webkit-scrollbar-thumb) {
    background: var(--border-default);
    border-radius: 2px;
  }

  .slide-html :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .slide-html :global(:not(pre) > code) {
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .slide-html :global(blockquote) {
    border-left: 4px solid var(--accent-default);
    margin: 0.8em 0;
    padding: 0.4em 1em;
    background: var(--bg-elevated);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
  }

  .slide-html :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.8em 0;
  }

  .slide-html :global(th),
  .slide-html :global(td) {
    border: 1px solid var(--border-default);
    padding: 8px 12px;
    text-align: left;
  }

  .slide-html :global(th) {
    background: var(--bg-elevated);
    font-weight: 600;
  }

  .slide-html :global(img) {
    max-width: 100%;
    max-height: 45vh;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .slide-html :global(a) {
    color: var(--accent-default);
    text-decoration: none;
  }

  .slide-code .slide-html :global(pre) {
    font-size: 16px;
    padding: 20px 24px;
  }

  .slide-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    z-index: 20;
    opacity: 0;
    transition: opacity 200ms;
    pointer-events: none;
  }
  .controls-hidden .slide-header { opacity: 1; }
  .slide-header:hover,
  .controls-hidden .slide-header:hover { opacity: 1; }
  .slide-header .header-btn { pointer-events: auto; }

  .slide-deck-title {
    font-size: 11px;
    color: var(--text-tertiary);
    opacity: 0.5;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: auto;
  }

  .header-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 150ms, background 150ms;
  }
  .header-btn:hover {
    opacity: 1;
    background: var(--bg-hover);
  }

  .presentation-controls {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    background: color-mix(in srgb, var(--bg-surface) 75%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    z-index: 10;
    opacity: 0;
    transition: opacity 250ms ease;
    pointer-events: none;
  }
  .presentation-controls.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 120ms var(--ease-out);
  }
  .ctrl-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .ctrl-btn:disabled { opacity: 0.25; cursor: default; }
  .close-btn:hover:not(:disabled) {
    background: var(--error-bg, #3a1518);
    color: var(--error, #f87171);
  }

  .ctrl-sep {
    width: 1px;
    height: 16px;
    background: var(--border-default);
  }

  .slide-counter {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    min-width: 48px;
    text-align: center;
  }

  :global([data-reduced-motion="true"]) .slide {
    animation: none;
  }
</style>
