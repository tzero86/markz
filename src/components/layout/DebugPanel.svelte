<script lang="ts">
  import { Bug, Trash2, ChevronUp, ChevronDown, AlertCircle, Info, Search } from "@lucide/svelte";
  import { debugLogStore, type LogEntry, type LogLevel } from "../../lib/debugLogStore";

  let panelRef: HTMLDivElement | undefined = $state();
  let isResizing = $state(false);

  const levelIcons: Record<LogLevel, typeof Info> = {
    trace: Search,
    debug: Search,
    info: Info,
    warn: AlertCircle,
    error: AlertCircle,
  };
  const levelColors: Record<LogLevel, string> = {
    trace: "var(--text-tertiary)",
    debug: "var(--text-tertiary)",
    info: "var(--info)",
    warn: "var(--warning)",
    error: "var(--error)",
  };

  const levelBg: Record<LogLevel, string> = {
    trace: "transparent",
    debug: "transparent",
    info: "var(--info-bg)",
    warn: "var(--warning-bg)",
    error: "var(--error-bg)",
  };

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function onResizeStart(e: MouseEvent) {
    e.preventDefault();
    isResizing = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing || !panelRef) return;
    const rect = panelRef.getBoundingClientRect();
    const newHeight = rect.bottom - e.clientY;
    debugLogStore.setHeight(newHeight);
  }

  function onResizeEnd() {
    isResizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
  }

  let filteredEntries = $derived(
    $debugLogStore.entries.filter((e) => levelRank(e.level) >= levelRank($debugLogStore.filter))
  );

  function levelRank(l: LogLevel): number {
    const ranks: Record<LogLevel, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };
    return ranks[l];
  }

  const filters: { label: string; value: LogLevel }[] = [
    { label: "Trace", value: "trace" },
    { label: "Debug", value: "debug" },
    { label: "Info", value: "info" },
    { label: "Warn", value: "warn" },
    { label: "Error", value: "error" },
  ];
</script>

{#if !$debugLogStore.collapsed}
  <div
    class="debug-panel"
    bind:this={panelRef}
    style="height: {$debugLogStore.height}px;"
    role="log"
    aria-label="Application debug log"
    aria-live="polite"
  >
    <!-- Resize handle -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resize-handle"
      role="separator"
      aria-label="Resize debug panel"
      onmousedown={onResizeStart}
    >
      <div class="resize-grip"></div>
    </div>

    <!-- Header -->
    <div class="debug-header">
      <div class="debug-header-left">
        <Bug size={14} />
        <span class="debug-title">Debug Log</span>
        <span class="entry-count">{filteredEntries.length}</span>
      </div>
      <div class="debug-header-right">
        <div class="filter-tabs">
          {#each filters as f}
            <button
              class="filter-tab"
              class:active={$debugLogStore.filter === f.value}
              onclick={() => debugLogStore.setFilter(f.value)}
              aria-pressed={$debugLogStore.filter === f.value}
            >
              {f.label}
            </button>
          {/each}
        </div>
        <button
          class="icon-btn"
          onclick={() => debugLogStore.clear()}
          title="Clear log"
          aria-label="Clear log"
        >
          <Trash2 size={13} />
        </button>
        <button
          class="icon-btn"
          onclick={() => debugLogStore.toggleCollapsed()}
          title="Collapse panel"
          aria-label="Collapse debug panel"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>

    <!-- Log list -->
    <div class="debug-body">
      {#if filteredEntries.length === 0}
        <div class="empty-state">
          <Search size={16} />
          <span>No log entries</span>
        </div>
      {:else}
        <div class="log-list">
          {#each filteredEntries as entry (entry.id)}
            {@const Icon = levelIcons[entry.level]}
            <div
              class="log-row"
              style="background: {levelBg[entry.level]};"
              role="listitem"
            >
              <span class="log-time">{formatTime(entry.timestamp)}</span>
              <span class="log-level" style="color: {levelColors[entry.level]};">
                <Icon size={12} />
              </span>
              <span class="log-source">{entry.source}</span>
              <span class="log-message">{entry.message}</span>
              {#if entry.details}
                <span class="log-details">{entry.details}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Collapsed bar -->
  <button
    class="debug-collapsed"
    onclick={() => debugLogStore.toggleCollapsed()}
    aria-label="Expand debug panel"
    title="Expand debug panel"
  >
    <div class="collapsed-left">
      <Bug size={12} />
      <span>Debug</span>
    </div>
    {#if $debugLogStore.unreadErrors > 0}
      <span class="error-badge">{$debugLogStore.unreadErrors}</span>
    {/if}
    <ChevronUp size={12} />
  </button>
{/if}

<style>
  .debug-panel {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    min-height: 80px;
    overflow: hidden;
  }

  .resize-handle {
    height: 6px;
    flex-shrink: 0;
    cursor: row-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    transition: background 150ms ease;
  }
  .resize-handle:hover {
    background: var(--accent-default);
  }
  .resize-grip {
    width: 32px;
    height: 3px;
    border-radius: 2px;
    background: var(--border-default);
  }
  .resize-handle:hover .resize-grip {
    background: var(--text-inverse);
  }

  .debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-3);
    flex-shrink: 0;
    border-bottom: 1px solid var(--border-subtle);
    user-select: none;
  }
  .debug-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .debug-title {
    color: var(--text-primary);
  }
  .entry-count {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    background: var(--bg-subtle);
    padding: 1px 6px;
    border-radius: var(--radius-full);
  }
  .debug-header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .filter-tabs {
    display: flex;
    align-items: center;
    gap: 1px;
    background: var(--bg-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .filter-tab {
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-family: var(--font-sans);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
    line-height: 1.4;
  }
  .filter-tab:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
  }
  .filter-tab.active {
    color: var(--text-primary);
    background: var(--bg-surface);
    box-shadow: var(--shadow-xs);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }
  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .debug-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.5;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: 100%;
    color: var(--text-tertiary);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }

  .log-list {
    display: flex;
    flex-direction: column;
  }
  .log-row {
    display: grid;
    grid-template-columns: 64px 18px minmax(80px, auto) 1fr;
    gap: var(--space-2);
    align-items: baseline;
    padding: 2px var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-primary);
  }
  .log-row:hover {
    background: var(--bg-hover) !important;
  }
  .log-time {
    color: var(--text-tertiary);
    font-size: 10px;
    white-space: nowrap;
  }
  .log-level {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .log-source {
    color: var(--text-accent);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .log-message {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .log-details {
    grid-column: 1 / -1;
    color: var(--text-secondary);
    font-size: 10px;
    padding-left: 82px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 60px;
    overflow-y: auto;
  }

  .debug-collapsed {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 3px var(--space-3);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    font-family: var(--font-sans);
    cursor: pointer;
    border: none;
    width: 100%;
    transition: background 120ms ease, color 120ms ease;
  }
  .debug-collapsed:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
  .collapsed-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .error-badge {
    background: var(--error);
    color: var(--text-inverse);
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: var(--radius-full);
    min-width: 16px;
    text-align: center;
  }
</style>
