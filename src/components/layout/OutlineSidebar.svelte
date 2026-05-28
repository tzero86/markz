<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { activeDocumentStore } from "../../lib/tabStore";
  import { openDocumentByPath } from "../../lib/keyboard";
  import { ChevronLeft, Link2, ArrowLeft, ArrowRight } from "@lucide/svelte";
  import { generateToc, type TocEntry } from "../../lib/toc";

  let { visible }: { visible: boolean } = $props();

  let activeTab = $state<"outline" | "backlinks">("outline");
  let toc = $state<TocEntry[]>([]);
  let activeAnchor = $state<string | null>(null);

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

  function scrollToAnchor(anchor: string) {
    const el = document.querySelector(`#${anchor}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      activeAnchor = anchor;
    }
  }

  function toggle() {
    window.dispatchEvent(new CustomEvent("markz:toggle-sidebar"));
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
</script>

<div class="sidebar" class:collapsed={!visible}>
  <button
    class="toggle-btn"
    onclick={toggle}
    aria-label={visible ? "Collapse outline" : "Expand outline"}
    title={visible ? "Collapse outline" : "Expand outline"}
  >
    <span class="toggle-icon" class:rotated={!visible}>
      <ChevronLeft size={16} strokeWidth={1.5} />
    </span>
  </button>

  {#if visible}
    <div class="sidebar-tabs">
      <button
        class="sidebar-tab"
        class:active={activeTab === "outline"}
        onclick={() => (activeTab = "outline")}
        aria-pressed={activeTab === "outline"}
      >
        Outline
      </button>
      <button
        class="sidebar-tab"
        class:active={activeTab === "backlinks"}
        onclick={() => (activeTab = "backlinks")}
        aria-pressed={activeTab === "backlinks"}
      >
        Links
        {#if backlinks.length > 0}
          <span class="tab-badge">{backlinks.length}</span>
        {/if}
      </button>
    </div>

    {#if activeTab === "outline"}
      <div class="toc-scroller">
        {#if toc.length === 0}
          <div class="empty">No headings</div>
        {:else}
          <ul class="toc-list">
            {#each toc as entry (entry.anchor)}
              <li class="toc-item" style="padding-left: {(entry.level - 1) * 12}px">
                <button
                  class="toc-link"
                  class:active={activeAnchor === entry.anchor}
                  onclick={() => scrollToAnchor(entry.anchor)}
                >
                  {entry.text}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else}
      <div class="toc-scroller">
        {#if linksLoading}
          <div class="empty">Loading links…</div>
        {:else if linksError}
          <div class="empty error">{linksError}</div>
        {:else if !$activeDocumentStore.path}
          <div class="empty">Save the document to see links.</div>
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
            <div class="empty">No links found.</div>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    overflow: hidden;
    transition: width 200ms ease, min-width 200ms ease, border-color 200ms ease;
    flex-shrink: 0;
  }
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
    border-right-color: transparent;
    background: transparent;
    overflow: visible;
  }
  .toggle-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, right 200ms ease, left 200ms ease;
    z-index: 2;
  }
  .sidebar.collapsed .toggle-btn {
    right: auto;
    left: 6px;
  }
  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toggle-icon {
    display: inline-flex;
    transition: transform 200ms ease;
  }
  .toggle-icon.rotated {
    transform: rotate(180deg);
  }

  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
  }
  .sidebar-tab {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
  }
  .sidebar-tab:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }
  .sidebar-tab.active {
    color: var(--accent-default);
    border-bottom-color: var(--accent-default);
  }
  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: var(--accent-muted);
    color: var(--accent-default);
    font-size: 10px;
    font-weight: 600;
    border-radius: 999px;
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
</style>
