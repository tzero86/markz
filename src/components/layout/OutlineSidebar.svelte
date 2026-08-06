<script lang="ts">
  import { get } from "svelte/store";
  import EmptyState from "../ui/EmptyState.svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { confirm } from "@tauri-apps/plugin-dialog";
  import { activeDocumentStore, tabStore } from "../../lib/tabStore";
  import { openDocumentByPath } from "../../lib/keyboard";
  import { workspaceStore, type FileTreeNode } from "../../lib/workspaceStore";
  import { isMarkdownPath } from "../../lib/fileTypes";
  import { Link2, ArrowLeft, ArrowRight, FolderOpen, Search, FileText, Folder, ChevronRight, ListTree, FilePlus, FolderPlus } from "@lucide/svelte";
  import { generateToc, type TocEntry } from "../../lib/toc";
  import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu.svelte";
  import NamePromptDialog from "../ui/NamePromptDialog.svelte";
  import Skeleton from "../ui/Skeleton.svelte";
  let { activity }: { activity: "files" | "outline" | "links" } = $props();
  let toc = $state<TocEntry[]>([]);
  let activeAnchor = $state<string | null>(null);
  let searchInput = $state("");
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  let backlinks = $state<Array<{ path: string; title: string }>>([]);
  let outgoingLinks = $state<string[]>([]);
  let linksLoading = $state(false);
  let linksError = $state<string | null>(null);

  // Context menu + rename state
  let contextMenu = $state<{ open: boolean; x: number; y: number; items: ContextMenuItem[] }>({
    open: false,
    x: 0,
    y: 0,
    items: [],
  });
  let renamingNode = $state<FileTreeNode | null>(null);
  let renameValue = $state("");
  let promptDialog = $state<{
    open: boolean;
    title: string;
    label: string;
    confirmLabel: string;
    parentPath: string;
    isFolder: boolean;
  } | null>(null);

  $effect(() => {
    const content = $activeDocumentStore.content;
    toc = generateToc(content);
  });

  $effect(() => {
    const path = $activeDocumentStore.path;
    if (!path) {
      backlinks = [];
      outgoingLinks = [];
      linksError = null;
      return;
    }
    linksLoading = true;
    linksError = null;

    Promise.all([
      invoke<Array<{ path: string; title: string }>>("get_backlinks", { docPath: path }).catch((e) => {
        console.error("get_backlinks failed:", e);
        return [] as Array<{ path: string; title: string }>;
      }),
      invoke<string[]>("get_wikilinks", { docPath: path }).catch((e) => {
        console.error("get_wikilinks failed:", e);
        return [] as string[];
      }),
    ])
      .then(([bl, out]) => {
        backlinks = bl;
        outgoingLinks = out;
      })
      .catch((e) => {
        linksError = String(e);
      })
      .finally(() => {
        linksLoading = false;
      });
  });

  function scrollToHeading(entry: TocEntry) {
    window.dispatchEvent(
      new CustomEvent("markz:scroll-to-heading", {
        detail: { anchor: entry.anchor, line: entry.line },
      })
    );
    activeAnchor = entry.anchor;
  }

  async function handleOpenLink(path: string) {
    await openDocumentByPath(path);
  }

  async function handleResolveOutgoing(target: string) {
    const docPath = $activeDocumentStore.path;
    if (!docPath) return;
    const dir = docPath.substring(0, docPath.lastIndexOf("/")) || ".";
    try {
      const resolved = await invoke<string | null>("resolve_wikilink", {
        target,
        docDir: dir,
      });
      if (resolved) {
        await openDocumentByPath(resolved);
      } else {
        console.warn("Unresolved wikilink:", target);
      }
    } catch (e) {
      console.error("resolve_wikilink failed:", e);
    }
  }
  async function handleOpenFile(path: string) {
    await openDocumentByPath(path);
  }

  function handleToggleDir(node: FileTreeNode) {
    workspaceStore.toggleDir(node);
  }

  // ── Keyboard navigation (WAI-ARIA tree pattern) ─────────────────────────
  // Roving tabindex: exactly one node is tabbable (treeFocusPath, or the
  // first visible node when nothing has been focused yet). Arrow keys move
  // focus, Enter/Space activate, letters type-ahead.
  let treeFocusPath = $state<string | null>(null);
  let typeAheadBuffer = "";
  let typeAheadTimer: ReturnType<typeof setTimeout> | null = null;

  let visibleNodes = $derived.by<{ node: FileTreeNode; depth: number }[]>(() => {
    const out: { node: FileTreeNode; depth: number }[] = [];
    const walk = (nodes: FileTreeNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ node: n, depth });
        if (n.is_dir && $workspaceStore.expandedDirs.has(n.rel_path) && (n.children?.length ?? 0) > 0) {
          walk(n.children, depth + 1);
        }
      }
    };
    walk($workspaceStore.fileTree, 0);
    return out;
  });
  let firstVisiblePath = $derived(visibleNodes[0]?.node.path ?? null);

  // If the focused node disappears (refresh, rename, delete), drop the focus
  // anchor so the tree falls back to the first-node tab stop.
  $effect(() => {
    if (treeFocusPath && !visibleNodes.some((n) => n.node.path === treeFocusPath)) {
      treeFocusPath = null;
    }
  });

  function focusTreeNode(path: string) {
    treeFocusPath = path;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tree-path="${CSS.escape(path)}"]`) as HTMLElement | null;
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function parentPathOf(relPath: string): string | null {
    const idx = relPath.lastIndexOf("/");
    return idx === -1 ? null : relPath.slice(0, idx);
  }

  function typeAhead(key: string, startIdx: number) {
    if (typeAheadTimer) clearTimeout(typeAheadTimer);
    typeAheadBuffer = (typeAheadBuffer + key).toLowerCase();
    typeAheadTimer = setTimeout(() => { typeAheadBuffer = ""; }, 800);

    const n = visibleNodes.length;
    for (let i = 1; i <= n; i++) {
      const candidate = visibleNodes[(startIdx + i) % n].node;
      if (candidate.name.toLowerCase().startsWith(typeAheadBuffer)) {
        focusTreeNode(candidate.path);
        return;
      }
    }
  }

  async function onTreeNodeKeydown(e: KeyboardEvent, node: FileTreeNode) {
    if (visibleNodes.length === 0) return;
    const currentIdx = visibleNodes.findIndex((n) => n.node.path === node.path);
    const idx = currentIdx === -1 ? 0 : currentIdx;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusTreeNode(visibleNodes[Math.min(idx + 1, visibleNodes.length - 1)].node.path);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusTreeNode(visibleNodes[Math.max(idx - 1, 0)].node.path);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (node.is_dir) {
          if (!$workspaceStore.expandedDirs.has(node.rel_path)) {
            // toggleDir is async (loads children first), so await it before
            // moving focus into the freshly expanded subtree.
            await workspaceStore.toggleDir(node);
            const firstChild = visibleNodes.find((n) => n.node.rel_path.startsWith(node.rel_path + "/"));
            if (firstChild) focusTreeNode(firstChild.node.path);
          } else if ((node.children?.length ?? 0) > 0) {
            focusTreeNode(node.children[0].path);
          }
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (node.is_dir && $workspaceStore.expandedDirs.has(node.rel_path)) {
          workspaceStore.toggleDir(node);
        } else {
          const parentRel = parentPathOf(node.rel_path);
          if (parentRel) {
            const parent = visibleNodes.find((n) => n.node.rel_path === parentRel);
            if (parent) focusTreeNode(parent.node.path);
          }
        }
        break;
      case "Home":
        e.preventDefault();
        focusTreeNode(visibleNodes[0].node.path);
        break;
      case "End":
        e.preventDefault();
        focusTreeNode(visibleNodes[visibleNodes.length - 1].node.path);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (node.is_dir) workspaceStore.toggleDir(node);
        else handleOpenFile(node.path);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          typeAhead(e.key, idx);
        }
    }
  }

  function handleSearchInput(value: string) {
    searchInput = value;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      workspaceStore.search(value);
    }, 300);
  }

  function isActiveFile(path: string): boolean {
    return $activeDocumentStore.path === path;
  }
  interface Crumb { name: string; path: string; }

  // Breadcrumb segments of the workspace root, so the user can navigate up
  // the directory tree by clicking an ancestor crumb.
  let crumbs = $derived.by<Crumb[]>(() => {
    const root = $workspaceStore.rootPath;
    if (!root) return [];
    const normalized = root.replace(/\\/g, "/");
    const leading = normalized.startsWith("/") ? "/" : "";
    const parts = normalized.split("/").filter(Boolean);
    const out: Crumb[] = [];
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : `${leading}${parts[i]}`;
      out.push({ name: parts[i], path: acc });
    }
    return out;
  });

  // The drive/root-most segment (e.g. "C:") renders as plain text — re-rooting
  // to a bare drive label is rarely meaningful.
  function isRootSegment(name: string, index: number): boolean {
    return index === 0 && /^[A-Za-z]:$/.test(name);
  }

  function handleCrumbClick(path: string) {
    workspaceStore.loadWorkspace(path);
  }

  function parentPathForNode(node: FileTreeNode): string {
    if (node.is_dir) return node.path;
    const lastSep = Math.max(node.path.lastIndexOf("/"), node.path.lastIndexOf("\\"));
    return lastSep === -1 ? node.path : node.path.substring(0, lastSep);
  }

  function buildContextMenuItems(node: FileTreeNode): ContextMenuItem[] {
    const parentPath = parentPathForNode(node);
    const items: ContextMenuItem[] = [];
    if (node.is_dir) {
      items.push(
        { id: "new-file", label: "New File", action: () => openNewFilePrompt(parentPath) },
        { id: "new-folder", label: "New Folder", action: () => openNewFolderPrompt(parentPath) }
      );
    } else {
      items.push({ id: "new-file", label: "New File", action: () => openNewFilePrompt(parentPath) });
    }
    items.push(
      { id: "rename", label: "Rename", action: () => startRename(node) },
      { id: "delete", label: "Delete", danger: true, action: () => handleDelete(node) }
    );
    return items;
  }

  function handleContextMenu(event: MouseEvent, node: FileTreeNode) {
    event.preventDefault();
    contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      items: buildContextMenuItems(node),
    };
  }

  function closeContextMenu() {
    contextMenu = { ...contextMenu, open: false };
  }

  function openNewFilePrompt(parentPath: string) {
    promptDialog = {
      open: true,
      title: "New File",
      label: "File name",
      confirmLabel: "Create",
      parentPath,
      isFolder: false,
    };
  }

  function openNewFolderPrompt(parentPath: string) {
    promptDialog = {
      open: true,
      title: "New Folder",
      label: "Folder name",
      confirmLabel: "Create",
      parentPath,
      isFolder: true,
    };
  }

  async function handlePromptConfirm(name: string) {
    if (!promptDialog) return;
    const { parentPath, isFolder } = promptDialog;
    if (isFolder) {
      await workspaceStore.createFolder(parentPath, name);
    } else {
      const path = await workspaceStore.createFile(parentPath, name);
      if (path && isMarkdownPath(path)) {
        await openDocumentByPath(path);
      }
    }
    promptDialog = null;
  }

  function startRename(node: FileTreeNode) {
    renamingNode = node;
    renameValue = node.name;
  }

  async function commitRename() {
    if (!renamingNode) return;
    const newName = renameValue.trim();
    if (!newName || newName === renamingNode.name) {
      renamingNode = null;
      return;
    }
    const oldPath = renamingNode.path;
    const newPath = await workspaceStore.renameEntry(oldPath, newName);
    if (newPath) {
      tabStore.renameTabPath(oldPath, newPath);
    }
    renamingNode = null;
  }

  function cancelRename() {
    renamingNode = null;
  }

  async function handleDelete(node: FileTreeNode) {
    const confirmed = await confirm(`Delete "${node.name}"?`);
    if (!confirmed) return;
    const ok = await workspaceStore.deleteEntry(node.path);
    if (ok) {
      tabStore.closeTabByPath(node.path);
    }
  }
</script>
<div class="sidebar">
  {#if activity === "outline"}
    <div class="toc-scroller">
      {#if toc.length === 0}
        <EmptyState
          icon={ListTree}
          iconSize={32}
          title="No headings"
          subtitle="Add Markdown headings to build a document outline."
        />
      {:else}
        <ul class="toc-list">
          {#each toc as entry (entry.anchor)}
            <li class="toc-item" style="padding-left: {(entry.level - 1) * 12}px">
              <button
                class="toc-link"
                class:active={activeAnchor === entry.anchor}
                onclick={() => scrollToHeading(entry)}
              >
                {entry.text}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else if activity === "links"}
    <div class="toc-scroller">
      {#if linksLoading}
        <Skeleton lines={4} width="80%" />
      {:else if linksError}
        <div class="empty error">{linksError}</div>
      {:else if !$activeDocumentStore.path}
        <EmptyState
          icon={Link2}
          iconSize={32}
          title="Save to see links"
          subtitle="WikiLinks and backlinks are discovered after you save the document."
        />
      {:else}
        {#if outgoingLinks.length > 0}
          <div class="link-section">
            <div class="link-section-header">
              <ArrowRight size={12} />
              Outgoing ({outgoingLinks.length})
            </div>
            <ul class="link-list">
              {#each outgoingLinks as target (target)}
                <li>
                  <button class="link-btn" onclick={() => handleResolveOutgoing(target)}>
                    <Link2 size={12} />
                    <span class="link-text">{target}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if backlinks.length > 0}
          <div class="link-section">
            <div class="link-section-header">
              <ArrowLeft size={12} />
              Backlinks ({backlinks.length})
            </div>
            <ul class="link-list">
              {#each backlinks as doc (doc.path)}
                <li>
                  <button class="link-btn" onclick={() => handleOpenLink(doc.path)}>
                    <Link2 size={12} />
                    <span class="link-text">{doc.title}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {:else if outgoingLinks.length === 0}
          <EmptyState
            icon={Link2}
            iconSize={32}
            title="No links found"
            subtitle="Use [[Target]] syntax to create WikiLinks between documents."
          />
        {/if}
      {/if}
    </div>
  {:else}
    <div class="toc-scroller file-tree-scroller">
      {#if !$workspaceStore.rootPath}
        <EmptyState
          icon={FolderOpen}
          iconSize={32}
          title="No folder open"
          subtitle="Open a folder to browse files and search across your workspace."
          actionLabel="Open folder"
          action={() => workspaceStore.openWorkspace()}
        />
      {:else}
        <div class="file-tree-header">
          <div class="file-tree-breadcrumbs" title={$workspaceStore.rootPath}>
            {#each crumbs as crumb, i (crumb.path)}
              {#if i > 0}<span class="tree-crumb-sep" aria-hidden="true">/</span>{/if}
              {#if i === crumbs.length - 1}
                <span class="tree-crumb active" data-path={crumb.path}>{crumb.name}</span>
              {:else if isRootSegment(crumb.name, i)}
                <span class="tree-crumb root-segment" data-path={crumb.path}>{crumb.name}</span>
              {:else}
                <button class="tree-crumb" data-path={crumb.path} onclick={() => handleCrumbClick(crumb.path)}>{crumb.name}</button>
              {/if}
            {/each}
          </div>
          <div class="file-tree-actions">
            <button
              class="tree-action-btn"
              aria-label="New file"
              title="New file"
              onclick={() => openNewFilePrompt($workspaceStore.rootPath!)}
            >
              <FilePlus size={13} strokeWidth={2} />
            </button>
            <button
              class="tree-action-btn"
              aria-label="New folder"
              title="New folder"
              onclick={() => openNewFolderPrompt($workspaceStore.rootPath!)}
            >
              <FolderPlus size={13} strokeWidth={2} />
            </button>
            <button class="tree-action-btn" aria-label="Open folder" title="Open folder" onclick={() => workspaceStore.openWorkspace()}>
              <FolderOpen size={13} strokeWidth={2} />
            </button>
            <button class="tree-action-btn" onclick={() => workspaceStore.refresh()} title="Refresh">
              <span style="font-size: 11px;">↻</span>
            </button>
          </div>
        </div>
        <div class="search-box">
          <Search size={12} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search files…"
            value={searchInput}
            oninput={(e) => handleSearchInput(e.currentTarget.value)}
          />
        </div>
        {#if $workspaceStore.searchLoading}
          <div class="empty">Searching…</div>
        {:else if $workspaceStore.searchResults.length > 0}
          <ul class="link-list search-results">
            {#each $workspaceStore.searchResults as result (result.path + ":" + result.line_number)}
              <li>
                <button class="link-btn search-result-btn" onclick={() => handleOpenFile(result.path)}>
                  <FileText size={12} />
                  <div class="search-result-text">
                    <div class="search-result-path">{result.rel_path}:{result.line_number}</div>
                    <div class="search-result-context">{result.context}</div>
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        {:else if searchInput.trim()}
          <EmptyState
            icon={Search}
            iconSize={32}
            title="No matches"
            subtitle="Try a different search term."
          />
        {:else if $workspaceStore.fileTree.length === 0}
          <EmptyState
            icon={FileText}
            iconSize={32}
            title="Empty folder"
            subtitle="This folder doesn't contain any visible files."
          />
        {:else}
          <ul class="file-tree" role="tree">
            {#each $workspaceStore.fileTree as node (node.path)}
              {@render fileTreeNode(node, 0)}
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<ContextMenu
  bind:open={contextMenu.open}
  x={contextMenu.x}
  y={contextMenu.y}
  items={contextMenu.items}
  onClose={closeContextMenu}
/>

{#if promptDialog}
  <NamePromptDialog
    open={promptDialog.open}
    title={promptDialog.title}
    label={promptDialog.label}
    confirmLabel={promptDialog.confirmLabel}
    onConfirm={handlePromptConfirm}
    onClose={() => (promptDialog = null)}
  />
{/if}

{#snippet fileTreeNode(node: FileTreeNode, depth: number)}
  {#if node.is_dir}
    <li>
      {#if renamingNode?.path === node.path}
        <form
          class="tree-node tree-rename"
          style="padding-left: {12 + depth * 14}px"
          onsubmit={(e) => { e.preventDefault(); commitRename(); }}
        >
          <Folder size={12} strokeWidth={2} />
          <input
            type="text"
            bind:value={renameValue}
            onblur={commitRename}
            onkeydown={(e) => { if (e.key === "Escape") cancelRename(); }}
          />
        </form>
      {:else}
        <button
          class="tree-node tree-dir"
          style="padding-left: {12 + depth * 14}px"
          role="treeitem"
          aria-expanded={$workspaceStore.expandedDirs.has(node.rel_path)}
          tabindex={treeFocusPath === node.path || (treeFocusPath === null && node.path === firstVisiblePath) ? 0 : -1}
          data-tree-path={node.path}
          onclick={() => handleToggleDir(node)}
          onkeydown={(e) => onTreeNodeKeydown(e, node)}
          oncontextmenu={(e) => handleContextMenu(e, node)}
        >
          <span class="tree-chevron" class:expanded={$workspaceStore.expandedDirs.has(node.rel_path)}>
            <ChevronRight size={12} strokeWidth={2} />
          </span>
          <Folder size={12} strokeWidth={2} />
          <span class="tree-label">{node.name}</span>
        </button>
      {/if}
      {#if $workspaceStore.expandedDirs.has(node.rel_path) && (node.children?.length ?? 0) > 0}
        <ul class="file-tree" role="group">
          {#each node.children as child (child.path)}
            {@render fileTreeNode(child, depth + 1)}
          {/each}
        </ul>
      {/if}
    </li>
  {:else}
    <li>
      {#if renamingNode?.path === node.path}
        <form
          class="tree-node tree-rename"
          style="padding-left: {26 + depth * 14}px"
          onsubmit={(e) => { e.preventDefault(); commitRename(); }}
        >
          <FileText size={12} strokeWidth={2} />
          <input
            type="text"
            bind:value={renameValue}
            onblur={commitRename}
            onkeydown={(e) => { if (e.key === "Escape") cancelRename(); }}
          />
        </form>
      {:else}
        <button
          class="tree-node tree-file"
          class:active={isActiveFile(node.path)}
          style="padding-left: {26 + depth * 14}px"
          role="treeitem"
          tabindex={treeFocusPath === node.path || (treeFocusPath === null && node.path === firstVisiblePath) ? 0 : -1}
          data-tree-path={node.path}
          onclick={() => handleOpenFile(node.path)}
          onkeydown={(e) => onTreeNodeKeydown(e, node)}
          oncontextmenu={(e) => handleContextMenu(e, node)}
        >
          <FileText size={12} strokeWidth={2} />
          <span class="tree-label">{node.name}</span>
        </button>
      {/if}
    </li>
  {/if}
{/snippet}
<style>
  .sidebar {
    flex-direction: column;
    width: 100%;
    min-width: 100%;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    overflow: hidden;
    flex-shrink: 0;
  }

  .toc-scroller {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-2) 0;
  }
  .empty {
    padding: var(--space-4);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    text-align: center;
  }
  .empty.error {
    color: var(--text-error);
  }
  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc-item {
    padding: 0 var(--space-3);
  }
  .toc-link {
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 150ms ease, color 150ms ease;
  }
  .toc-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toc-link.active {
    color: var(--accent-default);
  }

  .link-section {
    padding: var(--space-2) 0;
  }
  .link-section + .link-section {
    border-top: 1px solid var(--border-default);
  }
  .link-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: var(--space-2) var(--space-4);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-tertiary);
    user-select: none;
  }
  .link-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .link-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: var(--space-1) var(--space-4);
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .link-btn:hover {
    background: var(--bg-hover);
    color: var(--accent-default);
  }
  .link-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* File tree styles */
  .file-tree-scroller {
    padding: 0;
  }
  .file-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }
  .file-tree-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
  }
  .file-tree-breadcrumbs::-webkit-scrollbar {
    display: none;
  }
  .tree-crumb {
    flex: none;
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    background: none;
    border: none;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 150ms ease, color 150ms ease;
  }
  button.tree-crumb:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tree-crumb.active {
    font-weight: 600;
    color: var(--text-primary);
    cursor: default;
  }
  .tree-crumb.root-segment {
    cursor: default;
  }
  .tree-crumb-sep {
    flex: none;
    color: var(--text-tertiary);
    opacity: 0.6;
  }
  .file-tree-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .tree-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 3px;
    border-radius: var(--radius-sm);
    transition: background 150ms ease, color 150ms ease;
  }
  .tree-action-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }
  .search-box input {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    outline: none;
  }
  .search-box input:focus {
    border-color: var(--accent-default);
  }
  .file-tree {
    list-style: none;
    margin: 0;
    padding: var(--space-1) 0;
  }
  .tree-node {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: var(--space-1) var(--space-3);
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .tree-node:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tree-node.active {
    background: var(--accent-muted);
    color: var(--accent-default);
  }
  .tree-rename {
    background: var(--bg-hover);
  }
  .tree-rename input {
    flex: 1;
    min-width: 0;
    background: var(--bg-surface);
    border: 1px solid var(--accent-default);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    outline: none;
  }
  .tree-chevron {
    display: inline-flex;
    transition: transform 150ms ease;
    color: var(--text-tertiary);
  }
  .tree-chevron.expanded {
    transform: rotate(90deg);
  }
  .tree-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .search-results {
    padding: var(--space-1) 0;
  }
  .search-result-btn {
    align-items: flex-start;
    padding: var(--space-1) var(--space-3);
  }
  .search-result-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .search-result-path {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .search-result-context {
    font-size: 11px;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
