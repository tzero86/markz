## Unreleased

### Added
- **Skip-to-editor link** — A visually hidden "Skip to editor" link is now the first focusable element in the app. Keyboard users can press Tab on page load to reveal it and jump directly to the CodeMirror editor.

### Fixed
- **Markdown auto-pair for emphasis and code** — Typing `*`, `_`, or `` ` `` now auto-inserts the closing delimiter alongside the existing bracket/quote pairs. Covered by E2E tests for all three characters plus a regression check for `[]`.
- **Focus traps in all modals** — `use:trapFocus` is now applied to Settings, Command Palette, Template Browser, Table Editor, Save Template Dialog, and Git Diff modals. Tab cycles within the modal and the first focusable element is auto-focused on open.
- **Command palette frecency + categories** — Commands are now grouped under File, View, Export, and Tools headers. When the query is empty, items are sorted by usage frequency within each category; when searching, frequently used commands get a small score boost. Usage counts persist in localStorage.
- **Preview inline search** — `Ctrl+F` inside the preview pane now opens a search bar with previous/next navigation, match highlighting, and a result counter. `Escape` closes the search bar.
- **Document navigation history** — WikiLink jumps and file opens now maintain a back/forward stack. `Alt+Left` navigates back, `Alt+Right` navigates forward, and "Go Back" / "Go Forward" commands are available in the Command Palette. History is bounded to 50 entries and skips duplicate consecutive paths.

## [0.8.66] - 2026-07-08

### Fixed
- **Workspace replace-all in SearchPanel** — `replaceAll` now reads each file's current contents and persists the replaced text via `save_document`, then refreshes search results.
- **Panes stay mounted across view modes** — `SplitPane` now keeps both editor and preview panes mounted and toggles visibility with CSS, eliminating remount delays when switching between Split, Editor-only, and Preview-only.

### Changed
- Removed unused dependencies (`canvg`, `headroom-ai`) and dead backend code (`edge_tts.rs`, duplicate `session_path`).
- Merged `process_pasted_image` and `process_dropped_image` into a single `save_image` command.
- Cleaned all Svelte build warnings: unused CSS selectors, deprecated `<svelte:component>` usage, and a11y warnings for overlays, resize handles, and context menus.


## [0.8.65] - 2026-07-07

### Fixed
- **Outline headings are now clickable** — Clicking an item in the outline sidebar now scrolls both the editor and the preview to the corresponding heading. The TOC now carries the source line number, and a shared `markz:scroll-to-heading` event coordinates navigation between panes.
- **Export dropdown closes immediately** — Starting a DOCX or Pandoc export now closes the Copy/Export dropdown right away instead of leaving it open while the export runs.


## [0.8.64] - 2026-07-07

### Fixed
- **No more console flash when switching to split view** — `PreviewPane` checks for pandoc on mount; on Windows, spawning a `tokio::process::Command` without `CREATE_NO_WINDOW` caused a command-prompt window to flash. All pandoc invocations now use a shared command builder that sets `CREATE_NO_WINDOW` on Windows, so switching view modes is clean.


## [0.8.63] - 2026-07-07

### Fixed
- **Shorter splash-screen wait** — Settings are now loaded inside the startup sequence instead of at module evaluation, and all remaining blocking `std::fs` calls in the session, settings, workspace, and pandoc commands have been converted to `tokio::fs`. This prevents synchronous disk I/O from starving the Tauri async runtime during startup.
- **Preview pane no longer runs while hidden** — The editor/preview split pane now unmounts the hidden pane entirely in single-pane modes instead of keeping it alive with `display: none`. Toggling between Split, Editor-only, and Preview-only no longer pays the cost of a hidden preview render loop.
- **DOCX export dependencies no longer load at startup** — `mermaid`, `katex`, and their styles were being pulled into the main JS bundle by the DOCX preparation module. They are now loaded on demand when exporting to DOCX, reducing initial bundle size and parse time.
- **Pandoc checks no longer block the runtime** — `pandoc_available` and the pandoc export/copy commands now use `tokio::process` and `tokio::fs`, so spawning the pandoc binary can't stall other commands.


## [0.8.62] - 2026-07-07

### Added
- **In-app debug panel now captures startup and render timings** — `load_session`, `restoreSession`, `openDocumentByPath`, `finishStartup`, and backend `render_preview` timings are now logged directly to the built-in Debug Panel instead of only the browser console / log file.


## [0.8.61] - 2026-07-07

### Fixed
- **Faster session restore** — Restored tabs are now built in a single batch and set once, avoiding N Svelte re-renders during startup.
- **Smaller initial bundle** — Mermaid, KaTeX, and highlight.js are now loaded on demand instead of being bundled into the startup JS. This reduces parse/compile time before the app can dismiss the splash screen.
- **Non-blocking local image embedding** — `render_preview` now reads local image files asynchronously, so heavy image-heavy documents don't block the Tauri runtime.
- **Backend render timing logs** — Added `[render_preview]` timing logs to pinpoint which phase (parse / HTML render / image embed) is slow.


## [0.8.60] - 2026-07-07

### Fixed
- **No more freeze when switching view modes** — The editor and preview panes are now kept mounted and shown/hidden with CSS. Toggling between Split, Editor-only, and Preview-only no longer destroys and recreates CodeMirror or the preview, eliminating the per-switch hang.
- **Shorter startup freeze** — The heavy workspace (sidebar, editor, and preview) is not rendered until session restore finishes. This stops CodeMirror and the outline from doing expensive work while the splash screen is still visible.

### Changed
- Removed the unused recursive `list_workspace_files` backend command.


## [0.8.59] - 2026-07-06

### Fixed
- **File tree no longer opens non-Markdown files** — Double-clicking a non-Markdown file (e.g. a PowerShell script) in the workspace explorer is now ignored instead of being loaded into the editor. This prevents the UI from freezing or flashing white when binary / large non-Markdown files are selected.
- **Preview no longer re-renders on view-mode switches** — Switching between Split, Editor-only, and Preview-only modes no longer remounts the preview pane and re-runs the full Markdown render pipeline. A shared, LRU preview cache now survives remounts, so toggling view modes is instant.
- **Shared preview cache** — Rendered preview HTML is cached across PreviewPane instances and reused when the same document content is shown again.


## [0.8.58] - 2026-07-06

### Fixed
- **Faster session restore** — Restored file tabs are now read in parallel instead of sequentially, and the per-tab workspace sync / file-watcher setup is skipped during restore. The workspace tree and open-files watcher are initialized once after all tabs are restored. This noticeably reduces the time the splash screen stays up when reopening many files.
- **Fewer redundant disk writes during startup** — Tab creation during session restore no longer triggers a session save for every tab; the session is persisted once at the end of restore.


## [0.8.57] - 2026-07-06

### Fixed
- **Eliminated welcome tab flash on startup** — The splash screen now stays up and the preview pane skips rendering until session restore and any pending OS file open have completed. This removes the "Loading preview → welcome → files" sequence when restoring previous tabs.
- **Deferred startup UI work** — Added a `startupComplete` store so heavy UI effects don't run against the transient default welcome tab while the app is still restoring its session.


## [0.8.56] - 2026-07-06

### Fixed
- **Reduced startup UI freeze** — Preview post-processing (heading anchors, KaTeX math, Mermaid diagrams, and syntax highlighting) now runs in `requestAnimationFrame` chunks instead of all in one synchronous tick. This keeps the app responsive while the welcome page or a large document renders.
- **Faster first preview paint** — Lowered the preview render debounce from 150 ms to 50 ms so the preview pane updates sooner after the active document changes.

### Added
- **Preview render timing logs** — Added `[preview-render]` timing logs to the browser console to help diagnose where remaining render time is spent.


## [0.8.55] - 2026-07-06

### Added
- **Open Markdown files with MarkZ** — MarkZ now registers as an editor for `.md`, `.markdown`, `.mdx`, and `.mdown` files on Windows, macOS, and Linux. Double-clicking a Markdown file launches MarkZ and opens the file in a new tab.
- **Suggested app for Markdown files** — On platforms that support file associations, MarkZ appears as a suggested application for opening Markdown files.
- **Single-instance file open** — If MarkZ is already running, opening another Markdown file reuses the existing window and adds the file as a new tab instead of launching a second instance.

### Fixed
- **File tree / tab synchronization for OS-opened files** — Files opened from the OS (via file association or "Open With") now correctly re-root the file tree to the file's parent directory, keeping the tree and active tab in sync.

### Added
- **File association end-to-end tests** — Added Playwright coverage for both cold-start file open (file passed at launch) and warm file open (file opened while the app is running).


## [0.8.54] - 2026-07-06

### Added
- **Copy as Word (Pandoc)** — The preview pane's Copy dropdown now offers a "Copy as Word (Pandoc)" option when Pandoc is installed. It converts the active Markdown document through Pandoc to HTML and copies it to the clipboard as `text/html` (with a plain-text fallback), so you can paste formatted content directly into Word without saving and opening a DOCX file first.


## [0.8.53] - 2026-07-06

### Fixed
- **File tree follows the active tab** — The workspace explorer now mirrors the directory of the active editor tab. New untitled tabs show the empty "No folder open" state, and saving, opening, or switching files re-roots the tree to that file's parent directory. This restores synchronization between the editor and the file tree.


## [0.8.52] - 2026-06-17

### Fixed
- **Clicking an already-open file in the tree no longer duplicates the tab** — The file tree and search results now focus the existing tab when you select a file that's already open, instead of opening a second copy. Matches the behavior of VS Code / Sublime.


## [0.8.51] - 2026-06-16

### Fixed
- **File tree no longer follows the active document** — The workspace explorer is now a stable, user-controlled view (like VS Code / Sublime). Switching tabs, opening a file from a different folder, or closing all file tabs no longer re-roots or clears the tree. Previously the tree hijacked to the parent folder of whichever file was active, making it impossible to browse one folder while editing a file from another.
- **Opening a file no longer forces a folder open** — `Ctrl+O` / recent files / command palette now just open the file in a tab. The tree stays on whatever root you opened (or shows its empty state if none). The editor was never folder-gated, but the auto-follow made it feel that way.

### Changed
- **File tree shows all files** — The explorer now lists every file (any extension), not only `.md`/`.mdx`/`.markdown`. Hidden entries and common heavy directories (`node_modules`, `target`, `dist`, `build`, `.git`, `__pycache__`, `.venv`, etc.) are skipped, and empty directories are now shown.
- **Breadcrumb navigation in the file tree** — The folder-name header is replaced by a clickable path breadcrumb; click any ancestor to re-root the explorer up the directory tree. An always-available Open Folder button sits beside it.
- **Removed "Auto-open folder" setting** — The setting only ever controlled the now-removed tree-follows-file behaviour, so it has been removed from Settings → Editor, the config schema, and the type definitions. Saved settings containing the old key are ignored gracefully.

### Added
- **E2E coverage for the file tree** — New tests assert the tree stays stable across tab switches and cross-folder file opens, persists when file tabs close, supports direct file open with no folder, breadcrumb re-rooting, and non-markdown file visibility. Brittle index-based settings-checkbox selectors were also hardened to label-based selectors.


## [0.8.50] - 2026-06-15

### Fixed
- **JIRA multi-paragraph blockquote merging** — Multiple blocks inside a blockquote (e.g., two paragraphs) now render with blank `bq.` separator lines between them, preventing JIRA from merging them into a single paragraph.
- **JIRA WikiLink rendering** — WikiLinks no longer append `.md` extension, rendering as `[display|target]` instead of `[display|target.md]`.
- **GitHub nested list indentation** — Fixed child list item indentation to match the parent prefix length (2 spaces for `- `, 3 spaces for `1. `), aligning content correctly with the first character after the list marker.
- **Confluence task list checkboxes** — Task list items now render `[x]` / `[ ]` markers inside `<li>` elements.
- **Confluence table alignment** — Table cell alignment (`left`, `center`, `right`) now emits `style="text-align: ..."` attributes on `<th>` and `<td>`.
- **Confluence footnote definitions** — Footnote definitions now wrap in `<sup id="fn-{label}">` for proper referencing.

### Added
- **Converter integration tests** — 54 end-to-end tests covering the full markdown→parse→convert pipeline for all 4 formats (JIRA, Confluence, GitHub, Slack). Tests cover headings, formatting, code blocks, lists, nested lists, blockquotes, tables, images, links, and edge cases.
- **Unit test coverage** — 16 new unit tests across converters: nested lists, task lists, table alignment, footnotes, multi-paragraph blockquotes, WikiLinks, complex documents, and empty input.
- **Slide break mode initial state** — `slideBreaksEnabled` is now passed explicitly to the editor. The gutter is hidden on app launch and only appears when the user explicitly enables slide break editing, giving the feature the intended 2-state behaviour (hidden vs. enabled with breakpoints rendered).
- **Slide break auto-detection** — When slide break mode is enabled for the first time on a tab, H1/H2/`---` boundaries are auto-detected and rendered as gutter markers. Previously the gutter was visible on launch but no breakpoints were rendered.

### Changed
- **EditorConfig API** — Added optional `slideBreaksEnabled` flag to `EditorConfig`. The editor no longer infers slide-break visibility from the presence of the `onSlideBreakToggle` callback.


## [0.8.49] - 2026-06-11

### Added
- **8 new WGSN 2026 Dark Colour Palette themes** — Curated dark themes based on the WGSN 2026 colour trend report:
  - **Cosmic** — Deep space blues & purples (Future Dusk, Midnight Blue, Basalt)
  - **Supernatural** — Mystical darks with vivid accents (Deep Emerald, Plum Berry, Mystic Green, Electric Indigo)
  - **Restorative** — Calming forest & earth tones (Ground Coffee, Wild Green, Midnight Plum)
  - **Hedonistic** — Opulent deep reds & purples (Cherry Lacquer, Punk Purple, Neon Flare)
  - **Luxurious** — Sophisticated warm darks with caramel & indigo accents
  - **Ancient** — Earthy terracotta, olive & ochre (Intense Rust, Dark Olive, Sepia)
  - **Subversive** — Bold rebellious reds against deep dark (Cranberry Juice, Cherry Lacquer)
  - **Noir** — Pure sophisticated black with silver chrome accents
  - Each theme includes full syntax highlighting, accent scales, status colours, and slide-break tokens
  - Themes are selectable from Settings → General → Color Preset alongside the existing 8 presets

### Changed
- **Settings search** — Updated search keywords to include all new theme names
- **E2E coverage** — Updated preset card count (9 → 17) and added WGSN preset activation test

## [0.8.48] - 2026-06-11

### Fixed
- **Scroll sync out of sync** — Restored ratio-sync fallback after heading sync when the heading is already aligned. The v0.8.47 "never fall through" change prevented the preview from following the editor past a heading anchor, causing the two panes to drift apart (e.g., editor at bottom, preview stuck mid-document).
- **`syncByRatio` target height bug** — Fixed a typo where `targetMax` was computed with `source.clientHeight` instead of `target.clientHeight`. This caused ratio-synced scroll positions to be wrong whenever the editor and preview had different visible heights, making it impossible to scroll the preview to its true bottom.

### Changed
- **scrollSync tests** — Updated the "already aligned" test to expect ratio fallthrough, and added a regression test verifying ratio sync uses the correct `target.clientHeight`.

## [0.8.47] - 2026-06-11

### Fixed
- **Editor scroll flickering** — Fixed heading-based sync fighting with ratio-based fallback. When a heading anchor was found but the preview was already within 5 px of it, the code fell through to ratio sync, causing the preview to oscillate between heading position and ratio position during fast scrolling. Heading sync now always returns after handling (or deciding no scroll is needed), never mixing with ratio sync.
- **Scroll lock grace period** — Increased from 50 ms to 150 ms to give browsers more time to deliver coalesced/deferred scroll events before clearing the lock.

### Changed
- **scrollSync robustness** — Added unit test verifying heading sync does not fall through to ratio sync when already aligned.

## [0.8.46] - 2026-06-11

### Fixed
- **Editor scroll jumping** — Replaced the `requestAnimationFrame`-based `programmaticScroll` boolean lock with a source-based lock (`activeSource: 'editor' | 'preview' | null`) and a 50 ms grace period. This eliminates feedback loops caused by coalesced or deferred scroll events during fast trackpad/mousewheel scrolling in the editor pane.

### Changed
- **scrollSync robustness** — Added unit test verifying reverse sync resumes correctly after the grace period expires.

## [0.8.45] - 2026-06-10

### Added
- **Theme Presets** — 8 curated color palettes selectable from Settings → General → Color Preset.
  - Nord, Dracula, Tokyo Night, Gruvbox Dark, Gruvbox Light, Solarized Dark, Solarized Light, High Contrast
  - Each card shows a live 4-color preview strip
  - 3-column compact grid layout
  - Click to apply immediately; selected state shows checkmark
- **Preset persistence** — Selected preset is saved to settings and restored on app launch
- **Theme toggle integration** — Clicking the title bar sun/moon button discards the active preset and reverts to the default palette

### Changed
- **Settings UI** — Replaced Color Preset dropdown with card-based grid selection

### Fixed
- **TitleBar Toast import** — Added missing `import Toast from "..."` that caused runtime `ReferenceError: Toast is not defined`
- **Rust Settings struct** — Removed duplicate `debug_panel_*` fields

## [0.8.44] - 2026-06-10

### Added
- **Directory tree follows active file** — The workspace panel now auto-syncs to the parent folder of the currently active file tab. Switching tabs across different directories updates the tree; closing all file tabs clears it.
- **External file change detection** — Files modified outside MarkZ trigger a confirmation dialog. Confirming reloads the latest content via the file watcher.
- **E2E coverage** — Added tests for directory tree sync and external file change prompts.

### Fixed
- **Newly opened files no longer marked dirty immediately** — Removed `isDirty: content ? true : false` from `newTab()` so opening an existing file starts in a clean state.
- **Closing non-dirty file tabs no longer prompts to save** — Closing a file that hasn't been edited skips the confirmation dialog.
- **Editor `suppressChange` guard** — Programmatic content swaps (tab switches) no longer incorrectly re-mark tabs as dirty.
- **Self-triggered save events ignored** — Added `recentlySavedPaths` with 2-second TTL to prevent the file watcher from prompting reload after the app's own save operation.
- **Rust warnings** — Removed unused `HashSet` import in `watcher.rs` and unused `read_file_text` in `workspace.rs`.
- **App.svelte event handler scope** — Fixed `handleOpenGitDiff`, `handleWorkspaceChanged`, `removeShortcuts`, `handleToggleSidebar`, and `handleSettingsChanged` reference errors in the cleanup function.
- **E2E mock injection reliability** — Replaced broken 22KB string-based `addInitScript` with a `new Function()` approach that correctly serializes large inline data via `Function.prototype.toString()`. Fixes all tests that rely on `invoke()` during page load (app preview, presentation mode, session restore).


## [0.8.43] - 2026-06-04

### Added
- **Debug Log Panel** — Collapsible bottom panel (like VS Code's terminal) showing operational logs for all app activity. Toggle with `Ctrl+Shift+Y` or via Command Palette.
  - **Resizable height** with drag handle
  - **Level filtering** — Trace / Debug / Info / Warn / Error tabs
  - **Error badge** — Shows unread warning/error count when collapsed
  - **Ring buffer** — 500 entries max, auto-evicts oldest
  - **Persisted state** — Collapsed/expanded, height, and filter level saved to settings
  - **Instrumented operations** — All exports (DOCX, Pandoc, Print), file open/save, workspace load/refresh/search, and copy-to-clipboard operations log start/end/failure
  - **Global error capture** — Unhandled exceptions and promise rejections are automatically logged
- **Command Palette** — New "Toggle Debug Panel" command for discoverability

### Changed
- **Keyboard shortcuts** — Added `Ctrl+Shift+Y` (macOS: `Cmd+Shift+Y`) to toggle the debug panel

## [0.8.42] - 2026-06-04

### Fixed
+- **Broken app styles** — Moved `settings-shared.css` import from `<style>` block to `<script>` block in SettingsModal.svelte. The CSS `@import` inside a Svelte `<style>` was causing Vite to mishandle the global CSS bundle, which broke theme tokens and preview/editor styling across the entire app.
+- **Preview slide break marker styles** — Wrapped slide break marker CSS selectors in `:global()` so styles actually apply to dynamically-created DOM elements. Fixed badge text color from hardcoded white to `var(--text-inverse)` for proper theme adaptation.
+- **Preview slide break positioning** — Replaced crude total-lines ratio heuristic with a text-matching algorithm that finds the correct preview DOM element for each break line by comparing rendered text content. Falls back to non-empty line counting for accuracy. Break markers now align correctly with the source line they were placed on.

### Changed
+- **Slide break colors** — Switched to clearer red/green semantics:
  - End (top half): `#b05a5a` light / `#d48888` dark
  - Start (bottom half): `#4a8a5a` light / `#7ec494` dark
