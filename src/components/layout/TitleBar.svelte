<script lang="ts">
  import { get } from "svelte/store";
  import { documentStore } from "../../lib/documentStore";
  import { themeStore, type Theme } from "../../lib/themeStore";
  import { openDocument, saveDocument, openDocumentByPath, newDocument } from "../../lib/keyboard";
  import { getRecentFiles, clearRecentFiles, type RecentFile } from "../../lib/recentFiles";
  import { updateReady, confirmAndRestart } from "../../lib/updater";
  import { invoke } from "@tauri-apps/api/core";
  import { FilePlus, FolderOpen, Save, History, File, Copy, ChevronDown, LayoutGrid, BookmarkPlus, CircleHelp, Settings, Sun, Moon, ArrowUpRight } from "@lucide/svelte";
  import { Trash2 } from "@lucide/svelte";
  import { FORMAT_ICONS } from "../../lib/formatIcons";
  import Toast from "../ui/Toast.svelte";

  interface Props {
    onOpenSettings: () => void;
    onOpenTemplateBrowser: () => void;
    onOpenSaveTemplate: () => void;
    onOpenHelp: () => void;
  }

  let { onOpenSettings, onOpenTemplateBrowser, onOpenSaveTemplate, onOpenHelp }: Props = $props();

  function themeLabel(t: Theme): string {
    return t === "system" ? "System" : t === "light" ? "Light" : "Dark";
  }

  let resolved = $derived(
    $themeStore === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : $themeStore
  );

  let dropdownOpen = $state(false);
  let recentOpen = $state(false);
  let recentFiles = $state<RecentFile[]>([]);
  let activeIndex = $state(-1);
  let toastMessage = $state("");
  let toastVisible = $state(false);
  let toastType = $state<"success" | "error" | "info" | "default">("default");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let dropdownRef: HTMLDivElement | undefined = $state();
  let triggerRef: HTMLButtonElement | undefined = $state();

  const copyOptions = [
    { label: "Copy as JIRA", command: "convert_to_jira" as const, mode: "copy" as const, icon: "jira" as const },
    { label: "Copy as Confluence", command: "convert_to_confluence" as const, mode: "copy" as const, icon: "confluence" as const },
    { label: "Copy as Slack", command: "convert_to_slack" as const, mode: "copy" as const, icon: "slack" as const },
    { label: "Copy as GitHub", command: "convert_to_github" as const, mode: "copy" as const, icon: "github" as const },
    { label: "Copy as HTML", command: "render_preview" as const, mode: "copy" as const, icon: "html" as const },
    { label: "Export as DOCX", command: "export_to_docx" as const, mode: "export" as const, icon: "docx" as const },
  ];

  function showToast(message: string, type: "success" | "error" | "info" | "default" = "default") {
    toastMessage = message;
    toastType = type;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 3000);
  }

  function toggleRecentDropdown() {
    recentOpen = !recentOpen;
    if (recentOpen) {
      recentFiles = getRecentFiles();
    }
  }

  async function openRecent(file: RecentFile) {
    recentOpen = false;
    await openDocumentByPath(file.path);
  }

  function clearRecent() {
    clearRecentFiles();
    recentFiles = [];
  }

  async function handleCopy(command: string, label: string, mode: "copy" | "export") {
    try {
      const doc = get(documentStore);
      if (mode === "export") {
        const defaultName = doc.title ? doc.title.replace(/[^a-zA-Z0-9_-]/g, "_") : "document";
        const outputPath = await invoke<string | null>("save_file_dialog", {
          defaultName: `${defaultName}.docx`,
          filterName: "Word Document",
          filterExtensions: ["docx"],
        });
        if (!outputPath) {
          dropdownOpen = false;
          activeIndex = -1;
          return;
        }
        await invoke(command, {
          markdown: doc.content,
          docPath: doc.path,
          outputPath,
        });
        showToast(`Exported ${label}`, "success");
      } else {
        const result = await invoke<string>(command, {
          markdown: doc.content,
          docPath: doc.path,
        });
        await navigator.clipboard.writeText(result);
        showToast(label, "success");
      }
    } catch (e) {
      console.error("Copy/export failed:", e);
      showToast(`Failed to ${label.toLowerCase()}`, "error");
    }
    dropdownOpen = false;
    activeIndex = -1;
    triggerRef?.focus();
  }

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
    activeIndex = dropdownOpen ? 0 : -1;
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (!dropdownOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleDropdown();
      return;
    }

    if (!dropdownOpen) return;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        dropdownOpen = false;
        activeIndex = -1;
        triggerRef?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        activeIndex = (activeIndex + 1) % copyOptions.length;
        break;
      case "ArrowUp":
        event.preventDefault();
        activeIndex = (activeIndex - 1 + copyOptions.length) % copyOptions.length;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0) {
          const opt = copyOptions[activeIndex];
          handleCopy(opt.command, opt.label, opt.mode);
        }
        break;
      case "Tab":
        dropdownOpen = false;
        activeIndex = -1;
        break;
    }
  }

  let recentDropdownRef: HTMLDivElement | undefined = $state();

  function handleClickOutside(event: MouseEvent) {
    if (
      dropdownOpen &&
      dropdownRef &&
      !dropdownRef.contains(event.target as Node)
    ) {
      dropdownOpen = false;
      activeIndex = -1;
    }
    if (
      recentOpen &&
      recentDropdownRef &&
      !recentDropdownRef.contains(event.target as Node)
    ) {
      recentOpen = false;
    }
  }

  $effect(() => {
    if (dropdownOpen || recentOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  });
</script>

<div class="titlebar" data-tauri-drag-region>
  <div class="titlebar-left">
    <div class="brand">
      <img src="../../assets/logo.png" alt="" class="brand-icon" width="18" height="18" />
      <span class="app-name">MarkZ</span>
    </div>
    {#if $updateReady}
      <button
        class="update-badge"
        onclick={confirmAndRestart}
        aria-label="Restart to update"
        data-tooltip="Update ready — click to restart"
      >
        <ArrowUpRight size={12} strokeWidth={2.5} />
      </button>
    {/if}
    <div class="doc-info">
      <span class="doc-title">{$documentStore.title}</span>
      {#if $documentStore.isDirty}
        <span class="dirty-dot" aria-label="Unsaved changes"></span>
      {/if}
    </div>
  </div>

  <div class="titlebar-right">
    <!-- File Operations -->
    <div class="btn-group">
      <button class="tool-btn" onclick={newDocument} aria-label="New file" data-tooltip="New (Ctrl+T)">
        <FilePlus size={15} strokeWidth={2} />
      </button>
      <button class="tool-btn" onclick={openDocument} aria-label="Open file" data-tooltip="Open (Ctrl+O)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <button class="tool-btn" onclick={saveDocument} aria-label="Save file" data-tooltip="Save (Ctrl+S)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </button>
    </div>

    <div class="divider"></div>

    <!-- Recent Files -->
    <div class="dropdown" bind:this={recentDropdownRef}>
      <button
        class="tool-btn"
        onclick={toggleRecentDropdown}
        aria-haspopup="menu"
        aria-expanded={recentOpen}
        aria-label="Recent files"
        data-tooltip="Recent files"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 17 10 11 4 5"/>
          <line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
      </button>
      {#if recentOpen}
        <div class="dropdown-panel recent-panel" role="menu">
          <div class="dropdown-header">Recent Files</div>
          {#if recentFiles.length === 0}
            <div class="dropdown-empty">
              <File size={24} strokeWidth={1.5} style="opacity: 0.4;" />
              <span>No recent files</span>
            </div>
          {:else}
            {#each recentFiles as file}
              <button
                class="dropdown-item"
                role="menuitem"
                onclick={() => openRecent(file)}
                title={`${file.name}\n${file.path}`}
              >
                <span class="dropdown-filename">{file.name}</span>
                <span class="dropdown-path">{file.path}</span>
              </button>
            {/each}
            <div class="dropdown-divider"></div>
            <button class="dropdown-item dropdown-item-danger" role="menuitem" onclick={clearRecent}>
              <Trash2 size={13} strokeWidth={2} />
              Clear history
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <div class="divider"></div>

    <!-- Export & Copy -->
    <div class="dropdown" bind:this={dropdownRef}>
      <button
        class="tool-btn tool-btn-accent"
        bind:this={triggerRef}
        onclick={toggleDropdown}
        onkeydown={handleTriggerKeydown}
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-label="Copy as"
        data-tooltip="Copy / Export as"
      >
        <Copy size={15} strokeWidth={2} />
        <span class="btn-label">Export</span>
        <ChevronDown size={10} strokeWidth={2.5} style="margin-left:-2px;" />
      </button>
      {#if dropdownOpen}
        <div class="dropdown-panel" role="menu">
          <div class="dropdown-header">Copy or Export</div>
          {#each copyOptions as option, i (option.command)}
            <button
              class="dropdown-item"
              class:active={i === activeIndex}
              role="menuitem"
              onclick={() => handleCopy(option.command, option.label, option.mode)}
              onmouseenter={() => (activeIndex = i)}
              tabindex="-1"
            >
              <span class="dropdown-icon">{@html FORMAT_ICONS[option.icon]}</span>
              <span class="dropdown-label">{option.label}</span>
              <span class="dropdown-hint">{option.mode === "export" ? "Save" : "Copy"}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="divider"></div>

    <!-- Templates -->
    <div class="btn-group">
      <button class="tool-btn" onclick={onOpenTemplateBrowser} aria-label="New from Template" data-tooltip="New from Template">
        <LayoutGrid size={15} strokeWidth={2} />
      </button>
      <button class="tool-btn" onclick={onOpenSaveTemplate} aria-label="Save as Template" data-tooltip="Save as Template">
        <BookmarkPlus size={15} strokeWidth={2} />
      </button>
    </div>

    <div class="divider"></div>

    <!-- Settings & Help -->
    <div class="btn-group">
      <button class="tool-btn" onclick={onOpenHelp} aria-label="Help" data-tooltip="Help (?)">
        <CircleHelp size={15} strokeWidth={2} />
      </button>
      <button class="tool-btn" onclick={onOpenSettings} aria-label="Settings" data-tooltip="Settings">
        <Settings size={15} strokeWidth={2} />
      </button>
      <button class="tool-btn" onclick={() => themeStore.cycle()} aria-label="Toggle theme" data-tooltip="Theme: {themeLabel($themeStore)} (click to cycle)">
        {#if resolved === "dark"}
          <Sun size={15} strokeWidth={2} />
        {:else}
          <Moon size={15} strokeWidth={2} />
        {/if}
      </button>
    </div>
  </div>
</div>

<Toast message={toastMessage} visible={toastVisible} type={toastType} />

<style>
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 var(--space-3);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    -webkit-app-region: drag;
    app-region: drag;
    user-select: none;
    flex-shrink: 0;
    transition: background-color 300ms var(--ease-in-out),
                border-color 300ms var(--ease-in-out);
    gap: var(--space-2);
  }

  /* Left side */
  .titlebar-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px 2px 4px;
    border-radius: var(--radius-md);
    transition: background 150ms ease;
  }
  .brand:hover {
    background: var(--bg-hover);
  }
  .brand-icon {
    border-radius: 4px;
    flex-shrink: 0;
  }
  .app-name {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-accent);
    letter-spacing: -0.01em;
  }
  .doc-info {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .doc-title {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
    transition: color 150ms ease;
  }
  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-default);
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--accent-subtle);
  }

  /* Update badge */
  .update-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: var(--accent-default);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    animation: pulse 2s ease infinite;
    -webkit-app-region: no-drag;
    app-region: no-drag;
    transition: background 150ms ease, transform 150ms var(--ease-out);
  }
  .update-badge:hover {
    background: var(--accent-hover);
    transform: scale(1.1);
  }
  .update-badge:active {
    transform: scale(0.95);
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(13, 138, 93, 0.4); }
    50% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(13, 138, 93, 0); }
  }

  /* Right side */
  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 2px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  /* Button group */
  .btn-group {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 2px;
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }

  /* Divider */
  .divider {
    width: 1px;
    height: 18px;
    background: var(--border-default);
    margin: 0 3px;
    opacity: 0.5;
  }

  /* Tool button */
  .tool-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 30px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 150ms var(--ease-out);
    position: relative;
  }
  .tool-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    transform: translateY(-0.5px);
  }
  .tool-btn:active {
    transform: scale(0.94) translateY(0);
    background: var(--bg-active);
  }
  .tool-btn-accent {
    background: var(--accent-subtle);
    color: var(--accent-default);
    width: auto;
    padding: 0 8px;
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .tool-btn-accent:hover {
    background: var(--accent-muted);
    color: var(--text-primary);
  }
  .btn-label {
    font-size: 11px;
  }

  /* Dropdown */
  .dropdown {
    position: relative;
  }
  .dropdown-header {
    padding: var(--space-2) var(--space-3);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--space-1);
  }
  .dropdown-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-4);
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }
  .dropdown-panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    min-width: 200px;
    padding: var(--space-1) 0;
    z-index: 100;
    animation: dropdownIn 180ms var(--ease-out);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 36px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background 100ms ease, color 100ms ease;
    position: relative;
  }
  .dropdown-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: color 100ms ease;
  }
  .dropdown-label {
    flex: 1;
  }
  .dropdown-hint {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    padding: 1px 6px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
  }
  .dropdown-item:hover .dropdown-icon,
  .dropdown-item.active .dropdown-icon {
    color: var(--text-primary);
  }
  .dropdown-item:hover .dropdown-hint {
    background: var(--bg-hover);
    color: var(--text-tertiary);
  }
  .dropdown-item:hover,
  .dropdown-item.active {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .dropdown-item.disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
  }
  .dropdown-item-danger {
    color: var(--error);
    margin-top: var(--space-1);
    border-top: 1px solid var(--border-subtle);
  }
  .dropdown-item-danger:hover {
    background: var(--error-bg);
  }
  .recent-panel {
    min-width: 260px;
    max-width: 360px;
  }
  .dropdown-filename {
    font-weight: 500;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .dropdown-path {
    font-size: 11px;
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .dropdown-item:has(.dropdown-filename) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    height: auto;
    padding: var(--space-2) var(--space-3);
    gap: 2px;
  }
  .dropdown-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-1) var(--space-3);
  }

  /* Custom tooltips */
  [data-tooltip] {
    position: relative;
  }
  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) scale(0.95);
    padding: 5px 10px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    border-radius: var(--radius-md);
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

  @keyframes dropdownIn {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 600px) {
    .btn-label {
      display: none;
    }
    .tool-btn-accent {
      width: 30px;
      padding: 0;
    }
  }
</style>