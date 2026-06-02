<script lang="ts">
  import type { EditorView } from "@codemirror/view";
  import {
    wrapSelection,
    toggleLinePrefix,
    toggleHeading,
    insertText,
    insertTable,
    insertCodeBlock,
    insertMathBlock,
    insertMermaidBlock,
    insertDetailsBlock,
  } from "./editorCommands";
  import {
    Heading1,
    Heading2,
    Heading3,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Braces,
    Quote,
    Minus,
    FunctionSquare,
    List,
    ListOrdered,
    CheckSquare,
    Link,
    Table,
    GitBranch,
    PanelBottom,
  } from "@lucide/svelte";

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

  const tools = [
    {
      group: "headings",
      items: [
        { icon: Heading1, title: "Heading 1", action: () => doAction((v) => toggleHeading(v, 1)) },
        { icon: Heading2, title: "Heading 2", action: () => doAction((v) => toggleHeading(v, 2)) },
        { icon: Heading3, title: "Heading 3", action: () => doAction((v) => toggleHeading(v, 3)) },
      ],
    },
    {
      group: "style",
      items: [
        { icon: Bold, title: "Bold (Ctrl+B)", action: () => doAction((v) => wrapSelection(v, "**", "**")) },
        { icon: Italic, title: "Italic (Ctrl+I)", action: () => doAction((v) => wrapSelection(v, "*", "*")) },
        { icon: Strikethrough, title: "Strikethrough", action: () => doAction((v) => wrapSelection(v, "~~", "~~")) },
        { icon: Code, title: "Inline Code", action: () => doAction((v) => wrapSelection(v, "`", "`", "code")) },
      ],
    },
    {
      group: "blocks",
      items: [
        { icon: Braces, title: "Code Block", action: () => doAction((v) => insertCodeBlock(v, "")) },
        { icon: Quote, title: "Blockquote", action: () => doAction((v) => toggleLinePrefix(v, "> ")) },
        { icon: Minus, title: "Horizontal Rule", action: () => doAction((v) => insertText(v, "\n---\n")) },
        { icon: FunctionSquare, title: "Math Block", action: () => doAction((v) => insertMathBlock(v)) },
      ],
    },
    {
      group: "lists",
      items: [
        { icon: List, title: "Bullet List", action: () => doAction((v) => toggleLinePrefix(v, "- ")) },
        { icon: ListOrdered, title: "Numbered List", action: () => doAction((v) => toggleLinePrefix(v, "1. ")) },
        { icon: CheckSquare, title: "Task List", action: () => doAction((v) => toggleLinePrefix(v, "- [ ] ")) },
      ],
    },
    {
      group: "insert",
      items: [
        { icon: Link, title: "Link", action: () => doAction((v) => wrapSelection(v, "[", "](url)", "text")) },
        { icon: Table, title: "Table", action: () => { showTableDialog = true; } },
        { icon: GitBranch, title: "Mermaid Diagram", action: () => doAction((v) => insertMermaidBlock(v)) },
        { icon: PanelBottom, title: "Expandable Section", action: () => doAction((v) => insertDetailsBlock(v)) },
      ],
    },
  ];
</script>

<div class="toolbar">
  {#each tools as group}
    <div class="tool-group">
      {#each group.items as item}
        {@const Icon = item.icon}
        <button
          class="tool-btn"
          onclick={item.action}
          title={item.title}
          type="button"
        >
          <Icon size={13} strokeWidth={1.5} />
        </button>
      {/each}
    </div>
  {/each}
</div>

{#if showTableDialog}
  <div class="table-dialog-backdrop" onclick={() => showTableDialog = false} onkeydown={(e) => e.key === "Escape" && (showTableDialog = false)} role="presentation" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="table-dialog" role="dialog" aria-label="Insert table" tabindex="0" onclick={(e) => e.stopPropagation()}>
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
    padding: var(--space-1) var(--space-3);
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
    gap: var(--space-1);
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
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease, transform 100ms ease;
  }
  .tool-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .tool-btn:active {
    transform: scale(0.96);
  }

  .table-dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    animation: fadeIn 150ms ease;
  }
  .table-dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    min-width: 280px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    animation: scaleIn 150ms ease;
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
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    color: var(--text-primary);
    font-size: var(--text-base);
    outline: none;
    transition: border-color 150ms ease;
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
    border-radius: var(--radius-sm);
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
    border-radius: var(--radius-sm);
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
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
