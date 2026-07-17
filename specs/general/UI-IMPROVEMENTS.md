# UI/UX Improvements

## Summary

Reviewed the MarkZ frontend (`src/`) against `docs/MarkZ_UI_UX_Design.md` and the observed production build warnings. The app is visually close to the specification — a token-driven light/dark theme, a clean dual-pane layout, a polished preview pane, and thoughtful motion design are already in place. The main gaps are accessibility issues surfaced by the Svelte compiler, performance risks from large bundles and pane remounts, and several deviations from the design spec around settings interaction, contrast, and component styling.

## Critical Issues

### Issue: Non-interactive elements are used as resize handles, overlays, and menus
**Current State**: Multiple components use plain `<div>` elements with mouse/keyboard event listeners for interactive behaviors:
- `src/components/layout/SplitPane.svelte:90,104` — pane divider is a `<div role="separator" tabindex="0" onmousedown onkeydown>`.
- `src/App.svelte:457` — sidebar resize handle is a `<div role="separator" onmousedown>`.
- `src/components/layout/DebugPanel.svelte:93` — debug panel resize handle is a `<div role="separator" onmousedown>`.
- `src/components/editor/EditorPane.svelte:512` — context menu overlay is a `<div role="presentation" onclick>`.
- `src/components/ui/CommandPalette.svelte:156,157` and `src/components/layout/SearchPanel.svelte:107,108` — modal overlays use `<div onclick>`.

**Problem**: These trigger Svelte a11y warnings and are unusable with screen readers. Keyboard users cannot discover or operate the splitters, and the overlay click targets do not behave like standard dialogs/buttons.