+- **Gutter marker readability** — Enlarged marker from 14×14 to 16×16px, increased number font from 7px/700 to 9px/800, switched text color to `var(--text-inverse)` for automatic light/dark adaptation.

### Fixed
+- **All 203 e2e tests passing.**

## [0.8.41] - 2026-06-04

### Changed
- **Slide break visual polish** — Redesigned gutter markers and preview lines for clearer start/end semantics:
  - **Gutter markers**: Replaced generic ▶ arrow with a split-color bookmark shape.
    Top half = warm amber (`--slide-break-end`) signalling "slide ends here".
    Bottom half = cool teal (`--slide-break-start`) signalling "new slide starts here".
    White slide number centred on the marker. Hover tooltip explains the boundary.
    Inactive lines show a faint square that highlights on hover.
  - **Preview lines**: Replaced `slide 01` text with a subtle horizontal gradient
    line (warm → cool) plus a small rounded badge with the slide number.
    Much less visually intrusive while still clearly marking boundaries.
  - **Theme tokens**: Added `--slide-break-end`, `--slide-break-start`, and
    translucent background variants to both light and dark themes.

### Fixed
- **All 203 e2e tests passing.**


## [0.8.40] - 2026-06-04

### Changed
- **SettingsModal refactor** — Split the 1,595-line monolithic SettingsModal into a thin shell + 6 focused category components:
  - `GeneralSettings.svelte` — Appearance, Layout, Accessibility
  - `EditorSettings.svelte` — Font, Editor behavior, Custom Dictionary
  - `PreviewSettings.svelte` — Preview font, max width, embed images
  - `ShortcutsSettings.svelte` — Keyboard shortcuts reference
  - `AdvancedSettings.svelte` — Custom CSS, TTS, Auto Save, Export/Pandoc
  - `AboutSettings.svelte` — Version, updates, credits, tech badges
  - Shared styles extracted to `settings-shared.css` (scoped to `.settings-modal`)
  - Shared types extracted to `src/lib/settingsTypes.ts` (`AppSettings` interface)
  - Shell handles modal structure, sidebar nav, search, save/cancel, loading state
  - No user-visible behavior change; all DOM selectors preserved for e2e compatibility

