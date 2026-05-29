## [0.8.1] - 2026-05-29
### Added
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


- **WikiLinks `[[Target]]` and `[[Target|Display]]`** — Internal document linking with automatic backlink discovery. Post-processed on the AST after parsing to correctly handle pulldown-cmark's event splitting.
- **Backlinks panel** — New "Links" tab in the sidebar showing outgoing WikiLinks and incoming backlinks for the current document. Click any link to open it. Backend scans the document directory for `[[CurrentDoc]]` references.
- **Full footnote support** — `ENABLE_FOOTNOTES` enabled in parser. Footnote definitions are collected at the end of the HTML preview in an ordered list. Supported across all 5 converters (JIRA, Confluence, Slack, GitHub, DOCX) and in the TOC and stats modules.
- **Auto-save** — Debounced timer in `tabStore` saves dirty tabs automatically. Interval and on/off toggle configurable in Settings and persisted across sessions.
- **Text snippets / expansion** — 8 built-in snippets (`rfc`, `adr`, `todo`, `link`, `img`, `code`, `table`, `frontmatter`) with tab-stop support (`$1`, `${1:default}`). Triggered by typing the keyword and pressing `Tab`.
- **Heading-anchor scroll sync** — Editor-to-preview sync now scrolls to the nearest heading above the viewport instead of using scroll ratio. Falls back to ratio-based sync for documents without headings.
- **Inline table editing** — Double-click any table in the preview to open a grid editor. Add/remove rows and columns, edit cell content, set alignment. Changes are serialized back to markdown pipe-table syntax.
- **Markdown lint + spellcheck** — CodeMirror linter extension checks for trailing whitespace, empty links, missing alt text, unclosed code blocks, heading level jumps, and duplicate headings. Browser native spellcheck enabled via `spellcheckFacet`.
- **Document statistics** — Rust `markz_core::stats` module computes words, characters, sentences, paragraphs, reading time (200 WPM), Flesch Reading Ease, and Flesch-Kincaid Grade Level. Shown in the status bar.
- **Custom CSS themes** — Users can paste custom CSS in Settings; injected as a dynamic `<style>` block on app load and settings change.
- **Frontmatter parsing** — YAML and TOML frontmatter parsed into structured metadata using `serde_yaml` and `toml`.
- **Find & Replace** — `Ctrl+H` opens CodeMirror's built-in find/replace panel.
- **LRU preview cache** — Replaced unbounded Map with proper LRU (max 10 entries).
- **E2E DOCX export test** — Playwright test verifies the export command is invoked without error.
- **CI E2E job** — GitHub Actions now runs Playwright tests with `xvfb-run`.

### Changed
- **Single source of truth refactor** — Eliminated `documentStore`. `tabStore` is now the sole source of truth for document state. All consumers (`App.svelte`, `EditorPane`, `PreviewPane`, `keyboard.ts`, `sessionStore`) updated to use `$derived(tabStore.activeTab)`.
- **Command module split** — `lib.rs` reduced from 580 lines to 198 lines. Commands extracted into 8 focused modules: `documents`, `convert`, `settings`, `tts`, `session`, `templates`, `logging`, `backlinks`.
- **Scroll sync lock fix** — Replaced dual-lock approach with a single shared `programmaticScroll` flag to prevent bidirectional feedback loops causing scroll jumps.

### Fixed
- **Missing closing quotes in footnote HTML** — `FootnoteReference` and `FootnoteDefinition` rendering were missing `"` after `href` and `id` attribute values.
- **Splash screen freeze** — `${TODAY}` unescaped in `snippetStore.ts` template literal caused `ReferenceError` at module load. Fixed by escaping to `\${TODAY}`.
- **markdownLinter runtime crash** — `import { type EditorView }` was stripped at compile time, causing `ReferenceError` when `EditorView.contentAttributes.of()` was called. Fixed by importing `EditorView` as a value.
- **editorInstance typo in scroll handler** — `EditorPane.svelte` used undefined `editorInstance` instead of `editorView`, causing scroll sync to never fire.
- **PreviewPane self-referencing scroll sync** — Called `syncByHeading(view, previewDiv)` from the preview's own scroll handler, creating a feedback loop. Now uses ratio-based `sync(preview, editorScroller)`.
- **DOCX export code block corruption** (0.5.2) — Code blocks and inline backtick content were replaced with base64 image data due to math regexes not respecting code boundaries.

## [0.5.2] - 2026-05-28

