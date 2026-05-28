<script lang="ts">
  import { activeDocumentStore, tabStore } from "../../lib/tabStore";
  import { invoke } from "@tauri-apps/api/core";
  import { scrollSync } from "../../lib/scrollSync";
  import { resolvedTheme } from "../../lib/themeStore";
  import { highlightCodeBlocks, setHljsTheme } from "./syntaxHighlighter";
  import { renderMermaidBlocks, setMermaidTheme } from "./mermaidRenderer";
  import { renderMathBlocks } from "./mathRenderer";
  import { slugify } from "../../lib/toc";
  import { contentZoomStore } from "../../lib/contentZoomStore";
  import { FORMAT_ICONS } from "../../lib/formatIcons";
  import { Copy, Check, Play, Pause, Square } from "@lucide/svelte";
  import { ttsStore } from "../../lib/ttsStore";
  import { onMount } from "svelte";
import TableEditorModal from "../editor/TableEditorModal.svelte";
  import DOMPurify from "dompurify";

  type PreviewFormat = "html" | "jira" | "confluence" | "slack" | "github";

  /** Cache of content+format → rendered HTML to avoid redundant re-renders.
   *  Implemented as an LRU (least-recently-used) Map with a max size. */
  const renderCache = new Map<string, string>();
  const MAX_CACHE_SIZE = 10;

  let htmlContent = $state("<p>Loading preview...</p>");
  let isRendering = $state(false);
  let previewDiv: HTMLDivElement;
  let contentDiv: HTMLDivElement | undefined = $state();
  let activeFormat = $state<PreviewFormat>("html");
  let settings = $state<{ embed_remote_images: boolean; preview_font_size: number } | null>(null);
  let copyFeedback = $state(false);
  let renderProgress = $state(0);
  let previewEditing = $state(false);
  let tableEditorOpen = $state(false);
  let tableEditorIndex = $state(0);
  let syncFeedback = $state(false);

  const formats: { id: PreviewFormat; label: string; icon: string }[] = [
    { id: "html", label: "HTML", icon: FORMAT_ICONS.html_sm },
    { id: "jira", label: "JIRA", icon: FORMAT_ICONS.jira_sm },
    { id: "confluence", label: "Confluence", icon: FORMAT_ICONS.confluence_sm },
    { id: "slack", label: "Slack", icon: FORMAT_ICONS.slack_sm },
    { id: "github", label: "GitHub", icon: FORMAT_ICONS.github_sm },
  ];

  invoke("get_settings")
    .then((s) => { settings = s as { embed_remote_images: boolean; preview_font_size: number }; })
    .catch(() => { settings = { embed_remote_images: false, preview_font_size: 16 }; });

  // Debounced render with progress animation and content hash caching
  let timeout: ReturnType<typeof setTimeout>;
  let lastCacheKey = "";
  $effect(() => {
    const content = $activeDocumentStore.content;
    const cacheKey = content + "\n###FORMAT###\n" + activeFormat;
    // Skip re-render if content hasn't actually changed
    if (cacheKey === lastCacheKey && htmlContent !== "<p>Loading preview...</p>") {
      return;
    }
    lastCacheKey = cacheKey;

    // Check cache — clear any pending render before returning
    const cached = renderCache.get(cacheKey);
    if (cached) {
      clearTimeout(timeout);
      htmlContent = cached;
      return;
    }

    const format = activeFormat;
    clearTimeout(timeout);
    isRendering = true;
    renderProgress = 0;
    const progressInterval = setInterval(() => {
      renderProgress = Math.min(renderProgress + 15, 85);
    }, 50);
    timeout = setTimeout(async () => {
      try {
        clearInterval(progressInterval);
        renderProgress = 90;
        let result: string;
        if (format === "html") {
          result = await invoke<string>("render_preview", { markdown: content, docPath: $activeDocumentStore.path });
          // Sanitize HTML to prevent XSS from untrusted markdown content
          result = DOMPurify.sanitize(result);
        } else {
          const command = `convert_to_${format}`;
          result = await invoke<string>(command, {
            markdown: content,
            docPath: $activeDocumentStore.path,
          });
          result = escapeHtml(result);
        }
        htmlContent = result;
        // LRU insertion: delete old key first to bump to most-recent position
        renderCache.delete(cacheKey);
        renderCache.set(cacheKey, result);
        // Evict oldest entries if over max size
        while (renderCache.size > MAX_CACHE_SIZE) {
          const oldestKey = renderCache.keys().next().value;
          if (oldestKey) renderCache.delete(oldestKey);
        }
        renderProgress = 100;
      } catch (e) {
        htmlContent = `<p style="color:var(--error)">Preview error: ${String(e)}</p>`;
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => {
          isRendering = false;
          renderProgress = 0;
        }, 200);
      }
    }, 150); // Increased debounce from 80ms to 150ms for better performance
    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    };
  });

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function handleTableDblClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const table = target.closest("table");
    if (!table || !contentDiv) return;
    const tables = contentDiv.querySelectorAll("table");
    let idx = -1;
    tables.forEach((t, i) => { if (t === table) idx = i; });
    if (idx >= 0) {
      tableEditorIndex = idx;
      tableEditorOpen = true;
    }
  }

  function onScroll() {
    if (!previewDiv) return;
    const scroller = document.querySelector(".cm-scroller") as HTMLElement | null;
    if (scroller) {
      scrollSync.syncPreviewToEditor(previewDiv, scroller);
    }
  }

  function cleanNodeForClipboard(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style") {
      return "";
    }

    const allowedTags = new Set([
      "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "em", "del", "code", "pre", "a", "img",
      "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td",
      "br", "hr", "div", "span"
    ]);
    if (!allowedTags.has(tag)) {
      return "";
    }

    let attrs = "";
    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href) attrs += ` href="${href.replace(/"/g, "&quot;")}"`;
    }
    if (tag === "img") {
      const src = el.getAttribute("src");
      const alt = el.getAttribute("alt") || "";
      if (src) attrs += ` src="${src.replace(/"/g, "&quot;")}"`;
      attrs += ` alt="${alt.replace(/"/g, "&quot;")}"`;
    }

    let html = `<${tag}${attrs}>`;
    for (const child of el.childNodes) {
      html += cleanNodeForClipboard(child);
    }
    html += `</${tag}>`;
    return html;
  }

  function onCopy(e: ClipboardEvent) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!previewDiv || !previewDiv.contains(range.commonAncestorContainer)) {
      return;
    }

    const fragment = range.cloneContents();
    const container = document.createElement("div");
    container.appendChild(fragment);
    const cleanHtml = cleanNodeForClipboard(container);

    e.clipboardData?.setData("text/html", cleanHtml);
    e.clipboardData?.setData("text/plain", selection.toString());
    e.preventDefault();
  }

  async function copyOutput() {
    try {
      const plainText = activeFormat === "html"
        ? htmlContent.replace(/<[^>]+>/g, "")
        : htmlContent.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");

      if (activeFormat === "html") {
        await navigator.clipboard.writeText(plainText);
      } else {
        // For non-HTML formats, also fetch the rendered HTML so rich editors
        // (JIRA, Confluence, etc.) can paste formatted content properly.
        const renderedHtml = await invoke<string>("render_preview", {
          markdown: $activeDocumentStore.content,
          docPath: $activeDocumentStore.path,
        });
        const blobHtml = new Blob([renderedHtml], { type: "text/html" });
        const blobText = new Blob([plainText], { type: "text/plain" });
        const item = new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        });
        await navigator.clipboard.write([item]);
      }

      copyFeedback = true;
      setTimeout(() => copyFeedback = false, 1500);
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

  /** Scale mermaid SVGs so they grow/shrink with the preview zoom level.
   *  On first call we tighten the viewBox to the actual content bounds
   *  (removes excess empty canvas space) and strip width="100%" so the
   *  SVG has a predictable natural size. Zoom is applied via CSS
   *  transform:scale() — this scales the entire rendering tree uniformly
   *  without fighting viewBox / width / height interactions. */
  function scaleMermaidDiagrams() {
    if (!contentDiv || activeFormat !== "html") return;
    const zoom = $contentZoomStore;

    contentDiv.querySelectorAll(".mermaid-diagram").forEach((divEl) => {
      const div = divEl as HTMLElement;
      const svg = div.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;

      // ── First call: tighten viewBox, remove responsive width="100%" ──
      if (!svg.getAttribute("data-tightened")) {
        try {
          const bbox = svg.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            const pad = 16; // small padding so text isn't cramped
            const vx = Math.max(0, bbox.x - pad);
            const vy = Math.max(0, bbox.y - pad);
            const vw = bbox.width + pad * 2;
            const vh = bbox.height + pad * 2;
            svg.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);
            svg.removeAttribute("width");
            svg.removeAttribute("height");
            svg.style.width = "";
            svg.style.height = "";
            svg.setAttribute("data-tightened", "true");
          }
        } catch (e) {
          // getBBox can fail on unrendered SVGs; retry next call
        }
      }

      // ── Measure natural (unscaled) rendered size ──
      let naturalWidth = parseFloat(svg.getAttribute("data-nat-w") || "0");
      let naturalHeight = parseFloat(svg.getAttribute("data-nat-h") || "0");
      if (!naturalWidth || !naturalHeight) {
        const rect = svg.getBoundingClientRect();
        naturalWidth = rect.width;
        naturalHeight = rect.height;
        if (naturalWidth > 0 && naturalHeight > 0) {
          svg.setAttribute("data-nat-w", String(naturalWidth));
          svg.setAttribute("data-nat-h", String(naturalHeight));
        }
      }

      // ── Apply zoom via transform ──
      if (naturalWidth > 0 && naturalHeight > 0) {
        svg.style.transform = `scale(${zoom})`;
        svg.style.transformOrigin = "center top";
        // Resize parent so the scaled SVG doesn't get clipped
        // and doesn't overlap following content.
        div.style.width = `${naturalWidth * zoom}px`;
        div.style.height = `${naturalHeight * zoom}px`;
      }
    });
  }

  $effect(() => {
    const _content = htmlContent;
    if (!contentDiv) return;

    if (activeFormat === "html") {
      addHeadingAnchors(contentDiv);
      renderMathBlocks(contentDiv);
      renderMermaidBlocks(contentDiv)
        .then(() => scaleMermaidDiagrams())
        .catch(console.error);
      highlightCodeBlocks(contentDiv);
    }
  });

  // Re-scale mermaid when zoom changes (content already rendered)
  $effect(() => {
    const zoom = $contentZoomStore;
    if (!contentDiv) return;
    scaleMermaidDiagrams();
  });

  $effect(() => {
    const theme = $resolvedTheme;
    setHljsTheme(theme);
    if (contentDiv) {
      setMermaidTheme(theme, contentDiv).catch(console.error);
    }
  });

  onMount(() => {
    function onPrint() {
      if (!contentDiv) {
        window.print();
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.zIndex = "-9999";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) return;

      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules;
          const style = doc.createElement("style");
          for (const rule of rules) {
            style.textContent += rule.cssText + "\n";
          }
          doc.head.appendChild(style);
        } catch {
          // Cross-origin stylesheets — skip
        }
      }

      // Always use light theme for print so text is dark-on-light
      doc.documentElement.setAttribute("data-theme", "light");

      // Inject explicit light-theme color variables so text is readable
      // regardless of the app's current theme.
      const lightVars = doc.createElement("style");
      lightVars.textContent = `
        :root {
          --text-primary: #1a1a1a;
          --text-secondary: #333333;
          --text-tertiary: #666666;
          --bg-base: #ffffff;
          --bg-surface: #ffffff;
          --bg-hover: #f5f5f5;
          --bg-subtle: #f6f8fa;
          --border-default: #d0d7de;
          --accent-default: #0969da;
          --accent-hover: #0550ae;
        }
      `;
      doc.head.appendChild(lightVars);

      const printStyle = doc.createElement("style");
      printStyle.textContent = `
        @media print {
          body { margin: 0; padding: 20px; background: white; color: black; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `;
      doc.head.appendChild(printStyle);

      const wrapper = doc.createElement("div");
      wrapper.className = "preview-content";
      // Preserve zoom-scaled font size from the live preview
      const fontSize = contentDiv.style.fontSize;
      if (fontSize) wrapper.style.fontSize = fontSize;
      wrapper.innerHTML = contentDiv.innerHTML;
      doc.body.appendChild(wrapper);

      const images = Array.from(doc.querySelectorAll("img"));
      const pending = images.filter((img) => !img.complete);
      if (pending.length === 0) {
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1000);
      } else {
        let loaded = 0;
        const onDone = () => {
          loaded++;
          if (loaded >= pending.length) {
            iframe.contentWindow?.print();
            setTimeout(() => iframe.remove(), 1000);
          }
        };
        pending.forEach((img) => {
          img.onload = onDone;
          img.onerror = onDone;
        });
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 1000);
        }, 2000);
      }
    }
    window.addEventListener("markz:print", onPrint);
    return () => window.removeEventListener("markz:print", onPrint);
  });