### Fixed
- **All 203 e2e tests passing.**


## [0.8.39] - 2026-06-04

### Added
- **Draggable tabs** — Drag-and-drop reordering within pinned/unpinned groups. Visual feedback (dimmed dragged tab, accent drop indicator). Cross-group drag prevention. Order persists in session storage.
- **Slide Break Editor** — Visual gutter markers (like breakpoints) to manually define presentation slide boundaries. Auto-detects H1/H2/`---` boundaries on first toggle. Click to toggle breaks. Preview pane shows faint dotted boundary lines with `slide 01`, `slide 02` labels while in break mode. Breaks persist per-tab in session storage. No special markdown syntax required.
- **Command Palette expansion** — New commands: Toggle Slide Break Mode, New from Template, Save as Template, Copy as JIRA, Copy as Confluence, Copy as Slack, Copy as GitHub, Copy as HTML. Fixed missing `X` icon for Close Tab command.

### Changed
- **About section redesign** — Compact layout that fits without scrolling. Removed features list. Added GitHub link. Minimalist update row (status + compact action button). Streamlined tech badges and credits.

### Fixed
- **Settings button `data-testid`** — Added `data-testid="settings-button"` to TitleBar settings button, fixing silently-failing screenshot-capture e2e test.
- **All 203 e2e tests passing.**