### Fixed
- **DOCX export no longer corrupts code blocks and inline code as images** — `prepareMarkdownForDocx` now respects markdown code boundaries when scanning for math expressions. Fenced code blocks and inline code spans are extracted before math regexes run, preventing `$$` inside bash blocks and `$var$` inside backticks from being replaced with rendered PNG data URLs. Inline math regex is now line-bound so it cannot span multiple lines. Also fixed a `String.prototype.replaceAll` `$$` interpolation bug that silently corrupted restored code blocks.

## [0.5.1] - 2026-05-27

### Added
- **Full Session Restore** — All tabs (including untitled/unsaved) are now persisted to disk and restored on app launch. File-backed tabs are re-read from disk; untitled tabs are recreated with their saved content and dirty state.
  - Session is stored in the app's config directory (`session.json`) via new Tauri commands `save_session`, `load_session`, `clear_session_disk`.
  - `sessionStore.ts` rewritten to use async Tauri invoke instead of `localStorage`.
  - `tabStore.ts` — `persistSession()` now saves full tab state (content, title, dirty flag). `restoreSession()` recreates untitled tabs directly without file I/O.

### Fixed
- **Math preprocessing no longer treats PowerShell/code variables as inline math** — `$legacy`, `$LastExitCode`, `$root\Inputs\DataDict.dbf` and similar are now preserved as literals. The heuristic distinguishes math expressions (containing digits, braces, `+`, `^`, etc.) from simple variable references and assignment patterns.
  - Backtick-aware inline math processing: math inside `` `code` `` is skipped.

## [0.5.0] - 2026-05-27

### Added
- **Session Restore** — Documents that were open when the app was last closed are automatically reopened on the next launch, with the previously active tab restored. Works like SublimeText: only file-backed tabs are persisted; untitled/unsaved tabs are not. Missing or unreadable files are skipped gracefully.
  - `sessionStore.ts` — Persists tab state (file paths only) to `localStorage`. Handles corruption, quota errors, and malformed data gracefully.
  - `tabStore.ts` — Added `persistSession()` called after every `newTab`, `closeTab`, and `switchTab`. Added `restoreSession()` that clears the default welcome tab, re-opens each file path, skips missing files, deduplicates paths, and re-activates the previously active tab.
  - `App.svelte` — On mount, checks for a saved session and triggers `restoreSession`.
- **Unit tests** (`vitest` + `jsdom`) — 9 tests for `sessionStore`: save/load, null-path filtering, deduplication, empty sessions, clearing, corrupted data, malformed shapes, quota errors.
- **E2E tests** — 6 tests for session restore: full reload restore, empty session fallback, missing-file skipping, session persistence, corrupted data handling, duplicate-path deduplication.
## [0.4.0] - 2026-05-22
### Added
- **Text to Speech (TTS)** — Dual-engine read-aloud with streaming synthesis
  - **Online (Edge)** — 322 natural voices via direct `ureq`/`tungstenite` + `native-tls` WebSocket to Microsoft's Edge Read Aloud API. No `rustls`/`aws-lc-rs` dependency.
  - **Local (Windows)** — Offline SAPI5 voices via WinRT `SpeechSynthesizer` (David, Zira, Hazel)
  - **Streaming playback** — Text is split into sentence-sized chunks; first chunk starts playing immediately while subsequent chunks are prefetched in the background. Eliminates the multi-second wait for large documents.
  - **XML-escaped SSML** — Special characters (`&`, `<`, `>`, `"`) are escaped before sending to Edge TTS, preventing WebSocket close errors on markdown with HTML entities or symbols.
  - **Settings persistence** — Engine, voice, and speed are saved to `settings.json` and restored on startup
  - **Settings panel UI** — New "Text to Speech" section in Settings with engine selector, voice dropdown, speed slider (0.5x–2.0x), and Test Voice button
  - **Preview toolbar** — Minimal Play/Pause/Resume/Stop controls in the HTML preview toolbar

### Changed
- **Removed redundant voice-list HTTP call** — `edge_tts_crate::synthesize()` no longer re-fetches the full voice list on every Play click. This alone cuts ~200–500ms off initial playback latency.

### Note
- Bi-directional preview editing (`contenteditable` → Markdown sync) is implemented but **hidden from the UI** pending further testing. The backend (`htmd` crate integration) and frontend logic remain intact.

## [0.3.5] - 2026-05-22

### Fixed
- **Table preview header styling** — Removed hardcoded `background-color:#f3f4f6` from inline table header styles that caused white-on-white header text in dark mode preview. Borders and padding are preserved for rich clipboard paste; background styling is left to the app's CSS/theme.

## [0.3.4] - 2026-05-22

### Fixed
- **Table borders in rich paste** — Tables now include inline `style` attributes (`border-collapse`, `border`, `padding`, `text-align`) on `<table>`, `<th>`, and `<td>` elements. This ensures visible borders and proper alignment when pasting into JIRA, Confluence, and other rich editors that don't inherit external CSS.

