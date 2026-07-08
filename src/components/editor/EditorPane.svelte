<script lang="ts">
  import { FileText } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { invoke } from "@tauri-apps/api/core";
  import { tabStore, activeDocumentStore } from "../../lib/tabStore";
  import { cursorPosition } from "../../lib/editorStore";
  import { initEditor, setEditorTheme, setEditorFont, setWordWrap, setMinimap, setSpellcheck, setCustomDictionary, setVimMode, setSlideBreaks } from "./codemirror";
  import { scrollSync } from "../../lib/scrollSync";
  import { insertMarkdownImage } from "./editorCommands";
  import Toolbar from "./Toolbar.svelte";
  import ImagePasteModal from "../ui/ImagePasteModal.svelte";
  import { startupCheckpoint } from "../../lib/debug";
  import { contentZoomStore } from "../../lib/contentZoomStore";

  interface PendingImage {
    file: File;
    previewUrl: string;
  }

  let container: HTMLDivElement;
  let editorView = $state<EditorView | null>(null);
  let isDragOver = $state(false);
  let isPasteFlash = $state(false);
  let dragCounter = 0;
  let baseFontFamily = $state("JetBrains Mono");
  let baseFontSize = $state(14);
  let baseLineHeight = $state(1.7);
  let wordWrap = $state(true);
  let showMinimap = $state(false);
  let spellcheckEnabled = $state(true);
  let vimModeEnabled = $state(false);
  let contextMenuVisible = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuWord = $state("");
  let slideBreakMode = $state(false);
  let pendingImages = $state<PendingImage[]>([]);

  let currentPendingImage = $derived(pendingImages[0] ?? null);

  function detectSlideBreaks(content: string): number[] {
    const lines = content.split("\n");
    const breaks: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^#{1,2}\s/.test(line)) breaks.push(i + 1);
      else if (/^---\s*$/.test(line)) breaks.push(i + 1);
    }
    return breaks;
  }

  function notifySlideBreaks(breaks: number[], enabled: boolean) {
    window.dispatchEvent(
      new CustomEvent("markz:slide-breaks-changed", {
        detail: { breaks: [...breaks].sort((a, b) => a - b), enabled },
      })
    );
  }

  function toggleSlideBreakMode() {
    slideBreakMode = !slideBreakMode;
    if (!editorView) return;

    const activeTab = tabStore.getActiveTab();
    let breaks = activeTab?.slideBreaks;
    if (breaks === undefined) {
      breaks = detectSlideBreaks(editorView.state.doc.toString());
      tabStore.setSlideBreaks(breaks);
    }

    setSlideBreaks(
      editorView,
      breaks ?? [],
      handleSlideBreakToggle,
      slideBreakMode
    );
    notifySlideBreaks(breaks ?? [], slideBreakMode);
  }

  function handleSlideBreakToggle(line: number) {
    const tab = tabStore.getActiveTab();
    if (!tab) return;
    const current = new Set(tab.slideBreaks ?? []);
    if (current.has(line)) {
      current.delete(line);
    } else {
      current.add(line);
    }
    const breaks = Array.from(current);
    tabStore.setSlideBreaks(breaks);
    // Re-apply so the gutter updates immediately
    if (editorView) {
      setSlideBreaks(editorView, breaks, handleSlideBreakToggle, slideBreakMode);
    }
    notifySlideBreaks(breaks, slideBreakMode);
  }

  function getWordAtPoint(x: number, y: number): string | null {
    const range = (document as any).caretRangeFromPoint?.(x, y)
      || (document as any).caretPositionFromPoint?.(x, y);
    if (!range) return null;
    const node = range.startContainer || range.offsetNode;
    const offset = range.startOffset ?? range.offset;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent || "";
    // Expand to word boundaries
    let start = offset;
    let end = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    const word = text.slice(start, end);
    return word.length > 0 ? word : null;
  }

  async function addToDictionary(word: string) {
    if (!word || !editorView) return;
    try {
      const settings = await invoke<any>("get_settings");
      const dict = settings.custom_dictionary ?? [];
      if (dict.includes(word)) return;
      dict.push(word);
      settings.custom_dictionary = dict;
      await invoke("update_settings", { settings });
      setCustomDictionary(editorView, dict);
      window.dispatchEvent(
        new CustomEvent("markz:settings-changed", {
          detail: { customDictionary: dict },
        })
      );
    } catch (e) {
      console.error("Failed to add word to dictionary:", e);
    }
  }

  function handleContextMenu(event: MouseEvent) {
    if (!spellcheckEnabled) return;
    const target = event.target as HTMLElement;
    // Only show on CodeMirror content area
    if (!target.closest(".cm-content")) return;
    const word = getWordAtPoint(event.clientX, event.clientY);
    if (!word) return;
    event.preventDefault();
    contextMenuWord = word;
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    contextMenuVisible = true;
  }

  function closeContextMenu() {
    contextMenuVisible = false;
    contextMenuWord = "";
  }

  function triggerPasteFlash() {
    isPasteFlash = true;
    setTimeout(() => {
      isPasteFlash = false;
    }, 300);
  }

  async function handlePaste(event: ClipboardEvent) {
    if (!editorView) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        imageItems.push(items[i]);
      }
    }

    if (imageItems.length === 0) return;

    event.preventDefault();

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      pendingImages = [...pendingImages, { file, previewUrl: URL.createObjectURL(file) }];
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    dragCounter++;
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      isDragOver = false;
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragCounter = 0;
    isDragOver = false;

    if (!editorView) return;

    const files = event.dataTransfer?.files;
    if (!files) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        imageFiles.push(files[i]);
      }
    }

    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      pendingImages = [...pendingImages, { file, previewUrl: URL.createObjectURL(file) }];
    }
  }

  function removeCurrentPendingImage() {
    const current = currentPendingImage;
    if (current) {
      URL.revokeObjectURL(current.previewUrl);
    }
    pendingImages = pendingImages.slice(1);
  }

  async function confirmImagePaste(altText: string) {
    const current = currentPendingImage;
    if (!current || !editorView) return;

    try {
      const arrayBuffer = await current.file.arrayBuffer();
      const imageData = new Uint8Array(arrayBuffer);
      const result = await invoke<{
        relative_path: string;
        absolute_path: string;
        filename: string;
      }>("save_image", { imageData, filename: current.file.name || "pasted.png" });
      insertMarkdownImage(editorView, altText || result.filename, result.relative_path);
      triggerPasteFlash();
    } catch (err) {
      console.error("Failed to save pasted image:", err);
    } finally {
      removeCurrentPendingImage();
    }
  }

  function cancelImagePaste() {
    removeCurrentPendingImage();
  }

  function applyEditorFont() {
    if (editorView) {
      setEditorFont(
        editorView,
        baseFontFamily,
        Math.round(baseFontSize * $contentZoomStore),
        baseLineHeight
      );
    }
  }

  function applyWordWrap() {
    if (editorView) {
      setWordWrap(editorView, wordWrap);
    }
  }

  function applyMinimap() {
    if (editorView) {
      setMinimap(editorView, showMinimap);
    }
  }

  function applySpellcheck() {
    if (editorView) {
      setSpellcheck(editorView, spellcheckEnabled);
    }
  }

  function applyVimMode() {
    if (editorView) {
      setVimMode(editorView, vimModeEnabled);
    }
  }

  async function loadFontSettings() {
    try {
      const s = await invoke<any>("get_settings");
      if (s) {
        baseFontFamily = s.editor_font_family ?? "JetBrains Mono";
        baseFontSize = s.editor_font_size ?? 14;
        baseLineHeight = s.line_height ?? 1.7;
        wordWrap = s.word_wrap ?? true;
        showMinimap = s.show_minimap ?? false;
        spellcheckEnabled = s.enable_spellcheck ?? true;
        vimModeEnabled = s.vim_mode ?? false;
        applyEditorFont();
        applyWordWrap();
        applyMinimap();
        applySpellcheck();
        applyVimMode();
        if (editorView) {
          setCustomDictionary(editorView, s.custom_dictionary ?? []);
        }
      }
    } catch (e) {
      console.error("Failed to load font settings:", e);
    }
  }

  function handleSettingsChanged(event: CustomEvent) {
    const detail = event.detail || {};
    if (detail.fontFamily !== undefined) {
      baseFontFamily = detail.fontFamily;
      baseFontSize = detail.fontSize ?? 14;
      baseLineHeight = detail.lineHeight ?? 1.7;
      applyEditorFont();
    }
    if (detail.wordWrap !== undefined) {
      wordWrap = detail.wordWrap;
      applyWordWrap();
    }
    if (detail.showMinimap !== undefined) {
      showMinimap = detail.showMinimap;
      applyMinimap();
    }
    if (detail.enableSpellcheck !== undefined) {
      spellcheckEnabled = detail.enableSpellcheck;
      applySpellcheck();
    }
    if (detail.vimMode !== undefined) {
      vimModeEnabled = detail.vimMode;
      applyVimMode();
    }
    if (detail.customDictionary !== undefined && editorView) {
      setCustomDictionary(editorView, detail.customDictionary);
    }
  }
  function handleToggleCheckbox(event: CustomEvent<{ index: number }>) {
    if (!editorView) return;
    const { index } = event.detail;
    const doc = editorView.state.doc;
    const text = doc.toString();
    const regex = /- \[( |x|X)\]/g;
    let match;
    let count = 0;
    while ((match = regex.exec(text)) !== null) {
      if (count === index) {
        const current = match[1];
        const replacement = current === " " ? "x" : " ";
        const from = match.index + 3;
        const to = from + 1;
        editorView.dispatch({
          changes: { from, to, insert: replacement },
        });
        break;
      }
      count++;
    }
  }

  function handleScrollToHeading(event: CustomEvent<{ anchor: string; line: number }>) {
    if (!editorView) return;
    const { line } = event.detail;
    try {
      const docLine = editorView.state.doc.line(line);
      editorView.dispatch({
        selection: { anchor: docLine.from },
        effects: EditorView.scrollIntoView(docLine.from, { y: "start" }),
      });
    } catch {
      // Line out of range — ignore
    }
  }
  let suppressChange = false;
  onMount(() => {
    startupCheckpoint("EditorPane mounting");
    const editor = initEditor(container, $activeDocumentStore.content, {
      fontFamily: baseFontFamily,
      fontSize: Math.round(baseFontSize * $contentZoomStore),
      lineHeight: baseLineHeight,
      showMinimap,
      customDictionary: [],
      slideBreaks: $activeDocumentStore.slideBreaks,
      slideBreaksEnabled: slideBreakMode,
      onSlideBreakToggle: (line) => {
        const tab = tabStore.getActiveTab();
        if (!tab) return;
        const current = new Set(tab.slideBreaks ?? []);
        if (current.has(line)) {
          current.delete(line);
        } else {
          current.add(line);
        }
        tabStore.setSlideBreaks(Array.from(current));
      },
      onChange: (newContent) => {
        if (suppressChange) return;
        tabStore.setContent(newContent);
      },
      onCursorChange: (pos) => {
        cursorPosition.set(pos);
      },
      onScroll: () => {
        const preview = document.querySelector(".preview-scroller") as HTMLElement | null;
        const scroller = container.querySelector(".cm-scroller") as HTMLElement | null;
        if (editorView && preview && scroller) {
          scrollSync.syncEditorToPreview(editorView, scroller, preview);
        }
      },
    });
    editorView = editor.view;

    // Load and apply font settings
    loadFontSettings();
    startupCheckpoint("EditorPane mounted");

    const onToggleSlideBreaks = () => {
      toggleSlideBreakMode();
    };
    window.addEventListener("markz:toggle-slide-breaks", onToggleSlideBreaks);

    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setEditorTheme(editor.view, isDark);
    });
    observer.observe(document.documentElement, { attributes: true });

    const unsub = activeDocumentStore.subscribe((doc) => {
      const current = editor.view.state.doc.toString();
      if (current !== doc.content) {
        suppressChange = true;
        editor.view.dispatch({
          changes: { from: 0, to: current.length, insert: doc.content },
        });
        suppressChange = false;
      }
      // Update slide-break gutter when switching tabs while mode is active
      if (slideBreakMode && editorView) {
        const breaks = doc.slideBreaks;
        if (breaks !== undefined) {
          setSlideBreaks(editorView, breaks, handleSlideBreakToggle, slideBreakMode);
          notifySlideBreaks(breaks, slideBreakMode);
        }
      }
    });

    window.addEventListener(
      "markz:settings-changed",
      handleSettingsChanged as EventListener
    );
    window.addEventListener(
      "markz:toggle-checkbox",
      handleToggleCheckbox as EventListener
    );
    window.addEventListener(
      "markz:scroll-to-heading",
      handleScrollToHeading as EventListener
    );

    const unsubZoom = contentZoomStore.subscribe(() => {
      applyEditorFont();
    });

    return () => {
      window.removeEventListener("markz:toggle-slide-breaks", onToggleSlideBreaks);
      window.removeEventListener(
        "markz:settings-changed",
        handleSettingsChanged as EventListener
      );
      window.removeEventListener(
        "markz:toggle-checkbox",
        handleToggleCheckbox as EventListener
      );
      window.removeEventListener(
        "markz:scroll-to-heading",
        handleScrollToHeading as EventListener
      );
      observer.disconnect();
      unsub();
      unsubZoom();
      editor.destroy();
    };
  });