## [0.8.12] - 2026-06-02

### Fixed
- **Mouse wheel scroll does nothing / keyboard scrolls whole UI** — Added `overscroll-behavior: contain` to all scroll containers to prevent scroll chaining to the document body. Removed editor empty-state overlay that blocked CodeMirror focus. Editor always renders for immediate click-to-type.
- **Preview shows stale content from first document** — Preview render cache is now cleared on tab switch (path change) instead of only keyed by content string. Added 10s timeout to render invoke to prevent loading bar hangs.
- **189 passing e2e tests** — 9 new dedicated scroll tests verify overflow CSS, arrow key page-scroll prevention, tab key safety, and multi-tab editing independence.

## [0.8.11] - 2026-06-02

### Fixed
- **Scroll not working / UI scrolls up on keyboard navigation** — Removed competing editor empty-state overlay that blocked CodeMirror from receiving focus. The editor container is now always rendered so CodeMirror is always initialized and reachable. Empty tabs show a decorative non-blocking hint instead of an overlay.
- **Preview loading bar never finishes** — Added 10-second timeout to the Rust `render_preview` invoke call so the spinner doesn't hang forever if the backend stalls.
- **contentZoomStore increment/decrement crash** — Replaced broken one-shot subscribe hack with Svelte's `get()` function.
- **Split pane divider integrity after tab operations** — 4 new tests verify divider remains visible and properly sized after creating/closing tabs.

