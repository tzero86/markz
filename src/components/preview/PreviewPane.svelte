<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { invoke } from "@tauri-apps/api/core";
  import { scrollSync } from "../../lib/scrollSync";
  import { resolvedTheme } from "../../lib/themeStore";
  import { highlightCodeBlocks, setHljsTheme } from "./syntaxHighlighter";
  import { renderMermaidBlocks, setMermaidTheme } from "./mermaidRenderer";
  import { renderMathBlocks } from "./mathRenderer";
  import { slugify } from "../../lib/toc";

  type PreviewFormat = "html" | "jira" | "confluence" | "slack" | "github";

  let htmlContent = $state("<p>Loading preview...</p>");
  let isRendering = $state(false);
  let previewDiv: HTMLDivElement;
  let contentDiv: HTMLDivElement | undefined = $state();
  let activeFormat = $state<PreviewFormat>("html");
  let settings = $state<{ embed_remote_images: boolean } | null>(null);

  const formats: { id: PreviewFormat; label: string }[] = [
    { id: "html", label: "HTML" },
    { id: "jira", label: "JIRA" },
    { id: "confluence", label: "Confluence" },
    { id: "slack", label: "Slack" },
    { id: "github", label: "GitHub" },
  ];

  // Load settings once on mount
  $effect(() => {
    invoke("get_settings")
      .then((s) => { settings = s as { embed_remote_images: boolean }; })
      .catch(() => { settings = { embed_remote_images: false }; });
  });

  // Debounced render
  let timeout: ReturnType<typeof setTimeout>;
  $effect(() => {
    const content = $documentStore.content;
    const format = activeFormat;
    const _settings = settings;
    clearTimeout(timeout);
    isRendering = true;
    timeout = setTimeout(async () => {
      try {
        if (format === "html") {
          const result = await invoke<string>("render_preview", { markdown: content, docPath: $documentStore.path });
          htmlContent = result;
        } else {
          const command = `convert_to_${format}`;
          const result = await invoke<string>(command, {
            markdown: content,
            docPath: $documentStore.path,
          });
          htmlContent = escapeHtml(result);
        }
      } catch (e) {
        htmlContent = `<p style="color:var(--error)">Preview error: ${String(e)}</p>`;
      } finally {
        isRendering = false;
      }
    }, 80);
    return () => clearTimeout(timeout);
  });

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function onScroll() {
    if (!previewDiv) return;
    const scroller = document.querySelector(".cm-scroller") as HTMLElement | null;
    if (scroller) {
      scrollSync.sync(previewDiv, scroller);
    }
  }

  async function copyOutput() {
    try {
      const text = activeFormat === "html"
        ? htmlContent.replace(/<[^>]+>/g, "") // rough text extract for HTML
        : htmlContent.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }

  function addHeadingAnchors(container: HTMLElement) {
    container.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      const text = heading.textContent || "";
      if (!heading.id) {
        heading.id = slugify(text);
      }
    });
  }

  // Post-process after DOM update
  $effect(() => {
    const _content = htmlContent;
    if (!contentDiv) return;

    if (activeFormat === "html") {
      addHeadingAnchors(contentDiv);
      renderMathBlocks(contentDiv);
      renderMermaidBlocks(contentDiv).catch(console.error);
      highlightCodeBlocks(contentDiv);
    }
  });

  // Listen for theme changes
  $effect(() => {
    const theme = $resolvedTheme;
    setHljsTheme(theme);
    if (contentDiv) {
      setMermaidTheme(theme, contentDiv).catch(console.error);
    }
  });
</script>

