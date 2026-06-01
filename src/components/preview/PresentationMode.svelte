<script lang="ts">
  import { onMount, tick } from "svelte";

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

  let currentIndex = $state(0);
  let direction = $state(1); // 1 = forward, -1 = backward
  let touchStartX = $state(0);

  let totalSlides = $derived(deck?.slides.length ?? 0);
  let currentSlide = $derived(deck?.slides[currentIndex] ?? null);

  function goTo(index: number) {
    if (index < 0 || index >= totalSlides) return;
    direction = index > currentIndex ? 1 : -1;
    currentIndex = index;
  }
  function next() {
    goTo(currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex - 1);
  }

  function first() {
    goTo(0);
  }

  function last() {
    goTo(totalSlides - 1);
  }

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
    if (e.key === "Home") {
      e.preventDefault();
      first();
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      last();
      return;
    }
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

  onMount(() => {
    currentIndex = 0;
    direction = 1;
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  // Slide number display (1-based for humans)
  let displayNumber = $derived(currentIndex + 1);
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
    <!-- Slide container -->
    <div class="slide-container">
      {#key currentIndex}
        <div
          class="slide {slideClass(currentSlide?.kind ?? 'content')}"
          style:--dir={direction}
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
    <div class="presentation-controls"
    >
      <button
        class="ctrl-btn"
        onclick={(e) => { e.stopPropagation(); prev(); }}
        disabled={currentIndex === 0}
        aria-label="Previous slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg
        >
      </button
      >

      <div class="progress-area"
      >
        <div class="progress-dots"
        >
          {#each deck.slides as _, i}
            <button
              class="dot"
              class:active={i === currentIndex}
              onclick={(e) => { e.stopPropagation(); goTo(i); }}
              aria-label="Go to slide {i + 1}"
            >
            </button
            >
          {/each}
        </div
        >
        <span class="slide-counter"
        >{displayNumber} / {totalSlides}</span
        >
      </div
      >

      <button
        class="ctrl-btn"
        onclick={(e) => { e.stopPropagation(); next(); }}
        disabled={currentIndex === totalSlides - 1}
        aria-label="Next slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg
        >
      </button
      >

      <button
        class="ctrl-btn close-btn"
        onclick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close presentation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg
        >
      </button
      >
    </div
    >
  </div
>
{/if}

<style
  >
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
    padding: 48px 64px 0;
    position: relative;
    overflow: hidden;
  }

  .slide {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    animation: slideIn 400ms var(--ease-out) forwards;
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
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Title slide */
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

  /* Section slide */
  .section-layout {
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--accent-default);
    border-radius: var(--radius-xl);
    margin: 16px 0;
  }

  .section-heading {
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 700;
    color: white;
    margin: 0;
    line-height: 1.2;
    padding: 0 48px;
  }

  /* Content slide */
  .content-layout {
    gap: 24px;
    padding: 16px 0;
  }

  .content-heading {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
    line-height: 1.2;
    border-bottom: 2px solid var(--accent-default);
    padding-bottom: 12px;
  }

  .slide-html {
    color: var(--text-primary);
    font-size: clamp(1rem, 1.5vw, 1.3rem);
    line-height: 1.6;
  }

  .slide-html :global(p) {
    margin: 0.6em 0;
  }

  .slide-html :global(ul),
  .slide-html :global(ol) {
    margin: 0.6em 0;
    padding-left: 1.5em;
  }

  .slide-html :global(li) {
    margin: 0.3em 0;
  }

  .slide-html :global(pre) {
    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    padding: 16px 20px;
    overflow-x: auto;
    font-size: 0.9em;
    line-height: 1.5;
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
    max-height: 60vh;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .slide-html :global(a) {
    color: var(--accent-default);
    text-decoration: none;
  }

  /* Code slide overrides */
  .slide-code .slide-html :global(pre) {
    font-size: clamp(0.85rem, 1.3vw, 1.1rem);
    padding: 24px 28px;
  }

  /* Controls */
  .presentation-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px 24px 24px;
    width: 100%;
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

  /* Scrollbar styling */
  .slide-body::-webkit-scrollbar {
    width: 6px;
  }

  .slide-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .slide-body::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  /* Reduced motion */
  :global([data-reduced-motion="true"]) .slide {
    animation: none;
  }
</style
>