**Recommendation**:
- Convert pane/debug resize handles to `<button>` (visually styled as a grip) or add `role="slider"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Ensure every resizer has arrow-key resizing and visible focus states.
- Change modal backdrops to close only on backdrop clicks/ESC and trap focus inside the modal; add `role="dialog"` and `aria-modal="true"` consistently.
- Convert the editor context menu to `role="menu"` with `role="menuitem"` items and arrow-key/Escape handling.

**Impact**: Keyboard and screen-reader users can resize panes, close modals, and navigate menus reliably.

**Implementation Notes**: The keyboard handling already exists for `SplitPane` arrows; only the element semantics and ARIA attributes need changing. Reuse the existing `trapFocus` action (`src/lib/focusTrap.ts`) in `CommandPalette` and `SettingsModal`.

---

### Issue: View-mode switching remounts the editor and preview panes
**Current State**: `src/components/layout/SplitPane.svelte` conditionally renders the left/right pane snippets based on `showLeft`/`showRight`. When the user toggles Editor/Preview/Split mode from the status bar, `EditorPane` or `PreviewPane` is destroyed and recreated.

**Problem**: Remounting re-initializes CodeMirror, resets cursor position/scroll, rebuilds slide-break gutters, and re-runs the preview render pipeline. On slower Windows machines this produces a perceptible freeze or flash, which is the remaining symptom of the earlier view-mode-switch freezes.

**Recommendation**: Keep both pane components mounted and toggle visibility with CSS (e.g., `display: none`, `visibility: hidden`, or `flex-basis: 0` with `overflow: hidden`). Only the layout geometry of `SplitPane` should change, not the component instances.

**Impact**: Instant, state-preserving view mode switches; elimination of the last visible freeze path.

**Implementation Notes**: Remove the `{#if showLeft}` / `{#if showRight}` guards around the snippets and instead apply a hidden class. Ensure `SplitPane` still reports the correct `mode` to child components so the preview can pause expensive sync when hidden.

---

### Issue: Tertiary text color fails WCAG AA contrast and is used for active UI labels
**Current State**: `--text-tertiary` is `#a0a0a0` in light mode and `#6b6b6b` in dark mode. It is used for active icons in the title bar, toolbar, activity bar, status bar labels, file-tree labels, and empty states. The design spec reserves `--text-tertiary` for placeholders and disabled states.

**Problem**: `#a0a0a0` on `#ffffff`/`#fafafa` yields roughly 2.7:1 contrast, failing WCAG AA for normal text (4.5:1). Many functional labels are therefore hard to read for low-vision users.

**Recommendation**:
- Use `--text-secondary` (`#6b6b6b`, ~6.5:1 on white) for all active icons, labels, and tree items.
- Reserve `--text-tertiary` for placeholder text, disabled controls, and purely decorative meta data.
- Alternatively, darken light-mode `--text-tertiary` to at least `#767676` if it must remain on elevated backgrounds.

**Impact**: All active UI text meets WCAG AA; the interface becomes readable without squinting.

**Implementation Notes**: Update `src/styles/tokens.css` and audit every component using `--text-tertiary` (`TitleBar`, `Toolbar`, `ActivityBar`, `StatusBar`, `OutlineSidebar`, `DebugPanel`, etc.).

---

### Issue: Large JavaScript chunks slow startup and increase memory use
**Current State**: The production build warns that several chunks exceed 500 kB after minification, including `mermaid.core` (~592 kB), `cytoscape.esm` (~442 kB), `katex` (~261 kB), and the main `index` bundles (~1 MB total). These heavy libraries are statically imported in `PreviewPane`, `PresentationMode`, and `syntaxHighlighter`/`mathRenderer`/`mermaidRenderer`.

**Problem**: Large synchronous chunks delay parsing/compilation on Windows startup and worsen the perception of the earlier startup freezes. Mermaid and KaTeX are not needed until a document actually contains diagrams or math.

**Recommendation**:
- Dynamically import `mermaid`, `katex`, and `cytoscape` only when a matching block is found.
- Lazy-load the presentation component (`src/components/preview/PresentationMode.svelte`) and the export/preview post-processors.
- Add `build.rollupOptions.output.manualChunks` to isolate heavy vendors and avoid them landing in the main `index` chunk.

**Impact**: Faster cold start, lower baseline memory, and quicker time-to-interactive.

**Implementation Notes**: Convert the renderer imports in `src/components/preview/PreviewPane.svelte` and the renderer modules to `async import()`. Set `build.chunkSizeWarningLimit` only after genuine splitting; do not silence the warning without splitting first.

---

### Issue: Settings modal requires a Save button instead of applying changes instantly
**Current State**: `src/components/settings/SettingsModal.svelte` loads settings, lets the user edit them, and only applies/persists them when the Save button is clicked. There is also a Cancel button.

**Problem**: The design spec states "Changes apply instantly (no 'Save' button needed)" and provides per-section reset. The current flow hides preview feedback until Save is pressed and allows the user to Cancel after thinking changes were applied.

**Recommendation**:
- Remove the Save/Cancel footer.
- Bind each setting control directly to the settings store and persist with a debounced `update_settings` invocation.
- Add a "Reset to defaults" action per settings category.
- Keep the modal closeable via the X button, backdrop click, and Escape.

**Impact**: Users see theme, font, layout, and preview changes immediately, matching the spec and modern native app conventions.

**Implementation Notes**: Move persistence out of `save()` and into reactive effects or `on:change` handlers in each settings category component.

## High Priority Improvements

### Issue: Redundant and unused CSS in the preview pane
**Current State**: `src/components/preview/PreviewPane.svelte` contains a large scoped style block with `:global(...)` rules that duplicate `src/styles/preview-theme.css`. The build reports unused selectors: `.preview-content.text-format`, `.preview-content.text-format pre`, `.preview-content.text-format code`, `.preview-search-bar`, `.preview-search-input`, `.preview-search-count`, and `.preview-search-btn`.

**Problem**: Two sources of truth for preview styles create specificity conflicts, bloated CSS, and build warnings. The unused search classes indicate dead UI that may confuse future maintainers.

**Recommendation**:
- Move all preview content styling into `src/styles/preview-theme.css` and remove the corresponding `:global(...)` block from `PreviewPane`.
- Delete the unused `.preview-search-*` and `.text-format` selectors, or wire them up if they are intended for a future feature.
- Keep only layout/progress/floating-bar styles in the component scope.

**Impact**: Cleaner build output, smaller CSS, and predictable preview rendering.

**Implementation Notes**: Compare the two stylesheets line-by-line; consolidate heading, paragraph, code, table, blockquote, list, image, and mermaid rules into `preview-theme.css`.

---

### Issue: Custom tooltips only appear on hover
**Current State**: The `[data-tooltip]` pseudo-element tooltips in `src/components/layout/TitleBar.svelte` and `src/components/preview/PreviewPane.svelte` are shown only on `:hover`.

**Problem**: Keyboard-only users who focus a toolbar or preview action button never see the tooltip hints. This violates the spec's keyboard-navigation requirement.

**Recommendation**: Show tooltips on `:focus-visible` in addition to `:hover`, or replace the CSS-only implementation with a shared `Tooltip` component that handles hover, focus, keyboard dismissal, and reduced motion.

**Impact**: Toolbar hints become accessible to keyboard users and screen-reader users with reading modes that expose title-like content.

**Implementation Notes**: A minimal fix is adding `[data-tooltip]:focus-visible::after { opacity: 1; transform: translateX(-50%) scale(1); }`.

---

### Issue: Command palette and settings modal do not trap focus
**Current State**: `src/components/ui/CommandPalette.svelte` and `src/components/settings/SettingsModal.svelte` render modal overlays but do not use the existing `trapFocus` action. `src/components/layout/SearchPanel.svelte` already uses it.

**Problem**: Pressing Tab inside these modals can move focus to background elements (title bar, editor, status bar), breaking the modal workflow and disorienting keyboard users.

**Recommendation**: Apply `use:trapFocus` to the modal container in `CommandPalette` and `SettingsModal`, and return focus to the element that opened the modal when it closes.

**Impact**: Keyboard users remain inside modals until explicitly dismissed.

**Implementation Notes**: The `trapFocus` action already focuses the first focusable element. For `CommandPalette`, ensure the input stays focused on open and focus returns to the trigger button on close.

---

### Issue: No minimum-window-size warning overlay
**Current State**: `src/App.svelte` collapses the sidebar below 1200 px and forces single-pane mode below 900 px, but there is no overlay for the spec-mandated minimum window size of 900×600 px.

**Problem**: At very small sizes the layout breaks (e.g., title bar buttons wrap, preview toolbar clips) and users are not told why.

**Recommendation**: Add a fixed overlay in `App.svelte` that appears when `innerWidth < 900` or `innerHeight < 600`, with a message such as "Please resize the window to continue editing."

**Impact**: Prevents broken layouts and matches the responsive behavior specified in the design doc.

**Implementation Notes**: Keep the overlay non-blocking so the window can still be resized; use `pointer-events: none` except for the message container.

---

### Issue: Preview copy dropdown and TTS controls do not close on click-outside or Escape
**Current State**: In `src/components/preview/PreviewPane.svelte`, the `copyDropdownOpen` state is toggled only by the Copy button. There is no click-outside or Escape handler, and no arrow-key navigation.

**Problem**: The dropdown can stay open while the user interacts with the preview or other toolbars, creating a confusing, modal-like menu that does not behave like the title-bar dropdowns.

**Recommendation**: Add a document click-outside listener, close on Escape, and implement Up/Down/Enter keyboard navigation with `role="menu"` and `role="menuitem"`.

**Impact**: Consistent, predictable menu behavior across the app.

**Implementation Notes**: Mirror the keyboard handling pattern already used in `src/components/layout/TitleBar.svelte` for the export dropdown.

---

### Issue: Status-bar split-direction icon rotation does not render
**Current State**: `src/components/layout/StatusBar.svelte:94` passes `class="rotated"` and `class="flip"` directly to the Lucide `Columns2` component to indicate split direction.

**Problem**: The Lucide Svelte component does not forward arbitrary `class` props to the rendered SVG, so the classes are unused (confirmed by the build warning) and the icon never rotates.

**Recommendation**: Wrap the icon in a `<span>` and apply the transform to the wrapper, or use an inline `style="transform: rotate(...)"` on a wrapper element.

**Impact**: Users get immediate visual feedback for the current split direction.

**Implementation Notes**: Replace the `class` prop with a wrapper `<span class={rotateClass}>` and move `.rotated`/`.flip` CSS to that wrapper.

---

### Issue: Toast status variants lack semantic left borders
**Current State**: `src/components/ui/Toast.svelte` only adds a left border for `.toast-default`. The `.toast-success`, `.toast-error`, and `.toast-info` classes do not have a colored left border.

**Problem**: The design spec requires a 3 px semantic left border (success = accent, error = red). Without it, status toasts are harder to scan at a glance.

**Recommendation**: Add `border-left: 3px solid ...` rules for `.toast-success` (accent), `.toast-error` (error), and `.toast-info` (info).

**Impact**: Faster recognition of toast status, especially in peripheral vision.

**Implementation Notes**: Keep the existing progress bar; the border is a supplementary cue.

---

### Issue: Editor context menu has only one option and poor keyboard support
**Current State**: `src/components/editor/EditorPane.svelte:510` renders a custom context menu with a single "Add to dictionary" button inside a fixed overlay. It has no `role="menu"`, no arrow-key navigation, and relies on a click on the overlay to close.

**Problem**: Right-click spell-check menus are expected to behave like native context menus. The current implementation is not announced by screen readers and is awkward for keyboard users.

**Recommendation**: Add `role="menu"` to the menu container, `role="menuitem"` to the button, focus the first item on open, and close on Escape/Tab/click-outside.

**Impact**: Spell-check actions become accessible and consistent with other context menus in the app.

**Implementation Notes**: If the menu grows later, the keyboard navigation scaffold will already be in place.

## Medium Priority Enhancements

### Issue: Border-radius tokens deviate from the design specification
**Current State**: `src/styles/tokens.css` defines `--radius-sm: 6px`, `--radius-md: 8px`, and `--radius-lg: 10px`. The design spec calls for `4px`, `6px`, and `8px` respectively.

**Problem**: Slightly larger radii make the interface feel softer than the spec's "precision & craft" intent. Buttons and inputs in particular use `var(--radius-md)` (8 px) instead of the specified 4–6 px.

**Recommendation**: Align tokens to the spec (`--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`) or update the spec if the larger radii are intentional. Apply the small radius to buttons and inputs consistently.

**Impact**: A tighter, more precise visual language matching the specification.

**Implementation Notes**: A global token change will cascade; verify modals and dialogs still look balanced.

---

### Issue: Light-theme background values deviate from the spec
**Current State**: Light mode uses `--bg-base: #fafafa` and `--bg-surface: #ffffff`. The spec specifies `--bg-base: #FFFFFF` and `--bg-surface: #F5F5F5`.

**Problem**: The editor background is slightly grey instead of pure white, and panels are pure white instead of light grey, which inverts the intended hierarchy.

**Recommendation**: Either update the tokens to match the spec or document the intentional deviation in `docs/MarkZ_UI_UX_Design.md`.

**Impact**: Clearer visual separation between editor surface and surrounding chrome.

**Implementation Notes**: Check the editor empty state and preview pane after changing the values to ensure contrast remains sufficient.

---

### Issue: Preview pane fades the entire content on every update
**Current State**: `.preview-content` in `src/components/preview/PreviewPane.svelte:1102` has `animation: fadeIn 200ms` applied continuously.

**Problem**: The spec recommends animating only newly inserted elements. Fading the whole preview on every keystroke can feel flickery and may be distracting.

**Recommendation**: Remove the full-content fade or apply it only when the document path changes. If per-element animation is desired, add a brief fade to newly rendered images, diagrams, or math blocks.

**Impact**: A calmer, more stable live-preview experience.

**Implementation Notes**: Move the animation to a class that is toggled only on document switch, not on every `htmlContent` update.

---

### Issue: Mermaid diagrams are scaled with CSS transform
**Current State**: `src/components/preview/PreviewPane.svelte:523` applies `transform: scale(${zoom})` to mermaid SVGs and sets explicit `width`/`height` on the parent.

**Problem**: CSS transform scaling can blur diagrams at non-integer zoom levels and may clip content when the parent dimensions are slightly off. It also bypasses `prefers-reduced-motion` for zoom changes.

**Recommendation**: Scale diagrams by adjusting the SVG `width`/`height` or `viewBox` instead of `transform`, and respect reduced motion when redrawing.

**Impact**: Sharper diagrams and better accessibility.

**Implementation Notes**: Re-measure the natural SVG size after each render and compute the scaled width directly; round to device pixels.

---

### Issue: Settings search matches hard-coded keyword lists
**Current State**: `src/components/settings/SettingsModal.svelte:134` uses hard-coded keyword arrays per category to decide which sections to show when searching.

**Problem**: The search is brittle: a user searching for a setting label that is not in the hard-coded list will get no results.

**Recommendation**: Pass a `searchTerms` prop from each setting component/row and filter by matching actual labels and descriptions.

**Impact**: Users can reliably find settings by name.

**Implementation Notes**: Add a lightweight search metadata object to each settings category and aggregate it in `SettingsModal`.

---

### Issue: Tab-scroll buttons are not keyboard focusable
**Current State**: The left/right scroll buttons in `src/components/layout/TabBar.svelte:162,251` have `tabindex="-1"`.

**Problem**: When many tabs are open and overflow, keyboard users cannot scroll the tab list to reach hidden tabs.

**Recommendation**: Remove `tabindex="-1"` and add arrow-key scrolling inside the tab list when it has focus.

**Impact**: Full keyboard operability of the tab bar.

**Implementation Notes**: Keep the scroll buttons small and ensure they have visible focus rings.

---

### Issue: TitleBar recent-files dropdown lacks keyboard handling
**Current State**: The recent files trigger in `src/components/layout/TitleBar.svelte:328` opens a dropdown but has no `onkeydown` handler for Escape/Arrow keys.

**Problem**: Keyboard users cannot open, navigate, or close the recent-files menu without a mouse.

**Recommendation**: Add the same keyboard pattern used for the export dropdown: Enter/Space to open, ArrowUp/ArrowDown to navigate, Enter to open, Escape to close.

**Impact**: Consistent keyboard access to both title-bar menus.

## Low Priority Suggestions

### Issue: `src/main.ts` imports `base.css` twice
**Current State**: `src/main.ts:3,4` imports `./styles/base.css` twice.

**Problem**: Redundant import; no runtime harm but unnecessary.

**Recommendation**: Remove the duplicate import.

---

### Issue: Preview `contenteditable` flag is dead code
**Current State**: `src/components/preview/PreviewPane.svelte:37` declares `previewEditing = $state(false)` and binds it to `contenteditable` on `.preview-content`, but it is never set to `true`.

**Problem**: Dead code and a misleading attribute on the preview surface.

**Recommendation**: Remove `previewEditing` and the `contenteditable` attribute until inline preview editing is implemented.

---

### Issue: Search/replace logic is line-based and unsafe
**Current State**: `src/components/layout/SearchPanel.svelte:57` replaces occurrences by splitting on `\n` and replacing substrings per line.

**Problem**: A query that spans lines or appears inside a larger word will not be handled correctly. It also does not preserve line endings or respect word boundaries.

**Recommendation**: Replace with a whole-document text replacement using a robust search index or the backend search API.

**Impact**: More reliable global find/replace across the workspace.

---

### Issue: Presentation fullscreen request lacks error handling
**Current State**: `src/components/preview/PresentationMode.svelte:94` calls `document.documentElement.requestFullscreen()` without a catch.

**Problem**: In environments where fullscreen is denied, the promise rejects and the toggle state becomes out of sync.

**Recommendation**: Wrap the call in `try/catch` and revert `isFullscreen` on failure.

---

### Issue: Print stylesheet uses a different accent color
**Current State**: The print iframe in `src/components/preview/PreviewPane.svelte:681` hardcodes `--accent-default: #0969da` (GitHub blue) instead of the MarkZ emerald accent.

**Problem**: Printed documents do not match the app's visual identity.

**Recommendation**: Use the actual light-mode MarkZ accent (`#0d8a5d`) in the print variables.

---

### Issue: Duplicate reduced-motion rules
**Current State**: `src/styles/base.css:68` and `src/styles/animations.css:148` both define `@media (prefers-reduced-motion: reduce)` overrides.

**Problem**: Redundant CSS.

**Recommendation**: Keep only one global reduced-motion rule (preferably in `animations.css`) and remove the duplicate.

---

### Issue: Presentation controls auto-hide is mouse-only
**Current State**: `src/components/preview/PresentationMode.svelte:84` hides controls after mouse inactivity.

**Problem**: Keyboard presenters may not see controls if the mouse is never moved.

**Recommendation**: Keep controls visible while any presentation control has focus, or add a focus-based visibility rule.

---

## Code Quality / Anti-Slop Findings — File Handling

Audited the file-handling and tab/workspace modules (`src/lib/workspaceStore.ts`, `src/lib/keyboard.ts`, `src/lib/tabStore.ts`, `src/App.svelte`, `src/components/layout/OutlineSidebar.svelte`, `src/components/layout/TabBar.svelte`) after the recent file-handling refactor. The refactor removed the most egregious duplication (open-file logic was duplicated in three places); remaining issues are minor polish and debug noise.

| Line | Severity | Category | Pattern | Issue |
|------|----------|----------|---------|-------|
| `src/App.svelte:319,327` | low | Unnecessary logging | Debug `console.log` | Two `[App] handleSelectActivity` logs left in production code. Delete them. |
| `src/App.svelte:211-224` | low | Verbose patterns | Boolean verbosity / duplicated confirm | Two near-identical `confirm()` calls for external file reload. Unify into one dialog with a conditional message. |
| `src/App.svelte:533` | low | Type workaround | `invoke<any>` | `render_slides` response is typed as `any`. Add a `SlideDeck` interface or use `unknown`. |
| `src/lib/keyboard.ts:41-42,103-104` | medium | Defensive over-coding / poor UX | `alert()` for I/O errors | Native `alert()` blocks the window and looks unprofessional. Use the existing `Toast` component or `debugLogStore` + status-bar message. |
| `src/lib/tabStore.ts:564-618` | low | Verbose patterns | Triplicated dirty-tab confirm | Three almost identical dirty-tab confirmation blocks in `closeTab`, `closeAllExcept`, `closeAll`. Extract a `confirmClose(tab)` helper. |
| `src/lib/tabStore.ts:797` | low | Type workaround | `window as any` | Expose the store via a typed global or remove the E2E-only assignment. |
| `src/components/layout/OutlineSidebar.svelte:62,66,110` | low | Unnecessary logging | `console.error` in catch | Backlink/wikilink failures silently degrade to empty arrays; log via `debugLogStore` instead of `console.error`. |
| `src/components/layout/OutlineSidebar.svelte:117` | low | Unnecessary logging | `console.warn` for ignored non-Markdown files | Fine for debugging, but should use `debugLogStore` for consistency with the rest of the app. |
| `src/components/layout/TabBar.svelte` | — | Positive | — | Clean tab lifecycle; drag-and-drop, pinning, dropdown, and dirty indicators are well factored. |

### Cross-File Observations

- **Good**: `openDocumentByPath` is now the single chokepoint for opening a file by path; `OutlineSidebar` no longer duplicates the "focus existing tab" check.
- **Good**: `workspaceStore.openFile` is the single place that decides whether to reveal a file in the existing workspace, replacing the previous `syncToFile` behavior that aggressively re-rooted on every file open.
- **Watch**: `parentDirectory` is now exported from `workspaceStore.ts` and reused by `keyboard.ts`, removing a duplicated inline path-slicing expression.

---

## UI/UX Review Findings — File, Tab, and Workspace Handling

Reviewed the open/save/refresh/tab/file-tree flows against Sublime Text and Windows 11 Notepad conventions after the file-handling refactor.

### Critical Issues

#### Issue: External file changes are only surfaced when a tab becomes active
**Current State**: The watcher and manual refresh both record externally modified paths, but the user is only prompted when switching focus to the affected tab or when the window regains focus with that tab active. There is no visual indicator on an inactive tab that its file has changed on disk.

**Problem**: A user editing many files may not notice that an inactive tab is stale until they click it, leading to surprise overwrites or lost external edits.

**Recommendation**: Add a small dot or badge to inactive tabs whose disk content differs from the in-memory content. When the user switches to such a tab, keep the existing "Reload?" prompt. Optionally, add a "Reload All" command in the command palette.

**Impact**: Users can see at a glance which tabs need attention and avoid accidental overwrites.

**Implementation Notes**: Extend `tabStore` with an `externallyModified: boolean` flag per tab, set it in the `markz:file-externally-changed` handler and the manual `markz:check-open-files` handler, and render a subtle indicator in `TabBar`.

---

### High Priority Improvements

#### Issue: Save dialog can produce a double extension
**Current State**: `src/lib/keyboard.ts:saveDocument` uses `doc.title` directly as the default filename when it is not "Untitled". If the title already contains an extension (e.g. "notes.md"), the default becomes "notes.md.md".

**Problem**: Users who rename a file in the title bar or via a template may save with an incorrect extension.

**Recommendation**: Strip any existing `.md`/`.markdown`/`.mdx` extension from `doc.title` before appending `.md`.

**Impact**: Saves produce predictable filenames.

---

#### Issue: No "Reveal in Sidebar" / "Open Containing Folder" commands
**Current State**: There is no command palette action to reveal the active file in the file tree or to open its containing folder in the OS file manager.

**Problem**: When a workspace contains many nested directories, users can lose the active file in the tree. Native editors provide these commands as a quick way to orient themselves.

**Recommendation**: Add two palette commands:
- "Reveal Active File in Sidebar" — expands the tree and selects the active file.
- "Open Containing Folder" — invokes a backend command to `std::process::Command` the OS file manager (Explorer/Finder) on the file's parent.

**Impact**: Faster navigation between the editor and the file system.

---

#### Issue: Title-bar breadcrumb re-rooting can close tabs without warning
**Current State**: Clicking a segment in the title-bar breadcrumbs calls `workspaceStore.loadWorkspace(crumb.path)`, which triggers the workspace-root-change effect that closes unrelated file tabs. `openFolder()` itself asks for confirmation on dirty tabs, but the breadcrumb path does not.

**Problem**: A quick click on a parent folder in the breadcrumb can silently discard the context of open tabs (the close path asks for dirty-tab confirmation, but the overall workspace switch may still feel abrupt).

**Recommendation**: Either add a confirmation when breadcrumb re-rooting would close tabs, or change breadcrumb clicks to reveal the segment in the existing tree without re-rooting. The latter is closer to Sublime's breadcrumb behavior.

**Impact**: Prevents accidental loss of open-file context.

---

### Medium Priority Enhancements

#### Issue: File-tree refresh provides no visual feedback while busy
**Current State**: The refresh button in `OutlineSidebar` calls `workspaceStore.refresh()`. The tree updates once complete, but there is no spinner on the button and no disabled state during the refresh.

**Problem**: On large workspaces the user may click refresh repeatedly, triggering redundant work, or wonder whether anything happened.

**Recommendation**: Set a transient `refreshing` state on click, disable the refresh button, and restore it when `refresh()` resolves or rejects. Add a small rotating icon or spinner.

**Impact**: Clearer feedback and fewer redundant refreshes.

---

#### Issue: New untitled document closes the workspace entirely
**Current State**: `newDocument()` in `keyboard.ts` calls `workspaceStore.syncToFile(null)`, which closes the workspace.

**Problem**: In Sublime/Notepad, creating a new document does not evict the open folder. Users who want to jot a quick note lose their file tree.

**Recommendation**: Remove the workspace close from `newDocument`. Keep the existing workspace open; the new Untitled tab simply has no tree selection.

**Impact**: New notes do not destroy the user's workspace context.

---

#### Issue: Manual save does not flash the auto-save indicator
**Current State**: Only the auto-save timer flashes the status indicator via `autoSaveFlash`. A manual `Ctrl+S` saves silently.

**Problem**: Users get no immediate confirmation that the save succeeded, aside from the dirty dot disappearing.

**Recommendation**: Flash the same save indicator on manual save (or show a brief "Saved" toast).

**Impact**: More confident saving.

---

### Low Priority Suggestions

- **Refresh preserves expansion state**: The recent refactor changed `refresh()` to keep `expandedDirs` and re-load their children. This is a noticeable UX win and should be preserved.
- **Duplicate-tab prevention is now global**: `openDocumentByPath` now focuses an existing tab for any open-file entry point (tree, recent files, OS association, command palette). Keep this centralized.
- **File-tree active-file highlight**: The tree already highlights the active file. Ensure this highlight updates immediately on tab switch.

### Positive Observations

- **Centralized open logic**: `openDocumentByPath` is now the single path for opening files, eliminating the previous drift between tree double-click, recent files, and OS file association.
- **Refresh now surfaces tab changes**: A manual refresh no longer just rebuilds the tree; it also checks open files against disk and prompts for reload when stale.
- **Workspace root changes respect the active tab**: The `$effect` in `App.svelte` now keeps the active tab focused when a file open operation triggers a root change, instead of spawning a blank Untitled tab.
- **Self-save ignored by watcher**: Manual save adds the path to `recentlySavedPaths`, reducing false-positive "file changed externally" prompts.

---

## Positive Observations

- **Token-driven theming**: The app uses a comprehensive CSS custom-property system (`src/styles/tokens.css`) with light/dark modes, system-preference support, and a `data-reduced-motion` attribute that disables animations.
- **Scrollbar and overscroll behavior**: `src/styles/base.css` styles 8 px scrollbars and applies `overscroll-behavior: contain` to CodeMirror, preview, and outline scrollers, preventing unwanted scroll chaining.
- **Preview layout**: The preview pane follows the spec closely with a max-width of 820 px, centered content, generous padding, and correctly sized headings, blockquotes, tables, code blocks, and images.
- **Editor CodeMirror theme**: The editor uses the design tokens for cursor, selection, active-line gutter, matching brackets, and the GitHub Primer syntax palette, matching the spec.
- **Keyboard focus ring**: A global `:focus-visible` rule provides a consistent focus indicator across the app.
- **Performance-aware preview rendering**: `PreviewPane` debounces renders, shows a progress bar, caches results, and skips re-renders when content has not changed.
- **Command palette UX**: `CommandPalette` provides keyboard navigation, filtering, and clear shortcut hints.
- **Security**: Preview HTML is sanitized with `DOMPurify` before injection.
- **Startup resilience**: `App.svelte` loads settings first, restores sessions in the background, and dismisses the splash screen without blocking on directory scans.
- **Outline navigation**: The outline sidebar is functional and was explicitly fixed prior to this review; it is therefore not listed as an open issue.
