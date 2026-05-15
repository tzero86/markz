# MarkZ

A dual-pane Markdown editor for engineers. Built with Tauri, Svelte 5, CodeMirror 6, and Rust.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Rust](https://img.shields.io/badge/rust-1.74%2B-orange.svg)
![Tauri](https://img.shields.io/badge/tauri-v2-purple.svg)

## Features

- **Live Preview** — Side-by-side editor and rendered preview with math (KaTeX), Mermaid diagrams, and syntax highlighting
- **Multi-Format Export** — Copy or export to JIRA, Confluence, Slack, GitHub, HTML, and DOCX
- **Engineering Templates** — Built-in RFC, ADR, Bug Report, Test Plan, PR Description, Meeting Notes, Weekly Status, and a comprehensive Formatting Test template
- **Save Your Own Templates** — Save any document as a reusable template
- **Image Support** — Paste or drag-and-drop images; optional remote image embedding for exports
- **Dark / Light / System Themes** — Fully themeable with CSS custom properties
- **Find & Replace** — Full CodeMirror search panel (`Ctrl+F`)
- **Recent Files** — Quick access to last 10 opened files
- **Task Lists** — Rendered with interactive checkboxes in preview
- **Scroll Sync** — Bidirectional sync between editor and preview panes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5, TypeScript, Vite |
| Editor | CodeMirror 6 |
| Backend | Tauri v2 (Rust) |
| Parser | pulldown-cmark |
| Math | KaTeX |
| Diagrams | Mermaid |
| Highlighting | highlight.js |

## Installation

### Prebuilt Binaries

Download the latest release for your platform from the [Releases](https://github.com/tzero86/markz/releases) page.

### Build from Source

**Prerequisites:**
- [Rust](https://rustup.rs/) 1.74+
- [Node.js](https://nodejs.org/) 18+
- Windows: Microsoft Visual C++ Build Tools or MinGW
- Linux: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`

**Clone and build:**

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

# Build frontend production bundle
npm run build
```

### Project Structure

```
markz/
├── src/                    # Svelte frontend
│   ├── components/         # UI components
│   ├── lib/                # Stores and utilities
│   └── styles/             # CSS tokens and base
├── src-tauri/              # Tauri Rust backend
│   └── src/
├── crates/                 # Rust workspace crates
│   ├── markz-core/         # Markdown parser & HTML renderer
│   ├── markz-convert/      # Format converters (JIRA, Confluence, etc.)
│   ├── markz-images/       # Image paste/drop handling
│   ├── markz-config/       # Settings persistence
│   └── markz-templates/    # Template engine
└── docs/                   # Architecture and planning docs
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+F` | Find / Replace |
| `Esc` | Close modal / dropdown |

## Architecture

MarkZ uses an **AST-first architecture**: all format converters operate on a shared `Document` AST produced by `markz-core`. This ensures consistent parsing and enables reliable multi-format export.

See [docs/MarkZ_Architectural_Plan.md](docs/MarkZ_Architectural_Plan.md) for full details.

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT
