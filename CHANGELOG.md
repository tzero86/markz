# Changelog

All notable changes to MarkZ are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