## [0.3.3] - 2026-05-22

### Fixed
- **Table dialog auto-close** — Clicking the table button no longer causes the rows/columns modal to immediately close. Event propagation from the dialog to the backdrop is now stopped.
- **Rich paste into JIRA/Confluence** — Copying from the JIRA, Confluence, Slack, or GitHub preview tabs now writes both `text/plain` (raw markup) and `text/html` (rendered preview) to the clipboard. Pasting into JIRA's rich editor now preserves formatting instead of outputting raw wiki markup.

## [0.3.2] - 2026-05-20

### Added
- **DOCX export with mermaid diagrams and math formulas** — Frontend pre-renders mermaid SVGs and KaTeX math to PNG data URLs; backend embeds them via the existing image pipeline. Production styling includes custom headings, page margins, paragraph spacing, code blocks, blockquotes, and clean horizontal rules.

### Fixed
- **Mermaid preview zoom scaling** — Diagrams now scale proportionally with the preview zoom level via CSS `transform: scale()` combined with viewBox tightening (`getBBox()`). Previously diagrams stayed fixed-size while all surrounding text resized.
- **Mermaid export sizing** — Exported DOCX diagrams no longer appear tiny on a massive white canvas. `html-to-image` wrapper sizing replaced with direct canvas `drawImage()` for exact output dimensions.
- **Mermaid export theme** — Diagrams now render with the light theme in DOCX exports. `setConfig()` was not re-initializing theme CSS; switched to `mermaid.initialize()` for a proper theme switch.
- **Mermaid config isolation** — `docxPrep.ts` no longer pollutes global mermaid config with `initialize()`. Uses `getConfig()`/`setConfig()` save/restore and renders sequentially to avoid race corruption.
- **Startup zoom reset** — App now always launches at 100% zoom instead of restoring stale localStorage values (e.g., 160% left over from a previous session).

## [0.3.1] - 2026-05-19

### Fixed
- **Updater confirmation** — Clicking "Check for Updates" no longer auto-downloads and force-closes the app. Users now see a confirmation dialog and a dirty-tabs warning before any download begins.

## [0.3.0] - 2026-05-19

### Added
- **CodeMirror minimap** — `@replit/codemirror-minimap` with `show_minimap` setting
- **List indentation** — Tab/Shift+Tab adds/removes 2-space indentation on list/quote lines
- **New toolbar buttons** — Math Block ($$), Mermaid Diagram, Expandable Section (<details>)
- **Markdown keymap** — `insertNewlineContinueMarkup` and `deleteMarkupBackward` from `@codemirror/lang-markdown`
- **E2E test hooks** — `window.__markz_editorView` and `window.__markz_editorCommands` for Playwright

### Fixed
- **Block-level HTML preview** — `Tag::HtmlBlock` / `TagEnd::HtmlBlock` now correctly routed to `Block::RawHtml`
- **Emoji corruption** — `process_inline_math()` now iterates Unicode scalars instead of raw bytes
- **Nested list parent text** — Tight list items containing nested lists no longer lose their text
- **Nested task list markers** — Parent `[x]` checkboxes preserved when child `[ ]` items are present
- **Task list CSS** — Removed `display: flex` breaking nested lists; checkbox now uses `vertical-align: middle`
- **Bullet cursor positioning** — Cursor advances past added prefix in `toggleLinePrefix()`

### Changed
- **Task list HTML** — Checkbox placed inside first `<p>` so nested `<ul>` flows naturally below text

## [0.2.0] - 2026-05-18

### Added
- **Lucide icon system** — 33 inline SVGs replaced with @lucide/svelte across 10 components
- **Shared CSS primitives** — Button, input, tooltip, context-menu, badge modules
- **Animation system** — Keyframe library, transition utilities, skeleton loading
- **GitHub Primer syntax theme** — 51 syntax tokens with full CodeMirror 6 theme
- **Preview typesetting** — Heading borders, table striping, code block badges, blockquotes
- **Splash screen** — Centered card with logo, animated loading bar, dark/light adaptive
- **Adaptive layout** — Auto-collapse sidebar below 1200px, single-pane below 900px
- **JetBrains Mono** — Added to font stack as preferred editor font

### Changed
- **Scrollbars** — 6px to 8px, improved hover contrast
- **SplitPane divider** — 1px with 4px hit area, accent on hover
- **Focus ring** — Restored :focus-visible for keyboard navigation
- **Toolbar alignment** — Preview toolbar border now aligns with editor

### Fixed
- **Dark theme gutter** — Line number gutter no longer white in dark mode


## [0.2.0] - 2026-05-18