<div class="preview-pane">
  {#if isRendering}
    <div class="render-bar"></div>
  {/if}
  <div class="preview-toolbar">
    <div class="format-tabs">
      {#each formats as fmt}
        <button
          class="format-tab"
          class:active={activeFormat === fmt.id}
          onclick={() => (activeFormat = fmt.id)}
        >
          {fmt.label}
        </button>
      {/each}
    </div>
    <button class="ghost-btn" onclick={copyOutput} aria-label="Copy output" data-tooltip="Copy output">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  </div>
  <div class="preview-scroller" bind:this={previewDiv} onscroll={onScroll}>
    {#key htmlContent}
      {#if activeFormat === "html"}
        <div class="preview-content" bind:this={contentDiv}>
          {@html htmlContent}
        </div>
      {:else}
        <div class="preview-content text-format" bind:this={contentDiv}>
          <pre><code>{@html htmlContent}</code></pre>
        </div>
      {/if}
    {/key}
  </div>
</div>

<style>
  .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base);
    position: relative;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .render-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent-default);
    animation: shimmer 1s infinite;
    z-index: 5;
  }
  @keyframes shimmer {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
  .preview-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-surface);
    flex-shrink: 0;
    height: 44px;
    box-sizing: border-box;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .format-tabs {
    display: flex;
    gap: var(--space-1);
  }
  .format-tab {
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .format-tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .format-tab.active {
    background: var(--bg-hover);
    color: var(--accent-default);
  }
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .ghost-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .preview-scroller {
    flex: 1;
    overflow: auto;
  }
  .preview-content {
    max-width: 820px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-8);
    font-size: var(--text-md);
    line-height: 1.7;
    color: var(--text-primary);
    animation: fadeIn 150ms ease;
  }
  .preview-content.text-format {
    max-width: 900px;
  }
  .preview-content.text-format pre {
    background: transparent;
    padding: 0;
    margin: 0;
    overflow-x: auto;
  }
  .preview-content.text-format code {
    background: transparent;
    padding: 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .preview-content :global(h1) {
    font-size: 28px;
    font-weight: 700;
    margin-top: var(--space-10);
    margin-bottom: var(--space-4);
    letter-spacing: -0.02em;
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--space-3);
  }
  .preview-content :global(h2) {
    font-size: 22px;
    font-weight: 600;
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
    letter-spacing: -0.02em;
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--space-2);
  }
  .preview-content :global(h3) {
    font-size: 18px;
    font-weight: 600;
    margin-top: var(--space-6);
    margin-bottom: var(--space-3);
    letter-spacing: -0.02em;
  }
  .preview-content :global(p) {
    margin: var(--space-4) 0;
  }
  .preview-content :global(a) {
    color: var(--accent-default);
    text-decoration: none;
  }
  .preview-content :global(a:hover) {
    text-decoration: underline;
  }
  .preview-content :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: var(--bg-surface);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }
  .preview-content :global(pre) {
    background: var(--bg-surface);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: var(--space-4) 0;
  }
  .preview-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 13px;
    line-height: 1.6;
  }
  .preview-content :global(blockquote) {
    border-left: 3px solid var(--accent-muted);
    padding-left: var(--space-4);
    margin: var(--space-4) 0;
    color: var(--text-secondary);
    font-style: italic;
  }
  .preview-content :global(ul), .preview-content :global(ol) {
    margin: var(--space-4) 0;
    padding-left: var(--space-8);
  }
  .preview-content :global(ul) {
    list-style-type: disc;
  }
  .preview-content :global(ul ul) {
    list-style-type: circle;
  }
  .preview-content :global(ul ul ul) {
    list-style-type: square;
  }
  .preview-content :global(li) > :global(p) {
    margin: var(--space-1) 0;
  }
  .preview-content :global(li) {
    margin: var(--space-1) 0;
    padding-left: var(--space-1);
  }
  .preview-content :global(li.task-list-item) {
    list-style-type: none;
    padding-left: 0;
    margin-left: -20px;
  }
  .preview-content :global(input[type="checkbox"]) {
    margin-right: var(--space-2);
    vertical-align: middle;
    accent-color: var(--accent-default);
  }
  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border-default);
    margin: var(--space-6) 0;
  }
  .preview-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4) 0;
  }
  .preview-content :global(th), .preview-content :global(td) {
    border: 1px solid var(--border-default);
    padding: var(--space-2) var(--space-3);
    text-align: left;
  }
  .preview-content :global(th) {
    background: var(--bg-hover);
    font-weight: 600;
  }
  .preview-content :global(tr:nth-child(even)) {
    background: var(--bg-subtle);
  }
  .preview-content :global(img) {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin: var(--space-4) 0;
  }
  .preview-content :global(.mermaid-diagram) {
    display: flex;
    justify-content: center;
    margin: var(--space-4) 0;
  }
  .preview-content :global(.mermaid-diagram svg) {
    max-width: 100%;
  }
</style>