## [0.8.10] - 2026-06-02

### Fixed
- **Updater not detecting new version** — Fixed `tauri.conf.json` version being stale at `0.8.8` when tag `v0.8.9` was pushed, causing the release build to report version 0.8.8 and the installed app to show "up-to-date".

## [0.8.9] - 2026-06-02

### Fixed
- **Scroll broken** — Removed non-passive window wheel handler that disabled Chromium compositor scrolling, causing mouse wheel to not scroll and keyboard to scroll the whole UI.
- **Closing last tab corrupts split pane** — Editor and preview containers are now always rendered; EmptyState overlays instead of removing DOM elements, keeping the divider and layout intact.
- **Split pane divider asymmetry** — Removed `flex: 1` from the right pane so both sides respect the split ratio equally.
- **Emoji/icons in filenames show as boxes** — Added explicit emoji font fallback (`MarkZEmoji`, `Segoe UI Emoji`, `Apple Color Emoji`, `Noto Color Emoji`) to TitleBar breadcrumb and document title.
- **Session restore crash on upgrade** — Added `#[serde(default)]` to `SessionTab.pinned` so old session files without the field don't fail deserialization.
- **26 failing E2E tests** — Updated test selectors for restructured SettingsModal sidebar layout, workspace file tree button, and outline sidebar empty state.

