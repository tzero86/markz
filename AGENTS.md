# MarkZ — Agent Context

## Project Overview

**MarkZ** is an open-source dual-pane Markdown editor for engineers. The goal is to replace the current workflow (VS Code + Sublime + Markdown Preview) with a single, fast, offline-first desktop tool that supports live preview, image handling, and reliable conversion to JIRA, Confluence, Slack, and GitHub formats.

**Current State:** This repository is an **active, shipping Tauri desktop application**. It is no longer in the planning phase: the Rust workspace, Svelte 5 frontend, Tauri shell, and converter crates are all implemented and under ongoing development. The latest released version is **v0.8.67** (see `Cargo.toml`, `package.json`, and `src-tauri/tauri.conf.json`).

Key shipped capabilities include:

- Dual-pane editor + live HTML preview with heading-aware scroll sync
- Rust AST-first converters for JIRA, Confluence, Slack, and GitHub
- DOCX export (native converter) plus optional Pandoc integration (DOCX/PDF/HTML/EPUB)
- Print to PDF
- KaTeX math and Mermaid diagrams
- Image paste/drop with automatic save to `assets/`
- Workspace / folder mode with recursive file tree and global find/replace
- VS Code-style activity bar (Files, Outline, Links)
- Session restore for tabs and workspace
- WikiLinks, backlinks, footnotes, frontmatter, and document statistics
- Command palette, quick open, Vim mode, pin tabs, draggable tabs
- Presentation mode with slide boundaries
- Debug log panel, settings UI, theme presets, and accessibility options

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2.x (Rust + WebView) |
| Frontend framework | Svelte 5 |
| Editor component | CodeMirror 6 (with optional `@replit/codemirror-vim`) |
| Core language | Rust |
| Markdown parser | `pulldown-cmark` |
| Syntax highlighting | `highlight.js` (frontend) |
| Config/Settings | `serde` + JSON on disk |
| Math rendering | KaTeX |
| Diagrams | Mermaid |
| Build tooling | Vite, Cargo, `tauri-cli` |
| Testing | Vitest (unit), `cargo test` (Rust), Playwright (e2e) |

> **Note:** The planning docs mention `tree-sitter` / `syntect` for syntax highlighting. The actual implementation uses `highlight.js` in the preview pane.

## Actual Architecture

The repository is a Cargo workspace with a Tauri app shell and a Vite/Svelte frontend.

```
markz/
├── Cargo.toml              # Workspace root (members: crates/*, src-tauri)
├── Cargo.lock
├── package.json            # NPM scripts and frontend dependencies
├── vite.config.ts          # Vite + Vitest configuration
├── playwright.config.ts    # E2E test configuration
├── crates/
│   ├── markz-core/         # Markdown parsing, AST, HTML renderer, TOC, frontmatter, slides, stats
│   ├── markz-convert/      # JIRA, Confluence, Slack, GitHub, and DOCX converters
│   ├── markz-images/       # Image pipeline (clipboard, drag-drop, asset saving)
│   ├── markz-templates/    # Engineering doc templates (RFC, ADR, etc.)
│   └── markz-config/       # Settings schema and persistence
├── src-tauri/              # Tauri application shell
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs          # App state, helpers, Tauri builder wiring
│   │   └── commands/       # Tauri command handlers
│   │       ├── app.rs
│   │       ├── backlinks.rs
│   │       ├── convert.rs
│   │       ├── documents.rs
│   │       ├── git.rs
│   │       ├── logging.rs
│   │       ├── pandoc.rs
│   │       ├── presentation.rs
│   │       ├── session.rs
│   │       ├── settings.rs
│   │       ├── templates.rs
│   │       ├── tts.rs
│   │       ├── watcher.rs
│   │       └── workspace.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # Frontend source (Svelte 5 / TypeScript)
│   ├── App.svelte
│   ├── components/
│   │   ├── editor/         # EditorPane, CodeMirror setup, linter, snippets, table editor, toolbar
│   │   ├── layout/         # ActivityBar, TabBar, SplitPane, StatusBar, TitleBar, etc.
│   │   ├── preview/        # PreviewPane, presentation mode, math/diagram/syntax renderers
│   │   ├── settings/       # Settings modal + category components
│   │   ├── templates/      # Template browser and save dialog
│   │   └── ui/             # CommandPalette, EmptyState, Toast, etc.
│   ├── lib/                # Stores and utilities (tabStore, workspaceStore, sessionStore, etc.)
│   ├── assets/
│   └── styles/
├── e2e/                    # Playwright end-to-end specs
├── site/                   # Marketing site
├── docs/                   # Planning and assessment documents
│   ├── MarkZ_App_Plan.md
│   ├── MarkZ_Architectural_Plan.md
│   ├── MarkZ_UI_UX_Design.md
│   ├── UX_AUDIT.md
│   └── LLM_FEATURES_ASSESSMENT.md
├── CHANGELOG.md            # Shipped features and fixes
├── ROADMAP.md              # Engineering roadmap (slightly stale at v0.8.43)
└── README.md
```

### Core Design Decisions (still valid)

1. **AST-first conversions:** All format converters (JIRA, Confluence, Slack, GitHub) operate on a shared Rust AST (`markz_core::ast::Document`). No string-to-string regex conversion is allowed.
2. **Rust-first, thin frontend:** Heavy logic (parsing, rendering, conversion, file I/O, image processing) lives in Rust. The Tauri frontend handles UI shell, editor, preview pane, and IPC only.
3. **Confluence Storage Format (XHTML) over Wiki Markup:** The Confluence converter emits XHTML storage format.

## Build & Development Commands

The project uses both Cargo and NPM. Typical commands are:

