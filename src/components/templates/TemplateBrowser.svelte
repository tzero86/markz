<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { documentStore } from "../../lib/documentStore";

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

  $effect(() => {
    if (open) {
      loadTemplates();
    }
  });

  async function loadTemplates() {
    loading = true;
    try {
      templates = await invoke<Template[]>("list_templates");
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      loading = false;
    }
  }

  async function applyTemplate(id: string, name: string) {
    try {
      const content = await invoke<string>("apply_template", { id });
      documentStore.newFromTemplate(content, name);
      open = false;
    } catch (e) {
      console.error("Failed to apply template:", e);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await invoke("delete_template", { id });
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
    <div class="modal-panel" role="dialog" aria-label="Templates">
      <div class="modal-header">
        <h2>New from Template</h2>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
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
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
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
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .search-input {
    width: 100%;
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
  }
  .search-input::placeholder {
    color: var(--text-muted);
  }
  .category-tabs {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .category-tab {
    padding: var(--space-1) var(--space-3);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all 150ms ease;
  }
  .category-tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .category-tab.active {
    background: var(--accent-default);
    border-color: var(--accent-default);
    color: white;
  }
  .modal-body {
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
    flex: 1;
  }
  .template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  .template-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .template-card:hover {
    border-color: var(--accent-default);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .template-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .template-card-header h3 {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
  .delete-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 150ms ease, color 150ms ease;
  }
  .template-card:hover .delete-btn {
    opacity: 1;
  }
  .delete-btn:hover {
    color: var(--text-danger, #ef4444);
  }
  .template-desc {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
    flex: 1;
  }
  .template-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .template-category {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
  .template-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-hover);
    color: var(--text-muted);
  }
  .template-badge.user {
    background: var(--accent-subtle);
    color: var(--accent-default);
  }
  .use-template-btn {
    margin-top: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: var(--accent-default);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .use-template-btn:hover {
    background: var(--accent-hover);
  }
  .loading,
  .empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: center;
    padding: var(--space-8) 0;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
