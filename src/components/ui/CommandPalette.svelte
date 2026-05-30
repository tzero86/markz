<script lang="ts">
  import { File, FolderOpen, FilePlus, Save, Search, Command, ListTree, Link2, GitBranch, Settings, HelpCircle, Type, Image, Table, Printer, Download, PanelLeft, Eye, EyeOff, Moon, Sun, ZoomIn, ZoomOut, RotateCcw, ChevronRight } from "@lucide/svelte";
  import { onMount, tick } from "svelte";
  import { searchPalette, type PaletteItem, type PaletteMode, registerCommandPalette } from "../../lib/commandPalette";
  import { contentZoomStore } from "../../lib/contentZoomStore";
  import { saveDocument, openDocument, openFolder, newDocument, closeActiveTab, toggleSidebar } from "../../lib/keyboard";

  interface Props {
    open: boolean;
    mode: PaletteMode;
    onClose: () => void;
  }

  let { open = $bindable(), mode, onClose }: Props = $props();

  let query = $state("");
  let selectedIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLDivElement | null>(null);

  const iconMap: Record<string, any> = {
    file: File,
    folder: FolderOpen,
    "new-file": FilePlus,
    save: Save,
    search: Search,
    command: Command,
    outline: ListTree,
    links: Link2,
    git: GitBranch,
    settings: Settings,
    help: HelpCircle,
    type: Type,
    image: Image,
    table: Table,
    printer: Printer,
    download: Download,
    sidebar: PanelLeft,
    eye: Eye,
    "eye-off": EyeOff,
    moon: Moon,
    sun: Sun,
    "zoom-in": ZoomIn,
    "zoom-out": ZoomOut,
    "rotate-ccw": RotateCcw,
  };

  function buildCommands(): PaletteItem[] {
    return [
      { id: "new-file", label: "New File", detail: "Create a new untitled document", icon: "new-file", action: () => { newDocument(); onClose(); } },
      { id: "open-file", label: "Open File...", detail: "Open an existing markdown file", icon: "file", action: () => { openDocument(); onClose(); } },
      { id: "open-folder", label: "Open Folder...", detail: "Open a workspace folder", icon: "folder", action: () => { openFolder(); onClose(); } },
      { id: "save", label: "Save", detail: "Save the current document", icon: "save", action: () => { saveDocument(); onClose(); } },
      { id: "close-tab", label: "Close Tab", detail: "Close the active tab", icon: "x", action: () => { closeActiveTab(); onClose(); } },
      { id: "toggle-sidebar", label: "Toggle Sidebar", detail: "Show or hide the sidebar panel", icon: "sidebar", action: () => { toggleSidebar(); onClose(); } },
      { id: "toggle-outline", label: "Show Outline", detail: "Switch sidebar to Outline view", icon: "outline", action: () => { window.dispatchEvent(new CustomEvent("markz:set-activity", { detail: "outline" })); onClose(); } },
      { id: "toggle-files", label: "Show Files", detail: "Switch sidebar to Files view", icon: "folder", action: () => { window.dispatchEvent(new CustomEvent("markz:set-activity", { detail: "files" })); onClose(); } },
      { id: "toggle-links", label: "Show Links", detail: "Switch sidebar to Links view", icon: "links", action: () => { window.dispatchEvent(new CustomEvent("markz:set-activity", { detail: "links" })); onClose(); } },
      { id: "view-split", label: "Split View", detail: "Show editor and preview side by side", icon: "eye", action: () => { window.dispatchEvent(new CustomEvent("markz:set-view-mode", { detail: "split" })); onClose(); } },
      { id: "view-editor", label: "Editor Only", detail: "Show only the editor pane", icon: "eye-off", action: () => { window.dispatchEvent(new CustomEvent("markz:set-view-mode", { detail: "editor" })); onClose(); } },
      { id: "view-preview", label: "Preview Only", detail: "Show only the preview pane", icon: "eye", action: () => { window.dispatchEvent(new CustomEvent("markz:set-view-mode", { detail: "preview" })); onClose(); } },
      { id: "zoom-in", label: "Zoom In", detail: "Increase content zoom", icon: "zoom-in", action: () => { contentZoomStore.increase(); onClose(); } },
      { id: "zoom-out", label: "Zoom Out", detail: "Decrease content zoom", icon: "zoom-out", action: () => { contentZoomStore.decrease(); onClose(); } },
      { id: "zoom-reset", label: "Reset Zoom", detail: "Reset zoom to 100%", icon: "rotate-ccw", action: () => { contentZoomStore.reset(); onClose(); } },
      { id: "git-diff", label: "Git Diff", detail: "Open the git diff panel", icon: "git", action: () => { window.dispatchEvent(new CustomEvent("markz:open-git-diff")); onClose(); } },
      { id: "settings", label: "Settings", detail: "Open the settings modal", icon: "settings", action: () => { window.dispatchEvent(new CustomEvent("markz:open-settings")); onClose(); } },
      { id: "help", label: "Help", detail: "Open the help modal", icon: "help", action: () => { window.dispatchEvent(new CustomEvent("markz:open-help")); onClose(); } },
      { id: "export-docx", label: "Export to DOCX", detail: "Export current document as Word", icon: "download", action: () => { window.dispatchEvent(new CustomEvent("markz:export-docx")); onClose(); } },
      { id: "print-pdf", label: "Print to PDF", detail: "Print preview as PDF", icon: "printer", action: () => { window.dispatchEvent(new CustomEvent("markz:print-pdf")); onClose(); } },
    ];
  }

  // Register commands once at module load
  registerCommandPalette(buildCommands());

  // Derived: recompute results whenever query or mode changes
  let results = $derived(searchPalette(query, mode));

  // Clamp selectedIndex when results change
  let safeSelectedIndex = $derived(results.length > 0 ? Math.min(selectedIndex, results.length - 1) : 0);

  function resetAndFocus() {
    query = "";
    selectedIndex = 0;
    tick().then(() => inputRef?.focus());
  }
  $effect(() => {
    if (open) {
      query = "";
      selectedIndex = 0;
      tick().then(() => inputRef?.focus());
    }
  });
  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (safeSelectedIndex + 1) % Math.max(results.length, 1);
      scrollSelectedIntoView();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (safeSelectedIndex - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1);
      scrollSelectedIntoView();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = results[safeSelectedIndex];
      if (item) {
        item.action();
      }
      return;
    }
  }

  function scrollSelectedIntoView() {
    tick().then(() => {
      const el = listRef?.querySelector(`[data-index="${safeSelectedIndex}"]`);
      if (el) {
        (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    });
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });
</script>

{#if open}
  <div class="palette-overlay" onclick={() => onClose()} role="dialog" aria-modal="true" tabindex="-1" aria-label={mode === "commands" ? "Command Palette" : "Quick Open"}>
    <div class="palette-container" onclick={(e) => e.stopPropagation()} role="document">
      <div class="palette-header">
        <span class="palette-mode-icon">
          {#if mode === "commands"}
            <Command size={16} />
          {:else}
            <File size={16} />
          {/if}
        </span>
        <input
          bind:this={inputRef}
          type="text"
          class="palette-input"
          placeholder={mode === "commands" ? "Type a command..." : "Type a file name..."}
          bind:value={query}
          onfocus={resetAndFocus}
          spellcheck={false}
          autocomplete="off"
        />
        <span class="palette-hint">
          {#if mode === "commands"}
            <kbd>↑</kbd> <kbd>↓</kbd> navigate <kbd>Enter</kbd> run <kbd>Esc</kbd> close
          {:else}
            <kbd>↑</kbd> <kbd>↓</kbd> navigate <kbd>Enter</kbd> open <kbd>Esc</kbd> close
          {/if}
        </span>
      </div>

      <div class="palette-list" bind:this={listRef}>
        {#if results.length === 0}
          <div class="palette-empty">No results found</div>
        {:else}
          {#each results as item, i (item.id)}
            <button
              class="palette-item"
              class:selected={i === safeSelectedIndex}
              data-index={i}
              onclick={() => { item.action(); }}
              onmouseenter={() => selectedIndex = i}
            >
              <span class="palette-item-icon">
                {#if item.icon && iconMap[item.icon]}
                  {@const Icon = iconMap[item.icon]}
                  <Icon size={16} strokeWidth={1.5} />
                {:else}
                  <ChevronRight size={16} strokeWidth={1.5} />
                {/if}
              </span>
              <span class="palette-item-label">{item.label}</span>
              {#if item.detail}
                <span class="palette-item-detail">{item.detail}</span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 120px;
    animation: fadeIn 0.1s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .palette-container {
    width: 560px;
    max-width: 90vw;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    animation: slideDown 0.12s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .palette-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .palette-mode-icon {
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .palette-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: var(--font-sans);
    outline: none;
    padding: 0;
  }
  .palette-input::placeholder {
    color: var(--text-tertiary);
  }
  .palette-hint {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .palette-hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 5px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    color: var(--text-secondary);
    min-width: 18px;
  }
  .palette-list {
    max-height: 360px;
    overflow-y: auto;
    padding: 4px;
  }
  .palette-empty {
    padding: 24px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.875rem;
  }
  .palette-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
    transition: background 0.08s ease;
  }
  .palette-item:hover,
  .palette-item.selected {
    background: var(--accent-dim);
    color: var(--accent);
  }
  .palette-item-icon {
    display: flex;
    align-items: center;
    color: var(--text-tertiary);
    flex-shrink: 0;
    width: 20px;
    justify-content: center;
  }
  .palette-item:hover .palette-item-icon,
  .palette-item.selected .palette-item-icon {
    color: var(--accent);
  }
  .palette-item-label {
    flex-shrink: 0;
    font-weight: 500;
  }
  .palette-item-detail {
    margin-left: auto;
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
    text-align: right;
  }
  .palette-item:hover .palette-item-detail,
  .palette-item.selected .palette-item-detail {
    color: var(--accent);
    opacity: 0.7;
  }
</style>
