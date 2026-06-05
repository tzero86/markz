<p align="center">
  <img src="src/assets/logo.png" width="96" alt="MarkZ logo">
</p>
<h1 align="center">MarkZ</h1>
<p align="center">
  <b>A dual-pane Markdown editor for engineers.</b><br>
  Fast, offline-first, and purpose-built for technical writing.
</p>
<p align="center">
  <a href="https://github.com/tzero86/markz/releases/latest"><img src="https://img.shields.io/github/v/release/tzero86/markz?style=flat-square&color=3dd68d&label=latest" alt="latest release"></a>
  <a href="https://github.com/tzero86/markz/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://github.com/tzero86/markz/actions"><img src="https://img.shields.io/github/actions/workflow/status/tzero86/markz/ci.yml?branch=master&style=flat-square&label=CI" alt="CI"></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/tauri-v2-24C8D8?style=flat-square" alt="tauri"></a>
  <a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/rust-1.77%2B-orange.svg?style=flat-square" alt="rust"></a>
</p>

## Table of Contents

- [Why MarkZ?](#why-markz)
- [Features](#features)
- [Installation](#installation)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Why MarkZ?

Most Markdown editors fall into two camps:

1. **Simple note apps** — great for grocery lists, terrible for RFCs with diagrams, math, and tables.
2. **VS Code + plugins** — powerful, but fragmented across three different panes and a dozen extensions.

MarkZ is the middle path: a **single, fast, native desktop app** with everything an engineer needs to write technical docs — live preview, math rendering, diagram support, multi-format export, and a VS Code-style workspace — all in one window, fully offline, with zero telemetry.

## Features

### Writing
- **Live Preview** — Side-by-side editor and rendered preview with instant updates
- **KaTeX Math** — Inline `<code>$E=mc^2$</code>` and block `$$` math rendering
- **Mermaid Diagrams** — Flowcharts, sequence diagrams, gantt charts, and more
- **Syntax Highlighting** — highlight.js with light/dark theme sync
- **Scroll Sync** — Bidirectional sync between editor and preview (heading-anchor aware)
- **Find & Replace** — Full CodeMirror search panel (`Ctrl+F` / `Ctrl+H`)
- **Text Snippets** — Tab-triggered expansion with placeholders (`rfc`, `adr`, `todo`, `link`, `img`, `code`, `table`, `frontmatter`)
- **Markdown Lint** — Real-time checks for trailing whitespace, empty links, missing alt text, unclosed code blocks, heading jumps, and duplicates
- **Document Statistics** — Words, characters, sentences, paragraphs, reading time, Flesch Reading Ease, and Flesch-Kincaid Grade Level

### Organization
- **Workspace Mode** — Open any folder and browse a recursive file tree. Global search (`Ctrl+Shift+F`) greps across all `.md` files with Replace All support.
- **VS Code-Style Activity Bar** — Files, Outline, and Links panels with `Ctrl+B` toggle
- **Auto-Open Folder** — Automatically open the parent folder when opening or saving a file
- **WikiLinks & Backlinks** — Link documents with `[[Target]]` or `[[Target|Display]]`. Automatic backlink discovery.
- **Outline Panel** — Document heading tree for quick navigation
- **Session Restore** — All tabs (including untitled) persisted and restored on launch
- **File Watcher** — Auto-refreshes workspace tree on external changes

### Export
- **Multi-Format Export** — Copy or export to:
  - JIRA (wiki markup)
  - Confluence (XHTML storage format)
  - Slack (mrkdwn)
  - GitHub Flavored Markdown
  - HTML
  - DOCX (native converter + optional Pandoc)
  - Print to PDF
- **AST-First Architecture** — All converters operate on a shared Rust AST. No regex string replacement.
- **Image Embedding** — Paste or drag-and-drop images; optional remote image embedding for exports

### Engineering Templates
Built-in templates for common technical documents:
- RFC (Request for Comments)
- ADR (Architecture Decision Record)
- Bug Report
- Test Plan
- PR Description
- Meeting Notes
- Weekly Status
- Formatting Test

Save any document as a reusable custom template.

### Quality of Life
- **Command Palette** (`Ctrl+Shift+P`) — Fuzzy search across all app commands
- **Quick Open** (`Ctrl+P`) — Fuzzy search across recent files and workspace files
- **Auto-Save** — Configurable debounced timer with on/off toggle
- **Dark / Light / System Themes** — Fully themeable with CSS custom properties
- **Custom CSS Themes** — Paste your own CSS in Settings
- **Content Zoom** — `Ctrl + mousewheel` or `Ctrl + =/-` (50–300%, persisted)
- **Word Wrap Toggle** — Per-document setting
- **CodeMirror Minimap** — Optional overview map
- **Vim Keybindings** — Optional Vim mode in the editor (toggle in Settings)
- **Draggable Tabs** — Drag-and-drop to reorder tabs within pinned/unpinned groups; order persists across sessions
- **Pin Tabs** — Right-click to pin tabs; pinned tabs survive Close All and won't close with `Ctrl+W`
- **Vertical Split** — Toggle between horizontal and vertical editor/preview layout
- **Custom Spellcheck Dictionary** — Manage per-user words; right-click to add words
- **Git Integration** — Status bar shows branch and modification status; one-click diff panel (`Ctrl+Shift+D`)
- **Text to Speech** — Dual-engine read-aloud (Edge streaming + Windows SAPI5 offline)
- **Auto-Updater** — Built-in update check with dirty-tabs warning before restart
- **Presentation Mode** (`F5`) — Convert Markdown to slide decks with heading-based boundaries
- **Slide Break Editor** — Visual gutter markers to manually define slide boundaries; preview pane shows faint boundary lines; no special markdown syntax required
- **Debug Log Panel** (`Ctrl+Shift+Y`) — Collapsible bottom panel showing operational logs for exports, file I/O, workspace ops, and errors

### Privacy
- **Offline-First** — Works without network access
- **Zero Telemetry** — No data collection, no accounts, no cloud sync
- **Local-Only** — Your documents never leave your machine

## Installation

### Prebuilt Binaries

Download the latest release for your platform:

| Platform | Package |
|----------|---------|
| Windows | `.exe` installer |
| Linux | `.deb` package |

> [>> Download Latest Release](https://github.com/tzero86/markz/releases/latest)

### Build from Source

**Prerequisites:**
- [Rust](https://rustup.rs/) 1.77+
- [Node.js](https://nodejs.org/) 18+
- Windows: Microsoft Visual C++ Build Tools or MinGW
- Linux: `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `pkg-config`, `libglib2.0-dev`, `libjavascriptcoregtk-4.1-dev`, `libsoup-3.0-dev`

```bash
git clone https://github.com/tzero86/markz.git
cd markz

# Install frontend dependencies
npm install

# Run in development mode
cargo tauri dev

# Build for production
cargo tauri build
```

The built installer will be in `src-tauri/target/release/bundle/`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+Shift+O` | Open folder / workspace |
| `Ctrl+T` | New file |
| `Ctrl+S` | Save file |
| `Ctrl+W` | Close active tab |
| `Ctrl+B` | Toggle sidebar panel |
| `Ctrl+F` | Find / Replace |
| `Ctrl+Shift+D` | Git diff panel |
| `Ctrl+=` / `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick Open / Recent Files |
| `Ctrl+Shift+Y` | Toggle Debug Panel |
| `F5` | Start Presentation Mode |
| `Esc` | Close modal / dropdown |

## Development

```bash
# Run frontend dev server only
npm run dev

# Run Rust tests
cargo test --workspace

# Run specific crate tests
cargo test -p markz-core
cargo test -p markz-convert
cargo test -p markz-templates

# Run E2E tests
npm run test:e2e

# Build frontend production bundle
npm run build
```

## Project Structure

```
markz/
├── src/                    # Svelte 5 frontend
│   ├── components/         # UI components (editor, preview, layout, settings)
│   ├── lib/                # Stores, utilities, keyboard shortcuts
│   └── styles/             # CSS design tokens, themes, component primitives
├── src-tauri/              # Tauri v2 Rust backend
│   └── src/commands/       # Modular command handlers
├── crates/                 # Rust workspace crates
│   ├── markz-core/         # Markdown parser, AST, HTML renderer, frontmatter, stats
│   ├── markz-convert/      # Format converters (JIRA, Confluence, Slack, GitHub, DOCX)
│   ├── markz-images/       # Image paste/drop handling
│   ├── markz-config/       # Settings persistence
│   └── markz-templates/    # Template engine
├── e2e/                    # Playwright end-to-end tests
├── site/                   # GitHub Pages landing page
└── docs/                   # Architecture and planning docs
```

## Architecture

MarkZ uses an **AST-first architecture**: all format converters operate on a shared `Document` AST produced by `markz-core`. This ensures consistent parsing and enables reliable multi-format export.

The frontend is intentionally thin — all heavy logic (parsing, rendering, conversion, file I/O, image processing, git operations) lives in Rust. The Svelte frontend handles UI shell, editor, preview pane, and IPC only.

See [docs/MarkZ_Architectural_Plan.md](docs/MarkZ_Architectural_Plan.md) for full details.

## Contributing

Contributions are welcome! Please open an issue or PR. See [ROADMAP.md](ROADMAP.md) for planned features.

## License

MIT