</script>
<div class="editor-pane">
  <Toolbar view={editorView} slideBreakMode={slideBreakMode} onToggleSlideBreakMode={toggleSlideBreakMode} />
  <div class="editor-area">
    {#if !$activeDocumentStore.path && !$activeDocumentStore.content}
      <div class="editor-empty-hint">
        <div class="editor-empty-icon">
          <FileText size={40} strokeWidth={1.2} />
        </div>
        <span>Open a file or create a new document to start writing.</span>
      </div>
    {/if}
    <div
      class="editor-container"
      class:drag-over={isDragOver}
      class:paste-flash={isPasteFlash}
      role="application"
      aria-label="Markdown editor"
      bind:this={container}
      onpaste={handlePaste}
      ondragover={handleDragOver}
      ondragenter={handleDragEnter}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      oncontextmenu={handleContextMenu}
    ></div>
  </div>
  {#if contextMenuVisible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="editor-ctx-overlay"
      onclick={closeContextMenu}
      oncontextmenu={(e) => { e.preventDefault(); closeContextMenu(); }}
      role="presentation"
    >
      <div
        class="editor-ctx-menu"
        style="left: {contextMenuX}px; top: {contextMenuY}px;"
        onclick={(e) => e.stopPropagation()}
        role="menu"
        tabindex="-1"
        aria-label="Editor context menu"
      >
        <button
          class="editor-ctx-item"
          onclick={() => { addToDictionary(contextMenuWord); closeContextMenu(); }}
        >
          Add "{contextMenuWord}" to dictionary
        </button>
      </div>
    </div>
  {/if}
  <ImagePasteModal
    open={currentPendingImage !== null}
    previewUrl={currentPendingImage?.previewUrl ?? ""}
    filename={currentPendingImage?.file.name ?? ""}
    onConfirm={confirmImagePaste}
    onCancel={cancelImagePaste}
  />
</div>

<style>
  .editor-pane {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background: var(--bg-base);
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    min-height: 0;
  }
  .editor-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    position: relative;
    z-index: 1;
  }
  .editor-container :global(.cm-editor) {
    height: 100%;
  }
  .editor-empty-hint {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    color: var(--text-tertiary);
    font-size: var(--text-sm);
    text-align: center;
    pointer-events: none;
    z-index: 0;
    padding: var(--space-8);
    user-select: none;
  }
  .editor-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    color: var(--text-disabled);
    opacity: 0.5;
  }
  .drag-over {
    outline: 2px dashed var(--accent-default);
    outline-offset: -4px;
  }
  .paste-flash {
    animation: pasteFlash 300ms ease;
  }
  .editor-ctx-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
  }
  .editor-ctx-menu {
    position: fixed;
    min-width: 180px;
    padding: var(--space-1) 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    animation: ctxIn 100ms var(--ease-out);
  }
  .editor-ctx-item {
    display: block;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
  }
  .editor-ctx-item:hover {
    background: var(--bg-hover);
  }
  @keyframes ctxIn {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pasteFlash {
    0% {
      background: var(--accent-subtle);
    }
    100% {
      background: transparent;
    }
  }
</style>
