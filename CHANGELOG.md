# Changelog

All notable changes to MarkZ are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
