<script lang="ts">
  import type { EditorView } from "@codemirror/view";
  import {
    wrapSelection,
    toggleLinePrefix,
    toggleHeading,
    insertText,
    insertTable,
    insertCodeBlock,
  } from "./editorCommands";

  interface Props {
    view: EditorView | null;
  }

  let { view }: Props = $props();

  let showTableDialog = $state(false);
  let tableRows = $state(3);
  let tableCols = $state(3);

  function doAction(fn: (v: EditorView) => void) {
    if (view) fn(view);
  }

  // SVG icon helpers
  function iconSvg(path: string, viewBox = "0 0 24 24", size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  const tools = [
    {
      group: "headings",
      items: [
        { label: "H1", title: "Heading 1", icon: iconSvg('<path d="M4 12h8M4 18V6M12 18V6m4 6h6m-3-3v6"/>'), action: () => doAction((v) => toggleHeading(v, 1)) },
        { label: "H2", title: "Heading 2", icon: iconSvg('<path d="M4 12h8M4 18V6M12 18V6m6 4h4m-2-2v4"/>'), action: () => doAction((v) => toggleHeading(v, 2)) },
        { label: "H3", title: "Heading 3", icon: iconSvg('<path d="M4 12h8M4 18V6M12 18V6m4 6h2a2 2 0 0 0 0-4h-2v4z"/>'), action: () => doAction((v) => toggleHeading(v, 3)) },
      ],
    },
    {
      group: "style",
      items: [
        { label: "B", title: "Bold (Ctrl+B)", icon: iconSvg('<path d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z"/>'), action: () => doAction((v) => wrapSelection(v, "**", "**")) },
        { label: "I", title: "Italic (Ctrl+I)", icon: iconSvg('<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>'), action: () => doAction((v) => wrapSelection(v, "*", "*")) },
        { label: "S", title: "Strikethrough", icon: iconSvg('<path d="M17.3 19c-1.4 1.1-3.2 1.7-5.3 1.7-4.2 0-7.5-2.7-7.5-6.2 0-.6.1-1.2.3-1.7"/><path d="M19.2 10c.1-.5.2-1 .2-1.5 0-3.5-3.3-6.2-7.5-6.2-2.1 0-3.9.6-5.3 1.7"/><line x1="4" y1="12" x2="20" y2="12"/>'), action: () => doAction((v) => wrapSelection(v, "~~", "~~")) },
        { label: "` `", title: "Inline Code", icon: iconSvg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'), action: () => doAction((v) => wrapSelection(v, "`", "`", "code")) },
      ],
    },
    {
      group: "blocks",
      items: [
        { label: "{}", title: "Code Block", icon: iconSvg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'), action: () => doAction((v) => insertCodeBlock(v, "")) },
        { label: "\"", title: "Blockquote", icon: iconSvg('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/><path d="M21 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/>'), action: () => doAction((v) => toggleLinePrefix(v, "> ")) },
        { label: "—", title: "Horizontal Rule", icon: iconSvg('<line x1="5" y1="12" x2="19" y2="12"/>'), action: () => doAction((v) => insertText(v, "\n---\n")) },
      ],
    },
    {
      group: "lists",
      items: [
        { label: "•", title: "Bullet List", icon: iconSvg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'), action: () => doAction((v) => toggleLinePrefix(v, "- ")) },
        { label: "1.", title: "Numbered List", icon: iconSvg('<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M4 16v4M4 18h2"/>'), action: () => doAction((v) => toggleLinePrefix(v, "1. ")) },
        { label: "☐", title: "Task List", icon: iconSvg('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><rect x="3" y="3" width="4" height="4" rx="1"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/>'), action: () => doAction((v) => toggleLinePrefix(v, "- [ ] ")) },
      ],
    },
    {
      group: "insert",
      items: [
        { label: "[]", title: "Link", icon: iconSvg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'), action: () => doAction((v) => wrapSelection(v, "[", "](url)", "text")) },
        { label: "⊞", title: "Table", icon: iconSvg('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>'), action: () => { showTableDialog = true; } },
      ],
    },
  ];
</script>

<div class="toolbar">
  {#each tools as group}
    <div class="tool-group">
      {#each group.items as item}
        <button
          class="tool-btn"
          onclick={item.action}
          title={item.title}
          type="button"
          aria-label={item.title}
        >
          {#if item.icon}
            <span class="tool-icon">{@html item.icon}</span>
          {:else}
            <span class="tool-label">{item.label}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/each}
</div>

{#if showTableDialog}
  <div class="table-dialog-backdrop" onclick={() => showTableDialog = false} onkeydown={(e) => e.key === "Escape" && (showTableDialog = false)} role="presentation" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="table-dialog" role="dialog" aria-label="Insert table" tabindex="0">
      <h4>Insert Table</h4>
      <div class="table-fields">
        <label>
          Rows
          <input type="number" min="1" max="20" bind:value={tableRows} />
        </label>
        <label>
          Columns
          <input type="number" min="1" max="10" bind:value={tableCols} />
        </label>
      </div>
      <div class="table-actions">
        <button class="btn-secondary" onclick={() => showTableDialog = false}>Cancel</button>
        <button
          class="btn-primary"
          onclick={() => {
            doAction((v) => insertTable(v, tableRows, tableCols));
            showTableDialog = false;
          }}
        >
          Insert
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    overflow-x: auto;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tool-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: var(--space-2);
    border-right: 1px solid var(--border-default);
  }
  .tool-group:last-child {
    border-right: none;
    padding-right: 0;
  }
  .tool-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, transform 100ms ease;
  }
  .tool-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tool-btn:active {
    transform: scale(0.94);
  }
  .tool-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
  }
  .tool-icon :global(svg) {
    stroke-width: 2.2;
  }
  .tool-label {
    font-size: var(--text-sm);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .table-dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    animation: fadeIn 150ms ease;
  }
  .table-dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    min-width: 280px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    animation: scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .table-dialog h4 {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }
  .table-fields {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  .table-fields label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    flex: 1;
  }
  .table-fields input {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    color: var(--text-primary);
    font-size: var(--text-base);
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .table-fields input:focus {
    border-color: var(--accent-default);
    box-shadow: 0 0 0 3px var(--accent-subtle);
  }
  .table-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
  .btn-primary {
    padding: var(--space-2) var(--space-4);
    background: var(--accent-default);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .btn-primary:hover {
    background: var(--accent-hover);
  }
  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
  }
  .btn-secondary:hover {
    background: var(--bg-hover);
    border-color: var(--border-focus);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.96) translateY(4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
</style>
