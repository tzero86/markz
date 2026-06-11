<script lang="ts">
  import { Check } from "@lucide/svelte";
  import type { PresetOption, ThemePreset } from "../../lib/themeStore";

  let {
    preset,
    selected,
    onSelect,
  }: {
    preset: PresetOption;
    selected: boolean;
    onSelect: (value: ThemePreset) => void;
  } = $props();
</script>

<button
  class="preset-card"
  class:selected
  onclick={() => onSelect(preset.value)}
  type="button"
  aria-pressed={selected}
  aria-label={`Select ${preset.label} color preset`}
>
  <div class="preset-preview">
    {#each preset.preview as color}
      <span
        class="swatch"
        style="background-color: {color};"
        aria-hidden="true"
      ></span>
    {/each}
  </div>
  <div class="preset-label">
    <span class="preset-name">{preset.label}</span>
    {#if selected}
      <span class="preset-check" aria-hidden="true">
        <Check size={14} strokeWidth={2.5} />
      </span>
    {/if}
  </div>
</button>

<style>
  .preset-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    border: 1.5px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    cursor: pointer;
    transition:
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
    text-align: left;
    min-width: 0;
  }

  .preset-card:hover {
    border-color: var(--accent-default);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .preset-card.selected {
    border-color: var(--accent-default);
    background: var(--accent-subtle);
    box-shadow: var(--shadow-focus);
  }

  .preset-card:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }

  .preset-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 28px;
    padding: 0 4px;
    background: var(--bg-base);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  .swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12),
                0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .preset-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 0 2px;
    min-width: 0;
  }

  .preset-name {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-check {
    display: inline-flex;
    align-items: center;
    color: var(--accent-default);
    flex-shrink: 0;
  }
</style>