## [0.8.8] - 2026-06-01

### Added
- **Vim keybindings** — Optional Vim mode in the editor via `@replit/codemirror-vim`. Toggle in Settings → Editor. Uses a Compartment for dynamic enable/disable without recreating the editor.
- **Pin tabs** — Right-click any tab → Pin/Unpin. Pinned tabs stay at the left with a pin icon, have no close button, survive Close All, and are skipped by `Ctrl+W` (closes next unpinned tab instead). Pin state persists in session restore.
- **Global workspace search** (`Ctrl+Shift+F`) — Search across all `.md`/`.mdx`/`.markdown` files in the workspace. Results show file path, line number, and context preview; click to open the file. Replace All reads each matched file, performs replacements, and saves back. Accessible via keyboard shortcut or Command Palette.
- **Command Palette** — "Search Workspace" command added.

### Changed
- **Settings Help tab** — Updated keyboard shortcuts list to include `F5` (Presentation Mode) and `Ctrl+Shift+F` (Search Workspace).
- **README** — Updated feature list to include Command Palette, Quick Open, Vim mode, Pin Tabs, Vertical Split, Custom Spellcheck Dictionary, Presentation Mode, Smart List Continuation, Auto-Pair Delimiters, and Global Workspace Search.
- **Marketing site** — Added feature cards for Presentation Mode, Command Palette & Quick Open, Vim Keybindings, Pin Tabs, and Global Workspace Search.
- **ROADMAP** — Marked Vim keybindings, Global find/replace, and Pin tabs as completed.

## [0.8.7] - 2026-06-01

### Added
- **Vertical split layout** - Toggle between horizontal (side-by-side) and vertical (stacked) editor/preview split. Quick-toggle button in the status bar and a dropdown in Settings -> Layout.
- **Custom spellcheck dictionary** - Manage per-user words in Settings -> Editor (textarea + chip list). Right-click any word in the editor to add it to the dictionary, suppressing browser red underlines.
- **Auto-open folder** - Automatically open the parent folder in workspace mode when opening, saving, or restoring a file. Controlled by `auto_open_folder` setting (default: true).

### Fixed
- **Sidebar panels fail to open in windowed mode** - Activity bar clicks were immediately overridden by an auto-collapse `$effect` when `windowWidth < 1200px`. Fixed by setting `userToggledSidebar = true` on activity bar clicks.
- **Scroll ghosting in preview** - Replaced JS-driven `renderProgress` state updates (every 50ms) with a pure CSS shimmer animation. Added `contain: paint` to `.preview-scroller` for compositing isolation.
- **Preview DOM nesting** - Restored correct tag hierarchy after `{#key}` removal. The `.toolbar-actions` div was never closed, making `.preview-scroller` a child of the toolbar.
- **TTS button styling** - Removed dark bordered container around TTS controls; buttons now sit inline.
- **App freeze during image paste/drop** - Replaced `Array.from(new Uint8Array(...))` with `new Uint8Array(...)` to avoid JSON-serializing millions of integers over Tauri IPC.

