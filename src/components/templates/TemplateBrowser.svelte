<script lang="ts">
  import { trapFocus } from "../../lib/focusTrap";
  import { invoke } from "@tauri-apps/api/core";
  import { X, Trash2 } from "@lucide/svelte";
  import { tabStore } from "../../lib/tabStore";

  interface Template {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
    builtin: boolean;
  }

  let { open = $bindable(false) } = $props();

  let templates: Template[] = $state([]);
  let loading = $state(true);
  let search = $state("");
  let selectedCategory = $state("All");
  /** Simple cache to avoid re-fetching templates when modal is reopened */
  let templateCache: Template[] | null = null;

  $effect(() => {
    if (open) {
      loadTemplates();
    }
  });

  async function loadTemplates() {
    loading = true;
    try {
      if (templateCache) {
        templates = templateCache;
      } else {
        templates = await invoke<Template[]>("list_templates");
        templateCache = templates;
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      loading = false;
    }
  }

  async function applyTemplate(id: string, name: string) {
    try {
      const content = await invoke<string>("apply_template", { id });
      tabStore.newTab(content, name, null);
      open = false;
    } catch (e) {
      console.error("Failed to apply template:", e);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await invoke("delete_template", { id });
      templateCache = null; // Invalidate cache to force re-fetch
      await loadTemplates();
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  }

  const categories = $derived(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ["All", ...Array.from(cats).sort()];
  });

  const filteredTemplates = $derived(() => {
    return templates.filter((t) => {
      const matchesCategory =
        selectedCategory === "All" || t.category === selectedCategory;
      const matchesSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      open = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      open = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Templates" use:trapFocus>
      <div class="modal-header">
        <h2>New from Template</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-toolbar">
        <input
          type="text"
          class="search-input"
          placeholder="Search templates..."
          bind:value={search}
        />
        <div class="category-tabs">
          {#each categories() as cat}
            <button
              class="category-tab"
              class:active={selectedCategory === cat}
              onclick={() => (selectedCategory = cat)}
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="loading">Loading templates…</div>
        {:else if filteredTemplates().length === 0}
          <div class="empty">No templates match your search.</div>
        {:else}
          <div class="template-grid">
            {#each filteredTemplates() as template (template.id)}
              <div class="template-card">
                <div class="template-card-header">
                  <h3>{template.name}</h3>
                  {#if !template.builtin}
                    <button
                      class="delete-btn"
                      onclick={() => deleteTemplate(template.id)}
                      aria-label="Delete template"
                      title="Delete"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  {/if}
                </div>
                <p class="template-desc">{template.description}</p>
                <div class="template-meta">
                  <span class="template-category">{template.category}</span>
                  {#if template.builtin}
                    <span class="template-badge">Built-in</span>
                  {:else}
                    <span class="template-badge user">Custom</span>
                  {/if}
                </div>
                <button
                  class="use-template-btn"
                  onclick={() => applyTemplate(template.id, template.name)}
                >
                  Use Template
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 150ms ease-out;
  }
  .modal-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
    width: 720px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 200ms ease-out;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }
  .modal-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .modal-toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }
  .search-input {
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    transition: border-color 150ms ease;
  }
  .search-input:focus {
    border-color: var(--accent-default);
    box-shadow: 0 0 0 3px var(--accent-subtle);
  }
  .category-tabs {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .category-tab {
    padding: 2px 10px;
    border-radius: var(--radius-full);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms ease;
  }
  .category-tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .category-tab.active {
    background: var(--accent-default);
    color: var(--text-inverse);
    border-color: var(--accent-default);
  }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
  }
  .loading,
  .empty {
    text-align: center;
    padding: var(--space-8);
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }
  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-4);
  }
  .template-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .template-card:hover {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-sm);
  }
  .template-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .template-card-header h3 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
  }
  .delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 150ms ease, color 150ms ease, background 150ms ease;
  }
  .template-card:hover .delete-btn {
    opacity: 0.6;
  }
  .delete-btn:hover {
    opacity: 1 !important;
    color: var(--error);
    background: var(--error-bg);
  }
  .template-desc {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0 0 var(--space-3) 0;
    flex: 1;
  }
  .template-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .template-category {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .template-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    font-weight: 500;
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
  .template-badge.user {
    background: var(--accent-subtle);
    color: var(--accent-default);
  }
  .use-template-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent-default);
    background: transparent;
    color: var(--accent-default);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .use-template-btn:hover {
    background: var(--accent-default);
    color: var(--text-inverse);
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
