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
- **Auto-pair markdown delimiters** � Typing `*`, `` ` ``, `[`, `(`, `{`, `"`, `'` auto-inserts the closing pair via CodeMirror `closeBrackets`.
- **Preview inline search** � `Ctrl+F` in the preview pane opens a search bar with previous/next navigation and match highlighting.
- **Click-to-toggle checkboxes** � Click a task list checkbox in the preview to toggle the corresponding `- [ ]` / `- [x]` in the editor source.
- **Focus traps in all modals** � Tab cycling is now constrained within Settings, Templates, Command Palette, and Table Editor modals. Escape closes; first focusable element is auto-focused on open.
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