## [0.8.6] - 2026-05-31

### Added
- **Presentation Mode** � Convert Markdown documents into slide decks with `F5` or the new preview toolbar button. Heading-based slide boundaries (H1 = section, H2 = slide), thematic break separators, and five slide types: Title, Section, Content, Code, and Image. Navigate with arrow keys, space, Home/End, or on-screen controls. Touch swipe support on mobile.
- **Preview toolbar presentation button** � Start presentation mode directly from the preview pane, next to TTS controls.
- **Settings modal search** � Filter settings sections with a real-time search input at the top of the Settings modal.
- **Tab bar overflow handling** � Horizontal scroll arrows and mouse wheel support for when many tabs are open.
- **Smart list continuation** � Press Enter on a list item to continue the list (`-`, `*`, `1.`). Press Enter on an empty list line to exit the list.
- **Auto-pair standard delimiters** — CodeMirror `closeBrackets` is enabled, so `[`, `(`, `{`, `"`, `'` auto-insert their closing pair. Markdown-specific delimiters (`*`, `_`, `` ` ``) are not yet configured.
- **Preview inline search (partial)** — Search helper functions and match-highlighting logic added to `PreviewPane.svelte`, but the search UI is not yet rendered and `Ctrl+F` in the preview pane is not yet wired to open it.
- **Click-to-toggle checkboxes** � Click a task list checkbox in the preview to toggle the corresponding `- [ ]` / `- [x]` in the editor source.
- **Focus traps (partial)** — `focusTrap.ts` helper added and applied to the global search panel (`SearchPanel.svelte`). `CommandPalette`, `TemplateBrowser`, `TableEditorModal`, `SettingsModal`, `SaveTemplateDialog`, and `GitDiffModal` import or handle Escape/click-outside but do not yet apply `use:trapFocus`.
- **Export progress indicators** � Title bar shows a breadcrumb path derived from the active document. Export operations show a consistent "Exporting�" toast.
- **CodeMirror search panel theming** � Find/Replace panel styled to match the app's design system tokens.

### Fixed
- **Presentation empty slides** � Thematic breaks (`---`) no longer produce single-line `<hr>`-only slides. Consecutive breaks are collapsed; breaks are stripped from slide content entirely.

## [0.8.5] - 2026-05-30

### Added
- **Tab context menu** — Right-click any tab to open a context menu with Close, Close Others, and Close All options. Closing all tabs opens a fresh empty untitled tab.

### Fixed
- **E2E test suite (CI)** — Fixed 25 failing tests on GitHub Actions Linux headless:
  - Added `plugin:dialog|message` mock handler (used internally by `@tauri-apps/plugin-dialog` `confirm()`)
  - Rewrote sidebar-preview format-tab tests for the new Copy dropdown UI
  - Fixed zoom badge selectors to target inner `<span>` (avoids SVG whitespace in `toHaveText`)
  - Added `page.click('.app')` before keyboard shortcuts to ensure focus in headless CI
  - Fixed save-indicator test (component has no `saved` class, only `unsaved` when dirty)
  - Updated settings help-tab shortcut count 13 → 14

## [0.8.4] - 2026-05-29

### Fixed
- **E2E test suite** — Fixed systemic mock script syntax error (`tauri-mock.ts`) that caused `window.__TAURI_INTERNALS__` to never be set, breaking all `invoke()` calls in tests. Fixed `search_workspace` function declaration and `load_session` closing brace. Fixed statusbar word/char count tests to parse numbers from badge text. Skipped Ctrl+W keyboard shortcut test (Playwright intercepts browser shortcut).
- **Version consistency** — `tauri.conf.json` version now matches workspace version (`0.8.4`).

## [0.8.3] - 2026-05-29

### Changed
- **Marketing site overhaul** — Replaced CSS-drawn app mockup with real Playwright-captured screenshots in `site/index.html`. Added screenshot gallery with tab switching. Fixed text alignment and download card link colors. Updated feature grid with missing capabilities.

## [0.8.2] - 2026-05-29

### Fixed
- **Table editor dark mode readability** — All hardcoded light-mode colors and non-existent CSS variables (`--bg-primary`, `--bg-secondary`) replaced with proper design-system tokens (`--bg-surface`, `--bg-elevated`, `--text-primary`, `--accent-muted`, `--error`). Modal is now fully readable in dark mode.

## [0.8.1] - 2026-05-29

### Added
- **Session workspace restore** — Previously opened workspace folder is now persisted in `session.json` and restored on app launch alongside tabs.
- **File watcher** — `notify = "7"` integration auto-refreshes the workspace file tree on external changes (create, delete, rename) with 500ms debounce.

### Fixed
- **Svelte 5 production prop bug** — Activity bar buttons were unresponsive in release builds due to a known Svelte 5 issue where destructured callback props in `$props()` lose binding. Fixed by accessing props through the `$props()` object directly.

## [0.8.0] - 2026-05-29

### Added
- **Workspace / folder mode** — Open any folder via the activity bar or `Ctrl+Shift+O`. Browse the recursive file tree, expand/collapse directories, and open markdown files. Project-wide search greps across all `.md` files with line-numbered results.
- **VS Code-style activity bar** — Three icon buttons on the far left: Files, Outline, Links. Click to open a panel; click again to collapse. `Ctrl+B` toggles the entire panel.
- **Sidebar decoupled from `show_outline` setting** — `show_outline` no longer hides the entire sidebar. The checkbox is removed from Settings; sidebar visibility is controlled via the activity bar.
- **Distinct TitleBar icons** — Open File (`File`), Open Folder (`FolderOpen`), and New File (`FilePlus`) now use clearly different Lucide icons.

### Changed
- **Sidebar panels collapsed by default** — Activity bar is visible on launch, but no panel content is shown until the user clicks an icon.

### Fixed
- **Missing `viewMode` declaration** — `viewMode` $state was accidentally deleted during a cleanup edit, causing `ReferenceError` on app mount (splash screen freeze).

# Changelog

All notable changes to MarkZ are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-05-28

### Added
- **Git status indicator** — Status bar shows current branch name and a dot when the file is modified. Uses `git2` crate. Gracefully disappears for files outside a repository.
- **Pandoc integration** — Auto-detects if Pandoc is installed. "Export via Pandoc" submenu in the TitleBar supports Word (DOCX), PDF, HTML, and EPUB formats. Falls back to native converter if Pandoc is unavailable.
- **Print to PDF** — Prints only the preview content via a hidden iframe, excluding all app UI chrome. Forces light-theme colors for readability regardless of app theme. Preserves spacing, headings, code blocks, and multi-page pagination.

### Fixed
- **Print: UI chrome in output** — `window.print()` on main window captured title bar, sidebar, editor, menus. Fixed by printing from a hidden iframe containing only the preview content.
- **Print: missing spacing** — CSS spacing rules are scoped under `.preview-content`. Fixed by wrapping iframe content in `div.preview-content`.
- **Print: dark-mode grey text** — Dark theme sets `--text-primary` to light grey which was barely visible on white paper. Fixed by forcing explicit light-theme color variables in the print iframe.
- **Print: single-page truncation** — `position: fixed` + `height: 100%` constrained content to one viewport. Fixed with `position: absolute`, `min-height: 100%`, and `overflow: visible`.
- **Print: ReferenceError for fontSize** — `fontSize` variable was used but not declared after a prior refactor. Fixed by adding `const fontSize = contentDiv.style.fontSize;`.


## [0.6.0] - 2026-05-28
### Added
- **Footnotes** — GitHub-flavored footnotes (`[^1]`) render as collected endnotes in the preview pane.
- **WikiLinks + backlinks panel** — `[[Page Name]]` syntax links to other markdown files in the workspace. A backlinks sidebar panel lists incoming links.
- **Auto-save** — Configurable interval (default 30s). Auto-saves only when the document has a path; untitled tabs are skipped.
- **Snippets** — Insert common Markdown constructs (table, code block, frontmatter, mermaid, etc.) via the editor toolbar or keyboard shortcuts.
- **Scroll sync fix** — Replaced fragile dual-lock approach with a single shared `programmaticScroll` flag. Fixed `editorInstance` typo.
- **Inline table editing** — Double-click any table in the preview pane to open a modal spreadsheet editor. Supports add/remove rows and columns, markdown generation on apply.
- **Markdown lint + spellcheck** — Optional real-time linting and spellcheck via CodeMirror 6 extensions.
- **Tests** — Vitest unit tests for `docxPrep`, `sessionStore`, `scrollSync`, `tableEditor`, `snippetStore`.
- **CI E2E job** — GitHub Actions runs Playwright E2E tests on every push/PR.
- **`lib.rs` split** — Refactored from a single 1,400-line file into 8 focused command modules under `src-tauri/src/commands/`.

## [0.5.2] - 2026-05-27
### Fixed
- **DOCX export** — Code blocks and backtick-enclosed inline content were being replaced with base64 image data. Root cause: `docxPrep.ts` was prepending `data:image/png;base64,` to the raw base64 payload, and the DOCX library interpreted the resulting string as a raw image buffer. Fixed by stripping the prefix before creating the `Image` object.

## [0.5.1] - 2026-05-27
### Fixed
- **First public release** — Initial Tauri build with dual-pane Markdown editor, live HTML preview, JIRA / Confluence / Slack / GitHub converters, DOCX export, and dark mode.

## [0.5.0] - 2026-05-27
### Added
- **Initial release** — First public version.

## [0.1.0] - 2026-05-26
### Added
- **Project scaffolding** — Tauri + Svelte 5 + CodeMirror 6 workspace.

## [Unreleased]
### Planned
- Vim keybindings via `@replit/codemirror-vim`
- Draggable tabs
- Split editor (horizontal/vertical)
- Plugin system
