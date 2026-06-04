<script lang="ts">
  let {
    searching,
    sectionMatches,
  }: {
    searching: boolean;
    sectionMatches: (terms: string[]) => boolean;
  } = $props();

  const shortcuts = [
    { keys: ["Ctrl", "O"], action: "Open file", category: "File" },
    { keys: ["Ctrl", "Shift", "O"], action: "Open folder / workspace", category: "File" },
    { keys: ["Ctrl", "T"], action: "New file", category: "File" },
    { keys: ["Ctrl", "S"], action: "Save file", category: "File" },
    { keys: ["Ctrl", "W"], action: "Close active tab", category: "File" },
    { keys: ["Ctrl", "Shift", "P"], action: "Command palette", category: "Navigation" },
    { keys: ["Ctrl", "P"], action: "Quick open files", category: "Navigation" },
    { keys: ["Ctrl", "B"], action: "Toggle sidebar panel", category: "View" },
    { keys: ["F5"], action: "Start presentation mode", category: "View" },
    { keys: ["Ctrl", "Shift", "F"], action: "Search workspace", category: "View" },
    { keys: ["Ctrl", "F"], action: "Find / Replace", category: "Edit" },
    { keys: ["Ctrl", "Shift", "D"], action: "Git diff panel", category: "View" },
    { keys: ["Ctrl", "="], action: "Zoom in", category: "View" },
    { keys: ["Ctrl", "-"], action: "Zoom out", category: "View" },
    { keys: ["Ctrl", "0"], action: "Reset zoom", category: "View" },
    { keys: ["Esc"], action: "Close modal / dropdown", category: "Navigation" },
  ];
</script>

{#if !searching || sectionMatches(["shortcut", "keyboard", "hotkey", "key binding", "ctrl"])}
  <div class="settings-section">
    <h3>Keyboard Shortcuts</h3>
    <div class="shortcuts-list">
      {#each [
        { name: "File", items: shortcuts.filter(s => s.category === "File") },
        { name: "Edit", items: shortcuts.filter(s => s.category === "Edit") },
        { name: "View", items: shortcuts.filter(s => s.category === "View") },
        { name: "Navigation", items: shortcuts.filter(s => s.category === "Navigation") },
      ] as category}
        <div class="shortcut-category">
          <h4 class="shortcut-category-name">{category.name}</h4>
          {#each category.items as shortcut}
            <div class="shortcut-row">
              <span class="shortcut-action">{shortcut.action}</span>
              <span class="shortcut-keys">
                {#each shortcut.keys as key, i}
                  <kbd>{key}</kbd>
                  {#if i < shortcut.keys.length - 1}<span class="plus">+</span>{/if}
                {/each}
              </span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}
