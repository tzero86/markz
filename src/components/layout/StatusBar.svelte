<script lang="ts">
  import { documentStore } from "../../lib/documentStore";
  import { cursorPosition } from "../../lib/editorStore";

  let wordCount = $derived(
    $documentStore.content.trim() === ""
      ? 0
      : $documentStore.content.trim().split(/\s+/).filter((w) => w.length > 0).length
  );
  let charCount = $derived($documentStore.content.length);
</script>

<div class="statusbar">
  <div class="status-left">
    {#if $documentStore.isDirty}
      <span class="status-item unsaved">Unsaved changes</span>
    {:else}
      <span class="status-item saved">Saved</span>
    {/if}
    <span class="status-item">Ln {$cursorPosition.line}, Col {$cursorPosition.column}</span>
  </div>
  <div class="status-right">
    <span class="status-item">{wordCount} words</span>
    <span class="status-item">{charCount} chars</span>
    <span class="status-item">Markdown</span>
    <span class="status-item">UTF-8</span>
  </div>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    padding: 0 var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                border-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .status-item {
    display: inline-flex;
    align-items: center;
  }
  .unsaved {
    color: var(--accent-default);
  }
  .saved {
    color: var(--success);
  }
</style>
