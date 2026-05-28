<script lang="ts">
  import { findTable, tableToMarkdown, addRow, removeRow, addColumn, removeColumn, type TableData } from "../../lib/tableEditor";

  interface Props {
    open: boolean;
    markdown: string;
    tableIndex: number;
    onApply: (newMarkdown: string) => void;
    onClose: () => void;
  }

  let { open, markdown, tableIndex, onApply, onClose }: Props = $props();

  let table = $state<TableData | null>(null);
  let tableRange = $state<{ start: number; end: number } | null>(null);
  let error = $state("");

  $effect(() => {
    if (open) {
      const result = findTable(markdown, tableIndex);
      if (result) {
        table = result.table;
        tableRange = { start: result.start, end: result.end };
        error = "";
      } else {
        table = null;
        error = `Table ${tableIndex + 1} not found.`;
      }
    }
  });

  function handleApply() {
    if (!table || !tableRange) return;
    const newTableMd = tableToMarkdown(table);
    const before = markdown.slice(0, tableRange.start);
    const after = markdown.slice(tableRange.end);
    // Preserve surrounding whitespace
    const prefix = before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = after.startsWith("\n") ? "" : "\n";
    onApply(before + prefix + newTableMd + suffix + after);
    onClose();
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    if (!table) return;
    if (rowIdx === -1) {
      const header = [...table.header];
      header[colIdx] = value;
      table = { ...table, header };
    } else {
      const rows = table.rows.map((r, i) =>
        i === rowIdx ? r.map((c, j) => (j === colIdx ? value : c)) : r
      );
      table = { ...table, rows };
    }
  }

  function updateAlignment(colIdx: number, align: "left" | "center" | "right" | null) {
    if (!table) return;
    const alignments = [...table.alignments];
    alignments[colIdx] = align;
    table = { ...table, alignments };
  }

  function handleAddRow(afterIdx: number) {
    if (!table) return;
    table = addRow(table, afterIdx);
  }

  function handleRemoveRow(idx: number) {
    if (!table || table.rows.length <= 1) return;
    table = removeRow(table, idx);
  }

  function handleAddColumn(afterIdx: number) {
    if (!table) return;
    table = addColumn(table, afterIdx);
  }

  function handleRemoveColumn(idx: number) {
    if (!table || table.header.length <= 1) return;
    table = removeColumn(table, idx);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onClose} onkeydown={handleKeydown}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Edit Table</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close">×</button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {:else if table}
        <div class="table-editor">
          <table>
            <thead>
              <tr>
                <th class="corner"></th>
                {#each table.header as _, colIdx}
                  <th class="col-control">
                    <button class="icon-btn" onclick={() => handleAddColumn(colIdx)} title="Add column after">+col</button>
                    <button class="icon-btn danger" onclick={() => handleRemoveColumn(colIdx)} title="Remove column" disabled={table.header.length <= 1}>×</button>
                  </th>
                {/each}
              </tr>
              <tr>
                <th class="corner"></th>
                {#each table.header as h, colIdx}
                  <th>
                    <input type="text" value={h} oninput={(e) => updateCell(-1, colIdx, e.currentTarget.value)} />
                  </th>
                {/each}
              </tr>
              <tr class="align-row">
                <th class="corner"></th>
                {#each table.alignments as a, colIdx}
                  <th>
                    <select value={a ?? ""} onchange={(e) => updateAlignment(colIdx, e.currentTarget.value === "" ? null : e.currentTarget.value as any)}>
                      <option value="">Default</option>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each table.rows as row, rowIdx}
                <tr>
                  <td class="row-control">
                    <button class="icon-btn" onclick={() => handleAddRow(rowIdx)} title="Add row after">+row</button>
                    <button class="icon-btn danger" onclick={() => handleRemoveRow(rowIdx)} title="Remove row" disabled={table.rows.length <= 1}>×</button>
                  </td>
                  {#each row as cell, colIdx}
                    <td>
                      <input type="text" value={cell} oninput={(e) => updateCell(rowIdx, colIdx, e.currentTarget.value)} />
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <div class="modal-actions">
        <button class="btn secondary" onclick={onClose}>Cancel</button>
        <button class="btn primary" onclick={handleApply} disabled={!table}>Apply</button>
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
    z-index: 1000;
  }
  .modal {
    background: var(--bg-primary, #fff);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    padding: 20px;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary, #666);
  }
  .table-editor {
    overflow: auto;
    margin-bottom: 16px;
  }
  .table-editor table {
    border-collapse: collapse;
    width: 100%;
  }
  .table-editor th,
  .table-editor td {
    border: 1px solid var(--border-default, #d1d5db);
    padding: 4px;
  }
  .table-editor th {
    background: var(--bg-secondary, #f3f4f6);
  }
  .corner {
    width: 60px;
    min-width: 60px;
  }
  .col-control,
  .row-control {
    white-space: nowrap;
    text-align: center;
  }
  .align-row th {
    padding: 2px;
  }
  .align-row select {
    width: 100%;
    font-size: 0.75rem;
  }
  .table-editor input[type="text"] {
    width: 100%;
    border: none;
    background: transparent;
    font: inherit;
    padding: 4px;
    outline: none;
  }
  .table-editor input[type="text"]:focus {
    background: var(--accent-default, #3b82f6);
    color: white;
    border-radius: 2px;
  }
  .icon-btn {
    font-size: 0.7rem;
    padding: 2px 6px;
    margin: 1px;
    border: 1px solid var(--border-default, #d1d5db);
    background: var(--bg-secondary, #f3f4f6);
    border-radius: 3px;
    cursor: pointer;
  }
  .icon-btn:hover {
    background: var(--bg-tertiary, #e5e7eb);
  }
  .icon-btn.danger:hover {
    background: #fee2e2;
    border-color: #ef4444;
    color: #ef4444;
  }
  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border-default, #d1d5db);
    cursor: pointer;
    font-size: 0.9rem;
  }
  .btn.primary {
    background: var(--accent-default, #3b82f6);
    color: white;
    border-color: var(--accent-default, #3b82f6);
  }
  .btn.secondary {
    background: var(--bg-secondary, #f3f4f6);
    color: var(--text-primary, #111);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .error {
    color: #ef4444;
    margin: 8px 0;
  }
</style>
