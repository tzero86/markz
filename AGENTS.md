# MarkZ — Agent Context

## Project Overview

**MarkZ** is a planned open-source dual-pane Markdown editor for engineers. The goal is to replace the current workflow (VS Code + Sublime + Markdown Preview) with a single, fast, offline-first desktop tool that supports live preview, image handling, and reliable conversion to JIRA, Confluence, Slack, and GitHub formats.

**Current State:** This repository is in the **planning phase**. There is no source code, build system, or committed history yet. The only existing content is two architecture/planning documents under `docs/`:

- `docs/MarkZ_App_Plan.md` — Product vision, full feature requirements, non-functional requirements, and execution checklist.
- `docs/MarkZ_Architectural_Plan.md` — Tech stack decision, high-level architecture diagram, Rust module breakdown, JIRA/Confluence/Slack format research, Tauri integration plan, implementation roadmap, and risk analysis.

## Planned Technology Stack

| Layer | Planned Technology |
|-------|-------------------|
| Desktop shell | Tauri (Rust + WebView) |
| Frontend framework | Svelte 5 |
| Editor component | CodeMirror 6 |
| Core language | Rust |
| Markdown parser | `pulldown-cmark` (primary), `comrak` (fallback option) |
| Syntax highlighting | tree-sitter (via Rust, with `syntect` as fallback) |
| Config/Settings | `serde` |
| Math rendering | KaTeX / MathJax |
| Diagrams | Mermaid (PlantUML optional) |

## Planned Architecture

The intended structure is a **Rust workspace** with a Tauri app shell:

```
markz/
├── Cargo.toml              # Workspace root
├── crates/
│   ├── markz-core/         # Markdown parsing & rendering
│   ├── markz-convert/      # JIRA, Confluence, Slack, GitHub converters
│   ├── markz-images/       # Image pipeline (clipboard, drag-drop, assets)
│   ├── markz-templates/    # Engineering doc templates (RFC, ADR, design docs)
│   └── markz-config/       # Settings & config management
├── src-tauri/              # Tauri application shell
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/       # Tauri command handlers
│   │   └── state/          # App state management
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # Frontend source (Svelte / TypeScript)
│   ├── components/
│   ├── editor/
│   ├── preview/
│   └── styles/
└── tests/                  # Unit, integration, snapshot, and e2e tests
```

### Core Design Decisions (from planning docs)

1. **AST-first conversions:** All format converters (JIRA, Confluence, Slack, GitHub) operate on a shared AST (`markz_core::ast::Document`). No string-to-string regex conversion is allowed.
2. **Rust-first, thin frontend:** All heavy logic (parsing, rendering, conversion, file I/O, image processing) lives in Rust. The Tauri frontend handles UI shell, editor, preview pane, and IPC only.
3. **Confluence Storage Format (XHTML) over Wiki Markup:** Storage format is the primary target because it is what Confluence expects on paste.

## Build & Development Commands

> **Not yet applicable.** No `Cargo.toml`, `package.json`, or other build configuration exists. When the project is bootstrapped, the expected commands will be:
>
> - `cargo build` — Build Rust workspace
> - `cargo test` — Run Rust tests
> - `cargo tauri dev` — Run Tauri in development mode
> - `cargo tauri build` — Build release binaries

## Code Style Guidelines

> **Not yet established.** The planning docs specify:
> - Clean modular architecture with workspace crates
> - Production-grade quality, clarity, and maintainability
> - MIT or Apache-2.0 license (to be added)

## Testing Strategy (Planned)

- **Unit tests** — For Rust core modules (parser, AST, converters)
- **Integration tests** — For Tauri command handlers and file I/O
- **Snapshot tests** — For HTML rendering output
- **Conversion engine tests** — Automated tests for all JIRA/Confluence/Slack/GitHub conversions
- **End-to-end tests** — For UI workflows (Tauri driver or similar)

## Security Considerations

- **Zero telemetry** is a stated non-functional requirement.
- **Offline-first** — The app must work without network access.
- **Process isolation** — Tauri provides WebView process isolation; the planning docs treat this as a security advantage over Electron.
- HTML preview must be sanitized to prevent XSS from untrusted Markdown content.

## Implementation Roadmap (from `docs/MarkZ_Architectural_Plan.md`)

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| 0 | Foundation | Workspace structure, Tauri hello-world, CodeMirror 6, basic IPC |
| 1 | Core Engine | `pulldown-cmark` integration, AST + HTML renderer, frontmatter, scroll sync, file I/O |
| 2 | Rich Features | Syntax highlighting, Mermaid, KaTeX, TOC, outline sidebar |
| 3 | Image Pipeline | Clipboard paste, drag-and-drop, auto-copy to `/assets`, path rewriting |
| 4 | Converters | JIRA, Confluence, Slack, GitHub format converters + context menus |
| 5 | Engineering Features | Templates, snippets, quick search, workspace mode |
| 6 | Polish & Release | Themes, keyboard shortcuts, settings UI, CI/CD, release builds |

## Files in This Repository

As of the latest state, the repository contains only:

```
.
├── docs/
│   ├── MarkZ_App_Plan.md
│   ├── MarkZ_Architectural_Plan.md
│   └── MarkZ_UI_UX_Design.md   # Visual identity, tokens, animations, component specs
└── AGENTS.md          (this file)
```

There is no `.gitignore`, no `README.md`, no `LICENSE`, no `Cargo.toml`, and no source code yet.

## UI/UX Design Authority

**`docs/MarkZ_UI_UX_Design.md` is the authoritative visual specification.** Any frontend work must follow its:
- Color tokens (`--bg-*`, `--text-*`, `--accent-*`)
- Typography scale and font choices
- Spacing grid (4px base)
- Animation timing (instant → 300ms tiers)
- Component specifications (buttons, inputs, menus, tooltips, toasts)
- Accessibility requirements (WCAG AA contrast, keyboard nav, `prefers-reduced-motion`)

> **Principle:** MarkZ must feel like a premium native app — fluid 60fps interactions, zero jank, and a cohesive visual language from day one.
