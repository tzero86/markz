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

  // Split raw deck into viewport-fitted slides via offscreen measurement
  let fittedSlides = $state<Slide[]>([]);
  let currentIndex = $state(0);
  let direction = $state(1);
  let touchStartX = $state(0);

  let totalSlides = $derived(fittedSlides.length);
  let currentSlide = $derived(fittedSlides[currentIndex] ?? null);
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

  // ── Offscreen measurement splitter ──────────────────────────────────────────

  /** Split HTML into top-level block-element chunks. */
  function splitHtmlBlocks(html: string): string[] {
    // Match top-level block tags: <p>, <h2-6>, <pre>, <ul>, <ol>,
    // <blockquote>, <table>, <hr>, and self-closing <hr>
    const re = /(<(?:p|h[2-6]|pre|ul|ol|blockquote|table|hr)\b[^>]*>[\s\S]*?<\/(?:p|h[2-6]|pre|ul|ol|blockquote|table)>|<hr\s*\/?>)/gi;
    const blocks: string[] = [];
    let match;
    let lastIdx = 0;
    while ((match = re.exec(html)) !== null) {
      // Include any text before this block (plain text / raw)
      if (match.index > lastIdx) {
        const text = html.slice(lastIdx, match.index).trim();
        if (text) blocks.push(text);
      }
      blocks.push(match[0]);
      lastIdx = re.lastIndex;
    }
    if (lastIdx < html.length) {
      const rest = html.slice(lastIdx).trim();
      if (rest) blocks.push(rest);
    }
    return blocks.length > 0 ? blocks : [html];
  }

  // Shared offscreen measurer — created once
  let measurer: HTMLDivElement | null = null;
  let _fitted: Slide[] | null = null;

  function getMeasurer(): HTMLDivElement {
    if (!measurer) {
      measurer = document.createElement("div");
      measurer.style.cssText = "position:fixed;visibility:hidden;left:-9999px;top:0;padding:0;font-size:clamp(1rem,1.5vw,1.3rem);line-height:1.6;font-family:var(--font-sans);";
      document.body.appendChild(measurer);
    }
    return measurer;
  }

  function measureSlides(raw: SlideDeck, viewportH: number): Slide[] {
    const m = getMeasurer();
    // Match the actual slide CSS: slide container padding + controls
    const availableH = viewportH - 48 - 80 - 40;
    const maxH = Math.max(availableH, 200);

    // Set measurer width to match actual slide content area
    const slideMaxW = 1200;
    const slidePad = 64;
    const actualW = Math.min(window.innerWidth, slideMaxW) - slidePad * 2;
    m.style.width = Math.max(actualW, 300) + "px";

    const result: Slide[] = [];
    for (const slide of raw.slides) {
      if (slide.kind === "title" || slide.kind === "section") {
        result.push(slide);
        continue;
      }
      const blocks = splitHtmlBlocks(slide.content);
      let currentBlocks: string[] = [];
      let currentH = 0;

      for (const block of blocks) {
        const isCode = block.startsWith("<pre") || block.startsWith("<pre>");

        // Measure this block in the offscreen container with matching max-height
        const testEl = document.createElement("div");
        testEl.innerHTML = block;
        if (isCode) {
          testEl.style.maxHeight = "55vh";
          testEl.style.overflow = "auto";
        }
        m.appendChild(testEl);
        const blockH = testEl.getBoundingClientRect().height;
        m.removeChild(testEl);

        const wouldFit = currentH + blockH <= maxH;

        if (!currentBlocks.length || wouldFit) {
          currentBlocks.push(block);
          currentH += blockH;
        } else {
          result.push({
            kind: "content",
            title: slide.title,
            content: currentBlocks.join("\n"),
            level: slide.level,
            index: result.length,
          });
          currentBlocks = [block];
          currentH = blockH;
        }
      }
      if (currentBlocks.length > 0) {
        result.push({
          kind: "content",
          title: slide.title,
          content: currentBlocks.join("\n"),
          level: slide.level,
          index: result.length,
        });
      }
    }
    return result;
  }

  function refitSlides() {
    if (!deck) return;
    const vh = window.innerHeight;
    _fitted = measureSlides(deck, vh);
    fittedSlides = _fitted;
  }

  // Run fitting when deck arrives or viewport resizes
  $effect(() => {
    if (deck) {
      refitSlides();
      const ro = new ResizeObserver(refitSlides);
      ro.observe(document.body);
      return () => ro.disconnect();
    }
  });

  onMount(() => {
    currentIndex = 0;
    direction = 1;
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (measurer) { document.body.removeChild(measurer); measurer = null; }
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
    onclick={(e) => { if (e.target === e.currentTarget) next(); }}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="presentation"
  >
    <div class="slide-container">
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
    <div class="presentation-controls">
      <button
        class="ctrl-btn"
        onclick={(e) => { e.stopPropagation(); prev(); }}
        disabled={currentIndex === 0}
        aria-label="Previous slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="progress-area">
        <div class="progress-dots">
          {#each fittedSlides as _, i}
            <button
              class="dot"
              class:active={i === currentIndex}
              onclick={(e) => { e.stopPropagation(); goTo(i); }}
              aria-label="Go to slide {i + 1}"
            ></button>
          {/each}
        </div>
        <span class="slide-counter">{displayNumber} / {totalSlides}</span>
      </div>

      <button
        class="ctrl-btn"
        onclick={(e) => { e.stopPropagation(); next(); }}
        disabled={currentIndex === totalSlides - 1}
        aria-label="Next slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <button
        class="ctrl-btn close-btn"
        onclick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close presentation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
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
    max-width: 1200px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 64px 80px;
    position: relative;
    overflow: hidden;
  }

  .slide {
    width: 100%;
    height: 100%;
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
    gap: 24px;
  }

  .title-heading {
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.1;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .title-author {
    font-size: clamp(1.1rem, 2vw, 1.5rem);
    color: var(--text-tertiary);
    margin: 0;
  }

  .title-subtitle {
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    color: var(--text-secondary);
    max-width: 700px;
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
    font-size: clamp(2rem, 4vw, 3.5rem);
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
    font-size: clamp(1.5rem, 2.5vw, 2.2rem);
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
    font-size: clamp(1rem, 1.5vw, 1.3rem);
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
    padding: 12px 16px;
    overflow-x: auto;
    overflow-y: auto;
    font-size: clamp(0.75rem, 1.1vw, 0.9em);
    line-height: 1.4;
    max-height: 55vh;
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
    font-size: clamp(0.85rem, 1.3vw, 1.1rem);
    padding: 24px 28px;
  }

  .presentation-controls {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 10px 20px;
    background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    z-index: 10;
  }

  .ctrl-btn {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 150ms var(--ease-out);
  }

  .ctrl-btn:hover:not(:disabled) {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  .ctrl-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .close-btn {
    margin-left: 8px;
  }

  .close-btn:hover {
    background: var(--error-bg, #3a1518);
    color: var(--error, #f87171);
    border-color: var(--error, #f87171);
  }

  .progress-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .progress-dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--border-default);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 200ms var(--ease-out);
  }

  .dot:hover {
    background: var(--text-tertiary);
    transform: scale(1.3);
  }

  .dot.active {
    background: var(--accent-default);
    width: 24px;
    border-radius: 4px;
  }

  .slide-counter {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  :global([data-reduced-motion="true"]) .slide {
    animation: none;
  }
</style>