</script>

<div class="preview-pane">
  {#if isRendering}
    <div class="render-progress-bar" style="--progress: {renderProgress}%"></div>
  {/if}
  <div class="preview-toolbar">
    <div class="format-tabs">
      {#each formats as fmt}
        <button
          class="format-tab"
          class:active={activeFormat === fmt.id}
          onclick={() => (activeFormat = fmt.id)}
          aria-pressed={activeFormat === fmt.id}
        >
          <span class="format-icon">{@html fmt.icon}</span>
          <span class="format-label">{fmt.label}</span>
        </button>
      {/each}
    </div>
    <div class="toolbar-actions">
      <!-- Bi-directional editing hidden for now — needs more testing -->
      <!-- {#if activeFormat === "html"} -->
      <!--   <button class="action-btn" class:active={previewEditing} onclick={() => (previewEditing = !previewEditing)}> -->
      <!--     <Pencil size={14} strokeWidth={2} /> -->
      <!--   </button> -->
      <!--   {#if previewEditing} ... sync button ... {/if} -->
      <!-- {/if} -->
      {#if activeFormat === "html"}
        <div class="tts-controls">
          {#if $ttsStore.state === "loading"}
            <button class="action-btn" disabled aria-label="Loading">
              <span class="tts-spinner"></span>
            </button>
          {:else if $ttsStore.state === "idle"}
            <button
              class="action-btn"
              onclick={() => {
                if (contentDiv) {
                  const text = ttsStore.extractReadableText(contentDiv);
                  if (text) ttsStore.speak(text);
                }
              }}
              aria-label="Read aloud"
              data-tooltip="Read aloud"
            >
              <Play size={14} strokeWidth={2} />
            </button>
          {:else if $ttsStore.state === "playing"}
            <button
              class="action-btn"
              onclick={() => ttsStore.pause()}
              aria-label="Pause"
              data-tooltip="Pause"
            >
              <Pause size={14} strokeWidth={2} />
            </button>
          {:else}
            <button
              class="action-btn"
              onclick={() => ttsStore.resume()}
              aria-label="Resume"
              data-tooltip="Resume"
            >
              <Play size={14} strokeWidth={2} />
            </button>
          {/if}
          {#if $ttsStore.state !== "idle" && $ttsStore.state !== "loading"}
            <button
              class="action-btn"
              onclick={() => ttsStore.stop()}
              aria-label="Stop"
              data-tooltip="Stop"
            >
              <Square size={14} strokeWidth={2} />
            </button>
          {/if}
        </div>
      {/if}
      <button
        class="action-btn"
        class:success={copyFeedback}
        onclick={copyOutput}
        aria-label={copyFeedback ? "Copied!" : "Copy output"}
        data-tooltip={copyFeedback ? "Copied!" : "Copy output"}
      >
        {#if copyFeedback}
          <Check size={14} strokeWidth={2.5} />
        {:else}
          <Copy size={14} strokeWidth={2} />
        {/if}
        <span class="action-label">{copyFeedback ? "Copied" : "Copy"}</span>
      </button>
    </div>
  </div>
  <div class="preview-scroller" bind:this={previewDiv} onscroll={onScroll} oncopy={onCopy}>
    {#key htmlContent}
      {#if activeFormat === "html"}
        <div
          class="preview-content"
          class:editing={previewEditing}
          bind:this={contentDiv}
          contenteditable={previewEditing}
          ondblclick={handleTableDblClick}
          role="presentation"
          style:font-size="{Math.round((settings?.preview_font_size ?? 16) * $contentZoomStore)}px"
        >
          {@html htmlContent}
        </div>
      {:else}
        <div class="preview-content text-format" bind:this={contentDiv} style:font-size="{Math.round((settings?.preview_font_size ?? 16) * $contentZoomStore)}px">
          <pre><code>{@html htmlContent}</code></pre>
        </div>
      {/if}
    {/key}
  <TableEditorModal
    open={tableEditorOpen}
    markdown={$activeDocumentStore.content}
    tableIndex={tableEditorIndex}
    onApply={(newMd) => {
      tabStore.setContent(newMd);
    }}
    onClose={() => (tableEditorOpen = false)}
  />
  </div>
</div>

<style>
  @font-face {
    font-family: "MarkZEmoji";
    src: local("Segoe UI Emoji"), local("Apple Color Emoji"), local("Noto Color Emoji");
    unicode-range:
      U+1F300-1F5FF,
      U+1F600-1F64F,
      U+1F680-1F6FF,
      U+1F700-1F77F,
      U+1F780-1F7FF,
      U+1F800-1F8FF,
      U+1F900-1F9FF,
      U+1FA00-1FA6F,
      U+1FA70-1FAFF,
      U+2600-26FF,
      U+2700-27BF;
  }

  .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base);
    position: relative;
    transition: background-color 300ms var(--ease-in-out);
  }

  /* Progress bar */
  .render-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: var(--progress);
    background: var(--accent-default);
    z-index: 5;
    transition: width 50ms ease;
    border-radius: 0 1px 1px 0;
  }

  /* Toolbar */
  .preview-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-surface);
    flex-shrink: 0;
    box-sizing: border-box;
    transition: background-color 300ms var(--ease-in-out),
                border-color 300ms var(--ease-in-out);
  }

  .format-tabs {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
  }
  .format-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    white-space: nowrap;
  }
  .format-tab:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
  .format-tab.active {
    background: var(--bg-active);
    color: var(--accent-default);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }
  .format-icon {
    display: inline-flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 150ms ease;
  }
  .format-tab:hover .format-icon,
  .format-tab.active .format-icon {
    opacity: 1;
  }
  .format-label {
    transition: color 150ms ease;
  }

  /* Toolbar actions */
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    box-shadow: var(--shadow-xs);
  }
  .action-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-focus);
    transform: translateY(-0.5px);
  }
  .action-btn:active {
    transform: scale(0.97);
  }
  .action-btn.success {
    background: var(--success);
    color: white;
    border-color: var(--success);
    animation: successPulse 300ms var(--ease-spring);
  }
  .action-btn.success:hover {
    background: var(--accent-hover);
  }
  .action-btn.active {
    background: var(--accent-default);
    color: white;
    border-color: var(--accent-default);
  }
  .action-label {
    font-size: 11px;
  }
  @keyframes successPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  /* TTS controls */
  .tts-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
  }
  .tts-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent-default);
    border-radius: 50%;
    animation: spin 600ms linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .preview-scroller {
    flex: 1;
    overflow: auto;
  }
  .preview-content {
    max-width: 820px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-8);
    font-family: "MarkZEmoji", var(--font-sans);
    font-size: var(--text-md);
    line-height: 1.7;
    color: var(--text-primary);
    font-variant-emoji: emoji;
    animation: fadeIn 200ms var(--ease-out);
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
    font-size: 0.8125em;
    line-height: 1.6;
    white-space: pre;
  }
  .preview-content.editing {
    outline: 2px dashed var(--accent-default);
    outline-offset: 4px;
    border-radius: var(--radius-sm);
    cursor: text;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Content styles */
  .preview-content :global(h1) {
    font-size: 1.75em;
    font-weight: 700;
    margin-top: var(--space-10);
    margin-bottom: var(--space-4);
    letter-spacing: -0.02em;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: var(--space-3);
  }
  .preview-content :global(h2) {
    font-size: 1.375em;
    font-weight: 600;
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
    letter-spacing: -0.02em;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: var(--space-2);
  }
  .preview-content :global(h3) {
    font-size: 1.125em;
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
    transition: opacity 150ms ease;
  }
  .preview-content :global(a:hover) {
    text-decoration: underline;
    opacity: 0.85;
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
    border: 1px solid var(--border-subtle);
  }
  .preview-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.8125em;
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
  .preview-content :global(ul) { list-style-type: disc; }
  .preview-content :global(ul ul) { list-style-type: circle; }
  .preview-content :global(ul ul ul) { list-style-type: square; }
  .preview-content :global(li) > :global(p) { margin: var(--space-1) 0; }
  .preview-content :global(li) {
    margin: var(--space-1) 0;
    padding-left: var(--space-1);
  }
  .preview-content :global(li.task-list-item) {
    list-style-type: none;
    padding-left: 0;
    margin-left: 0;
  }
  .preview-content :global(li.task-list-item) :global(input[type="checkbox"]) {
    margin-right: var(--space-2);
    accent-color: var(--accent-default);
    cursor: default;
    vertical-align: middle;
    transform: translateY(-1px);
  }
  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border-subtle);
    margin: var(--space-6) 0;
  }
  .preview-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4) 0;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border-default);
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
  .preview-content :global(tr:nth-child(even)) { background: var(--bg-subtle); }
  .preview-content :global(img) {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin: var(--space-4) 0;
    box-shadow: var(--shadow-sm);
  }
  .preview-content :global(.mermaid-diagram) {
    display: flex;
    justify-content: center;
    margin: var(--space-4) 0;
    overflow: visible; /* allow scaled SVG to extend beyond its box */
  }

  /* Tooltips */
  [data-tooltip] {
    position: relative;
  }
  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%) scale(0.95);
    padding: 4px 8px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-md);
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms ease, transform 120ms var(--ease-out);
    z-index: 200;
  }
  [data-tooltip]:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  :global(.preview-content table) {
    cursor: pointer;
    transition: outline 0.1s;
  }
  :global(.preview-content table:hover) {
    outline: 2px dashed var(--accent-default, #3b82f6);
    outline-offset: 2px;
  }
</style>