```bash
# Frontend development server only
npm run dev

# Run Tauri in development mode
npm run tauri-dev

# Build the frontend for production
npm run build

# Build release Tauri binaries
npm run tauri-build

# Rust workspace
 cargo build
 cargo test

# Frontend unit tests (Vitest)
npx vitest

# End-to-end tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
```

## Code Style Guidelines

- Modular workspace crates with narrow public APIs.
- Production-grade quality, clarity, and maintainability.
- Match the existing file/component conventions in `src/components/` and `src/lib/`.
- Licensed under MIT OR Apache-2.0 (see workspace `Cargo.toml`).

## Testing Strategy

- **Unit tests** — Vitest for TypeScript utilities and stores (`src/**/*.test.ts`). Examples: `scrollSync.test.ts`, `sessionStore.test.ts`, `snippetStore.test.ts`, `tableEditor.test.ts`, `markdownLinter.test.ts`, `docxPrep.test.ts`, `tabStore.test.ts`.
- **Rust tests** — `cargo test` across workspace crates, including converter integration tests and core parser/renderer tests.
- **Snapshot tests** — Some rendering/output assertions are embedded in Rust converter tests.
- **Conversion engine tests** — Automated tests for markdown → JIRA / Confluence / Slack / GitHub conversions.
- **End-to-end tests** — Playwright specs in `e2e/` covering app startup, editor, preview, tabs, settings, workspace, file associations, keyboard shortcuts, presentation mode, scroll behavior, session restore, and more.

## Security Considerations

- **Zero telemetry** is a stated non-functional requirement.
- **Offline-first** — The app must work without network access.
- **Process isolation** — Tauri provides WebView process isolation.
- HTML preview is sanitized to prevent XSS from untrusted Markdown content.

## Implementation Roadmap

The original roadmap from `docs/MarkZ_Architectural_Plan.md` has largely been executed. The table below reflects the current reality.

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| 0 | Foundation — Tauri + Svelte 5 scaffold, CodeMirror 6, basic IPC | Done | Shipped in early v0.x releases. |
| 1 | Core Engine — `pulldown-cmark`, AST + HTML renderer, frontmatter, scroll sync, file I/O | Done | Core parser, frontmatter, TOC, stats, and heading-aware scroll sync are implemented. |
| 2 | Rich Features — Syntax highlighting, Mermaid, KaTeX, TOC, outline sidebar | Done | Uses `highlight.js` rather than tree-sitter/syntect. Outline and heading navigation shipped. |
| 3 | Image Pipeline — Clipboard paste, drag-and-drop, auto-copy to `/assets`, path rewriting | Done | `markz-images` crate plus Tauri commands; merged to a single `save_image` command in v0.8.66. |
| 4 | Converters — JIRA, Confluence, Slack, GitHub converters + context menus | Done | All four converters implemented and covered by integration/unit tests. Copy/export commands are in the UI. |
| 5 | Engineering Features — Templates, snippets, quick search, workspace mode | Done | Templates, snippets, command palette, quick open, workspace mode, global search/replace, Vim mode, pin tabs, draggable tabs, presentation mode, and debug panel are all shipped. |
| 6 | Polish & Release — Themes, keyboard shortcuts, settings UI, CI/CD, release builds | Done/Ongoing | Theme presets, settings UI, shortcuts, CI E2E job, updater, and release builds are in place. Continuous polish remains. |

### Remaining / Future Work (from `ROADMAP.md`)

These items are explicitly listed as not yet done in the roadmap:

- **Split editor (two editor panes)** — `[ ]` Not started.
- **Plugin architecture (internal only)** — `[ ]` Not started; user-facing plugins explicitly deferred.
- **Collaborative editing (Git-based conflict visualization)** — `[ ]` Not started.

## Files in This Repository

The repository contains source code, tests, docs, and build configuration. Notable entries:

```
.
├── Cargo.toml / Cargo.lock
├── package.json / package-lock.json
├── vite.config.ts
├── playwright.config.ts
├── tsconfig.json
├── .gitignore
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── AGENTS.md          (this file)
├── crates/
│   ├── markz-core/
│   ├── markz-convert/
│   ├── markz-images/
│   ├── markz-templates/
│   └── markz-config/
├── src/
│   ├── App.svelte
│   ├── components/
│   ├── lib/
│   └── styles/
├── src-tauri/
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── e2e/
├── site/
└── docs/
    ├── MarkZ_App_Plan.md
    ├── MarkZ_Architectural_Plan.md
    ├── MarkZ_UI_UX_Design.md
    ├── UX_AUDIT.md
    └── LLM_FEATURES_ASSESSMENT.md
```

> **Obsolete claim removed:** The previous version of this file stated there was no source code, build system, or committed history. That is incorrect; the project is fully scaffolded and versioned.

## UI/UX Design Authority

**`docs/MarkZ_UI_UX_Design.md` is the authoritative visual specification.** Any frontend work should follow its:

- Color tokens (`--bg-*`, `--text-*`, `--accent-*`)
- Typography scale and font choices
- Spacing grid (4px base)
- Animation timing (instant → 300ms tiers)
- Component specifications (buttons, inputs, menus, tooltips, toasts)
- Accessibility requirements (WCAG AA contrast, keyboard nav, `prefers-reduced-motion`)

> **Principle:** MarkZ must feel like a premium native app — fluid 60fps interactions, zero jank, and a cohesive visual language.

### Divergences and Caveats

- Some planning documents (especially `ROADMAP.md`) list a version of `v0.8.43` and may not reflect the latest shipped work. Treat `CHANGELOG.md` and the actual code as the source of truth for what is implemented.
- The architectural plan mentions `tree-sitter` / `syntect` for syntax highlighting; the actual implementation uses `highlight.js` in the preview renderer.
- The image pipeline originally described separate paste/drop paths; these were merged into a single `save_image` backend command in v0.8.66.