### Added
- **Lucide icon system** — 33 inline SVGs replaced with @lucide/svelte across 10 components
- **Shared CSS primitives** — Button, input, tooltip, context-menu, badge modules
- **Animation system** — Keyframe library, transition utilities, skeleton loading
- **GitHub Primer syntax theme** — 51 syntax tokens with full CodeMirror 6 theme
- **Preview typesetting** — Heading borders, table striping, code block badges, blockquotes
- **Splash screen** — Centered card with logo, animated loading bar, dark/light adaptive
- **Adaptive layout** — Auto-collapse sidebar below 1200px, single-pane below 900px
- **JetBrains Mono** — Added to font stack as preferred editor font

### Changed
- **Scrollbars** — 6px to 8px, improved hover contrast
- **SplitPane divider** — 1px with 4px hit area, accent on hover
- **Focus ring** — Restored :focus-visible for keyboard navigation
- **Toolbar alignment** — Preview toolbar border now aligns with editor

### Fixed
- **Dark theme gutter** — Line number gutter no longer white in dark mode


## [0.1.13] - 2026-05-15

### Added
- **App icon & branding** — Geometric "M" logo with green markdown underline, generated for all platforms (PNG, ICO, ICNS, Windows Store tiles)
- **Logo in About modal** — App logo displayed in the About tab of Settings
- **Content zoom** — `Ctrl + mousewheel`, `Ctrl + =`, `Ctrl + -` to zoom editor and preview independently of UI chrome (50–300% range, persisted)
- **Word wrap toggle** — Existing `word_wrap` setting now wired to CodeMirror via `EditorView.lineWrapping` compartment

### Fixed
- **DOCX export image scaling** — Images now scale to max 6" page width instead of overflowing
- **DOCX strikethrough** — `~~text~~` now renders with proper strikethrough formatting in exported DOCX
- **DOCX code block styling** — Code blocks use light gray background (`#F2F2F2`)
- **DOCX table borders & shading** — Tables render with visible borders and header cell shading
- **Preview heading zoom** — Converted `h1–h3` and `pre code` from `px` to `em` units so they scale with zoom level
- **Editor zoom reactivity** — Uses classic `.subscribe()` pattern instead of `$effect` + legacy store (Svelte 5 doesn't track legacy stores in effects)
- **Theme sync edge case** — `data-theme="system"` no longer written to DOM; resolved to `light` or `dark` before DOM write

### Changed
- **About modal version** — Displays `v0.1.13`

## [0.1.12] - 2026-05-13

### Added
- **Outline panel** — Document outline with `Ctrl+B` toggle, `show_outline` setting, and `markz:toggle-sidebar` event
- **View mode toggle** — Split / Editor / Preview modes with StatusBar buttons and `view_mode` setting
- **Accessibility settings** — `reduced_motion` (disables CSS animations), `preview_font_size`, `ui_font_size` (rem-based UI scaling)
- **Settings modal tabs** — `initialTab` prop for opening directly to Settings, Help, or About
- **Theme toggle E2E test** — Validates icon, `data-theme`, and CSS sync across theme changes
- **Zoom E2E test** — Validates `Ctrl + =` / `Ctrl + -` zoom shortcuts
- **View mode E2E test** — Validates split/editor/preview button switching

### Fixed
- **`$effect` + `invoke` bug** — Never call `invoke()` inside `$effect`; silently kills all downstream reactivity
- **Frontend logging** — Replaced problematic `@tauri-apps/plugin-log` with custom `log_frontend` Rust command

## [0.1.11] - 2026-05-12

### Added
- **Template gallery** — Built-in templates (welcome, formatting-test, project-proposal, meeting-notes, blog-post)
- **DOCX export** — Full-featured Word document export with images, tables, lists, code blocks, math, and Mermaid diagrams
- **Mermaid diagram support** — Server-side SVG rendering via `mermaid-cli` with dark theme support
- **KaTeX math rendering** — Inline and block math in preview
- **Syntax highlighting** — `highlight.js` with light/dark theme sync

### Fixed
- **Image paste/drop** — Local image embedding with base64 encoding in preview
- **Settings persistence** — Settings saved to disk and reloaded on app start

## [0.1.10] - 2026-05-10

### Added
- **Auto-save** — Configurable auto-save interval
- **Editor font settings** — Font family, size, and line height
- **Preview max width** — Constrain preview content width
- **Line numbers & minimap** — Toggleable editor chrome

## [0.1.0] - 2026-05-08

### Added
- Initial release of MarkZ — a modern Markdown editor built with Tauri and Svelte
- Split-pane editor with live preview
- CodeMirror 6 integration
- Dark/light theme support
- Basic file open/save via Tauri dialog API
