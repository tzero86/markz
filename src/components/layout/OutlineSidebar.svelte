<script lang="ts">
  import { get } from "svelte/store";
  import EmptyState from "../ui/EmptyState.svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { activeDocumentStore, tabStore } from "../../lib/tabStore";
  import { openDocumentByPath } from "../../lib/keyboard";
  import { workspaceStore, type FileTreeNode } from "../../lib/workspaceStore";
  import { isMarkdownPath } from "../../lib/fileTypes";
  import { Link2, ArrowLeft, ArrowRight, FolderOpen, Search, FileText, Folder, ChevronRight, ListTree } from "@lucide/svelte";
  import { generateToc, type TocEntry } from "../../lib/toc";
  let { activity }: { activity: "files" | "outline" | "links" } = $props();
  let toc = $state<TocEntry[]>([]);
  let activeAnchor = $state<string | null>(null);
  let searchInput = $state("");
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  let backlinks = $state<Array<{ path: string; title: string }>>([]);
  let outgoingLinks = $state<string[]>([]);
  let linksLoading = $state(false);
  let linksError = $state<string | null>(null);

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
    // MarkZ is a Markdown editor — only open Markdown files to avoid rendering
    // huge/binary files as documents (which can freeze or crash the UI).
    if (!isMarkdownPath(path)) {
      console.warn("Ignoring non-Markdown file from file tree:", path);
      return;
    }
    // If the file is already open, focus its tab instead of creating a duplicate.
    const existing = get(tabStore).tabs.find((t) => t.path === path);
    if (existing) {
      tabStore.switchTab(existing.id);
      return;
    }
    await openDocumentByPath(path);
  }

  function handleToggleDir(node: FileTreeNode) {
    workspaceStore.toggleDir(node);
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
        <div class="empty">Loading links…</div>
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
            <button class="tree-open-folder" aria-label="Open folder" title="Open folder" onclick={() => workspaceStore.openWorkspace()}>
              <FolderOpen size={13} strokeWidth={2} />
            </button>
            <button class="refresh-btn" onclick={() => workspaceStore.loadWorkspace($workspaceStore.rootPath!)} title="Refresh">
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
          <ul class="file-tree">
            {#each $workspaceStore.fileTree as node (node.path)}
              {@render fileTreeNode(node, 0)}
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  {/if}
</div>

{#snippet fileTreeNode(node: FileTreeNode, depth: number)}
  {#if node.is_dir}
    <li>
      <button
        class="tree-node tree-dir"
        style="padding-left: {12 + depth * 14}px"
        onclick={() => handleToggleDir(node)}
      >
        <span class="tree-chevron" class:expanded={$workspaceStore.expandedDirs.has(node.rel_path)}>
          <ChevronRight size={12} strokeWidth={2} />
        </span>
        <Folder size={12} strokeWidth={2} />
        <span class="tree-label">{node.name}</span>
      </button>
      {#if $workspaceStore.expandedDirs.has(node.rel_path) && node.children.length > 0}
        <ul class="file-tree">
          {#each node.children as child (child.path)}
            {@render fileTreeNode(child, depth + 1)}
          {/each}
        </ul>
      {/if}
    </li>
  {:else}
    <li>
      <button
        class="tree-node tree-file"
        class:active={isActiveFile(node.path)}
        style="padding-left: {26 + depth * 14}px"
        onclick={() => handleOpenFile(node.path)}
      >
        <FileText size={12} strokeWidth={2} />
        <span class="tree-label">{node.name}</span>
      </button>
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
  .tree-open-folder,
  .refresh-btn {
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
  .tree-open-folder:hover,
  .refresh-btn:hover {
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
