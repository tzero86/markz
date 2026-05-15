<script lang="ts">
  import { onMount } from "svelte";
  import type { EditorView } from "@codemirror/view";
  import { invoke } from "@tauri-apps/api/core";
  import { documentStore } from "../../lib/documentStore";
  import { cursorPosition } from "../../lib/editorStore";
  import { initEditor, setEditorTheme, setEditorFont } from "./codemirror";
  import { scrollSync } from "../../lib/scrollSync";
  import { insertMarkdownImage } from "./editorCommands";
  import Toolbar from "./Toolbar.svelte";

  let container: HTMLDivElement;
  let editorView = $state<EditorView | null>(null);
  let isDragOver = $state(false);
  let isPasteFlash = $state(false);
  let dragCounter = 0;

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

      try {
        const arrayBuffer = await file.arrayBuffer();
        const imageData = Array.from(new Uint8Array(arrayBuffer));
        const filename = file.name || "pasted.png";

        const result = await invoke<{
          relative_path: string;
          absolute_path: string;
          filename: string;
        }>("process_pasted_image", { imageData, filename });

        insertMarkdownImage(editorView, result.filename, result.relative_path);
        triggerPasteFlash();
      } catch (err) {
        console.error("Failed to process pasted image:", err);
      }
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
      try {
        const arrayBuffer = await file.arrayBuffer();
        const imageData = Array.from(new Uint8Array(arrayBuffer));
        const filename = file.name;

        const result = await invoke<{
          relative_path: string;
          absolute_path: string;
          filename: string;
        }>("process_dropped_image", { imageData, filename });

        insertMarkdownImage(editorView, result.filename, result.relative_path);
        triggerPasteFlash();
      } catch (err) {
        console.error("Failed to process dropped image:", err);
      }
    }
  }

  async function loadFontSettings() {
    try {
      const s = await invoke<any>("get_settings");
      if (s && editorView) {
        setEditorFont(
          editorView,
          s.editor_font_family,
          s.editor_font_size,
          s.line_height
        );
      }
    } catch (e) {
      console.error("Failed to load font settings:", e);
    }
  }

  function handleSettingsChanged(event: CustomEvent) {
    const detail = event.detail || {};
    if (editorView && detail.fontFamily !== undefined) {
      setEditorFont(
        editorView,
        detail.fontFamily,
        detail.fontSize ?? 14,
        detail.lineHeight ?? 1.7
      );
    }
  }

  onMount(() => {
    const editor = initEditor(container, $documentStore.content, {
      onChange: (newContent) => {
        documentStore.setContent(newContent);
      },
      onCursorChange: (pos) => {
        cursorPosition.set(pos);
      },
      onScroll: () => {
        const scroller = container.querySelector(".cm-scroller") as HTMLElement | null;
        const preview = document.querySelector(".preview-scroller") as HTMLElement | null;
        if (scroller && preview) {
          scrollSync.sync(scroller, preview);
        }
      },
    });
    editorView = editor.view;

    // Load and apply font settings
    loadFontSettings();

    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setEditorTheme(editor.view, isDark);
    });
    observer.observe(document.documentElement, { attributes: true });

    const unsub = documentStore.subscribe((doc) => {
      const current = editor.view.state.doc.toString();
      if (current !== doc.content) {
        editor.view.dispatch({
          changes: { from: 0, to: current.length, insert: doc.content },
        });
      }
    });

    window.addEventListener(
      "markz:settings-changed",
      handleSettingsChanged as EventListener
    );

    return () => {
      observer.disconnect();
      unsub();
      editor.destroy();
      window.removeEventListener(
        "markz:settings-changed",
        handleSettingsChanged as EventListener
      );
    };
  });
</script>

<div class="editor-pane">
  <Toolbar view={editorView} />
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
  ></div>
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
  .editor-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .editor-container :global(.cm-editor) {
    height: 100%;
  }
  .drag-over {
    outline: 2px dashed var(--accent-default);
    outline-offset: -4px;
  }
  .paste-flash {
    animation: pasteFlash 300ms ease;
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
