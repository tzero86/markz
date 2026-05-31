<script lang="ts">
  import { X, GitBranch } from "@lucide/svelte";
  import { invoke } from "@tauri-apps/api/core";

  let { open = $bindable(false), docPath = "" } = $props();

  let diffText = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let fileName = $state("");

  interface DiffLine {
    type: "header" | "hunk" | "add" | "del" | "context" | "meta";
    oldNum: number | null;
    newNum: number | null;
    text: string;
  }

  let parsedLines = $state<DiffLine[]>([]);

  $effect(() => {
    if (open && docPath) {
      loadDiff();
    } else if (!open) {
      diffText = "";
      parsedLines = [];
      error = null;
    }
  });

  function parseDiff(text: string): DiffLine[] {
    const lines: DiffLine[] = [];
    if (!text.trim()) return lines;
    const raw = text.split("\n");
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;

    for (const line of raw) {
      if (line.startsWith("diff --git")) {
        lines.push({ type: "meta", oldNum: null, newNum: null, text: line });
        inHunk = false;
      } else if (line.startsWith("index ") || line.startsWith("mode ")) {
        lines.push({ type: "meta", oldNum: null, newNum: null, text: line });
      } else if (line.startsWith("--- ") || line.startsWith("+++ ")) {
        lines.push({ type: "header", oldNum: null, newNum: null, text: line });
        inHunk = false;
      } else if (line.startsWith("@@")) {
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (m) {
          oldLine = parseInt(m[1], 10);
          newLine = parseInt(m[2], 10);
        }
        lines.push({ type: "hunk", oldNum: null, newNum: null, text: line });
        inHunk = true;
      } else if (inHunk) {
        if (line.startsWith("+")) {
          lines.push({ type: "add", oldNum: null, newNum: newLine, text: line.slice(1) });
          newLine++;
        } else if (line.startsWith("-")) {
          lines.push({ type: "del", oldNum: oldLine, newNum: null, text: line.slice(1) });
          oldLine++;
        } else if (line.startsWith(" ")) {
          lines.push({ type: "context", oldNum: oldLine, newNum: newLine, text: line.slice(1) });
          oldLine++;
          newLine++;
        } else if (line === "\\ No newline at end of file") {
          lines.push({ type: "meta", oldNum: null, newNum: null, text: line });
        } else {
          lines.push({ type: "context", oldNum: oldLine, newNum: newLine, text: line });
          oldLine++;
          newLine++;
        }
      } else {
        lines.push({ type: "meta", oldNum: null, newNum: null, text: line });
      }
    }
    return lines;
  }

  async function loadDiff() {
    loading = true;
    error = null;
    diffText = "";
    parsedLines = [];
    fileName = docPath.split(/[\\/]/).pop() || docPath;
    try {
      const result = await invoke<string>("git_diff", { docPath });
      diffText = result;
      parsedLines = parseDiff(result);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

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

  function lineClass(type: DiffLine["type"]): string {
    switch (type) {
      case "add": return "line-add";
      case "del": return "line-del";
      case "hunk": return "line-hunk";
      case "header": return "line-header";
      case "meta": return "line-meta";
      default: return "line-context";
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-panel" role="dialog" aria-label="Git diff">
      <div class="modal-header">
        <div class="header-left">
          <GitBranch size={14} strokeWidth={2} />
          <span class="file-name">{fileName}</span>
          <span class="header-label">Git Diff</span>
        </div>
        <button class="close-btn" onclick={() => (open = false)} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="loading">Loading diff…</div>
        {:else if error}
          <div class="error">{error}</div>
        {:else if parsedLines.length === 0}
          <div class="empty">No changes — file is clean.</div>
        {:else}
          <div class="diff-table">
            {#each parsedLines as line}
              <div class="diff-row {lineClass(line.type)}">
                <span class="line-num old">{line.oldNum ?? ""}</span>
                <span class="line-num new">{line.newNum ?? ""}</span>
                <span class="line-marker">
                  {#if line.type === "add"}+
                  {:else if line.type === "del"}-
                  {:else if line.type === "context"}
                    {" "}
                  {:else}{" "}
                  {/if}
                </span>
                <span class="line-text">{line.text}</span>
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
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .modal-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    width: 90vw;
    max-width: 960px;
    height: 80vh;
    max-height: 720px;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-primary);
  }

  .file-name {
    font-weight: 600;
    font-size: var(--text-sm);
  }

  .header-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .modal-body {
    flex: 1;
    overflow: auto;
    padding: 0;
  }

  .loading,
  .error,
  .empty {
    padding: var(--space-8);
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--text-base);
  }
  .error {
    color: var(--status-error);
  }

  .diff-table {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
    white-space: pre;
  }

  .diff-row {
    display: flex;
    align-items: baseline;
  }

  .line-num {
    display: inline-block;
    width: 44px;
    text-align: right;
    padding: 0 8px;
    color: var(--text-tertiary);
    user-select: none;
    flex-shrink: 0;
  }

  .line-marker {
    display: inline-block;
    width: 16px;
    text-align: center;
    user-select: none;
    flex-shrink: 0;
  }

  .line-text {
    flex: 1;
    padding-right: var(--space-4);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .line-add {
    background: rgba(35, 197, 94, 0.10);
  }
  .line-add .line-marker {
    color: var(--syntax-inserted);
    font-weight: 600;
  }
  .line-add .line-text {
    color: #1a7a3a;
  }
  .line-del {
    background: rgba(239, 68, 68, 0.10);
  }
  .line-del .line-marker {
    color: var(--syntax-deleted);
    font-weight: 600;
  }
  .line-del .line-text {
    color: #c21d2a;
  }
  .line-hunk {
    background: var(--bg-elevated);
    color: var(--syntax-meta);
  }
  .line-hunk .line-num {
    color: var(--syntax-meta);
  }
  .line-header {
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-weight: 500;
  }
  .line-meta {
    color: var(--text-tertiary);
  }
  .line-context {
    background: transparent;
  }
  /* Dark-theme overrides */
  :global([data-theme="dark"]) .line-add {
    background: rgba(35, 197, 94, 0.15);
  }
  :global([data-theme="dark"]) .line-add .line-text {
    color: #4ade80;
  }
  :global([data-theme="dark"]) .line-del {
    background: rgba(239, 68, 68, 0.15);
  }
  :global([data-theme="dark"]) .line-del .line-text {
    color: #f87171;
  }
</style>