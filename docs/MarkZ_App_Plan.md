# MarkZ — Application Plan & Implementation Audit

> **Version:** 0.8.66  
> **Status:** Active planning document, audited against the current codebase.  
> **Note:** This document originally read as a build mandate. It has been updated to reflect what is implemented, what diverged from the original plan, and what remains future work.

---

# PRODUCT VISION

`[x]` MarkZ is a **dual-pane Markdown editor** intended to fully replace the user's current workflow (VS Code + Sublime + Markdown Preview). It supports:

- Full Markdown authoring
- Live preview
- Image handling
- Engineering documentation workflows
- Reliable conversion to JIRA/Confluence/Slack/GitHub formats

The goal is to remain the preferred tool for engineers writing documentation, RFCs, ADRs, design docs, and technical specs. This vision is implemented and shipping.

---

# CORE ARCHITECTURE REQUIREMENT

`[x]` MarkZ is built using a **Rust-first architecture** with a **Tauri v2 frontend shell** and a **Svelte 5** frontend.

## Rust Core

All heavy logic lives in Rust and is exposed to the frontend via Tauri commands:

| Area | Status | Notes |
|------|--------|-------|
| Markdown parsing & rendering (GitHub-Flavored Markdown) | `[x]` | `crates/markz-core`, `pulldown-cmark` |
| AST transformations | `[x]` | `crates/markz-core::ast` |
| JIRA markup conversion | `[x]` | `crates/markz-convert::jira` |
| Confluence storage format conversion | `[x]` | `crates/markz-convert::confluence` |
| Slack formatting | `[x]` | `crates/markz-convert::slack` |
| GitHub formatting | `[x]` | `crates/markz-convert::github` |
| HTML rendering | `[x]` | `crates/markz-core::html` |
| Image ingestion pipeline (clipboard, drag-drop, base64, asset folder) | `[x]` | `crates/markz-images` |
| Syntax highlighting | `[-]` | Original plan specified *tree-sitter via Rust*. Current implementation uses `highlight.js` in the preview frontend (`src/components/preview/syntaxHighlighter.ts`). No Rust tree-sitter integration exists. |
| File I/O, autosave, file watching | `[x]` | Tauri commands + `notify = "7"` crate |
| Settings/config (`serde`) | `[x]` | `crates/markz-config` |
| Scroll sync calculations | `[x]` | Heading anchors produced in Rust; bidirectional sync handled by `src/lib/scrollSync.ts` |
| Performance-critical tasks (diffing, caching) | `[x]` | LRU preview cache, async file reads, debounced renders |
| Template engine for engineering docs | `[x]` | `crates/markz-templates` (RFC, ADR, design docs, etc.) |
| Expose Rust functions via Tauri commands | `[x]` | 30+ commands in `src-tauri/src/commands/` |

## Frontend (Tauri)

| Responsibility | Status | Notes |
|----------------|--------|-------|
| UI shell | `[x]` | Custom title bar, activity bar, sidebar |
| Dual-pane layout | `[x]` | Horizontal + vertical split, resizable, CSS-shown/hidden panes |
| Editor component | `[x]` | CodeMirror 6 (not Monaco) |
| HTML preview rendering | `[x]` | `src/components/preview/PreviewPane.svelte` |
| Keyboard shortcuts | `[x]` | `src/lib/keyboard.ts` |
| Theme system (light/dark + presets) | `[x]` | CSS custom properties, 17 presets including WGSN palettes |
| IPC with Rust core | `[x]` | `@tauri-apps/api` |
| Drag-and-drop events | `[x]` | Image drop into editor + file tree |
| Image paste events | `[x]` | Clipboard paste handled via Tauri + frontend |
| Context menus (“Copy as JIRA”, etc.) | `[x]` | Preview toolbar + command palette |

The frontend remains thin and delegates heavy work to Rust, with the exception of syntax highlighting, Mermaid diagram rendering, and KaTeX math rendering, which run in the WebView.

---

# FULL FEATURE REQUIREMENTS

## 1. Dual-Pane UI

- `[x]` Left: Markdown editor with syntax highlighting
- `[x]` Right: Live preview with instant rendering
- `[x]` Smooth scroll sync (heading-anchor aware + ratio fallback)
- `[x]` Split-view resizing (horizontal and vertical)
- `[x]` Drag-and-drop images into editor
- `[x]` File tree sidebar (Files activity)
- `[x]` Outline view (headings, clickable)

## 2. Markdown Engine (VS Code-level support)

- `[x]` GitHub-Flavored Markdown
- `[x]` Tables (including alignment)
- `[x]` Checkboxes / task lists
- `[x]` Nested lists
- `[x]` Code fences with syntax highlighting for 30+ languages (via `highlight.js`)
- `[x]` Mermaid diagrams
- `[ ]` PlantUML — **not implemented**; no dependency or renderer exists
- `[x]` KaTeX math (inline `$...$` and block `$$...$$`)
- `[x]` Footnotes
- `[x]` Task lists
- `[x]` Internal links (WikiLinks `[[Target]]` / `[[Target|Display]]`)
- `[x]` Auto-TOC generation
- `[x]` Frontmatter (YAML/TOML)

## 3. Image Handling Pipeline

- `[x]` Paste images from clipboard
- `[x]` Drag-and-drop images into editor
- `[x]` Local file paths
- `[x]` Relative paths
- `[x]` Base64 embedding (local image embed in preview + exports when enabled)
- `[x]` Remote URLs
- `[x]` Auto-copy images into a project `/assets` folder (configurable fallback to `Documents/MarkZ/assets`)
- `[x]` Auto-rename images to safe filenames
- `[x]` Auto-update Markdown paths
- `[ ]` Optional: compress images on import — **not implemented**

## 4. Export / Copy Formatting Tools

Convert selected/document Markdown to:

- `[x]` JIRA markup
- `[x]` Confluence storage format (XHTML)
- `[x]` Slack formatting
- `[x]` GitHub Issues formatting
- `[x]` HTML
- `[x]` DOCX (native converter)
- `[x]` DOCX / Word / PDF / HTML / EPUB via Pandoc (when installed)
- `[x]` Print to PDF

`[x]` “Copy as…” contextual menu and command palette entries are implemented.
`[x]` Tables, lists, code blocks, headings, and images are preserved across converters.

## 5. JIRA & Confluence Conversion Requirements

`[x]` Research and implementation complete. The converters operate on the shared Rust AST (`markz_core::ast::Document`) and handle tables, code blocks, headings, lists, images, links, blockquotes, task lists, footnotes, and WikiLinks. Automated conversion tests exist at both the Rust unit/integration level and the end-to-end level (54 integration tests added in v0.8.50).

## 6. Engineering-Focused Enhancements

- `[x]` Templates for RFCs, ADRs, design docs, bug reports, test plans, PR descriptions, meeting notes, weekly status, and a getting-started formatting reference
- `[x]` Snippets library (tab-triggered expansion)
- `[x]` Outline view
- `[x]` Quick search across files (Quick Open `Ctrl+P` + global workspace search `Ctrl+Shift+F`)
- `[x]` Workspace/project mode

## 7. Cross-Platform

- `[-]` Windows, macOS, and Linux are targeted via Tauri. `tauri.conf.json` declares file associations and icons for all three platforms. CI currently builds and tests on **Ubuntu** and **Windows** only; macOS builds rely on local/release tooling.
- `[x]` Tauri for packaging
- `[x]` GPU-accelerated rendering via the OS WebView

## 8. Open Source Requirements

- `[-]` **License:** `MIT` is declared in `Cargo.toml`, `README.md`, and `tauri.conf.json`. A top-level `LICENSE` file is **not present**.
- `[ ]` **Contribution guidelines:** `CONTRIBUTING.md` is **not present**.
- `[x]` Clean modular architecture with workspace crates
- `[x]` Automated build + release pipeline (`.github/workflows/ci.yml`, `release.yml`, `pages.yml`)

---

# NON-FUNCTIONAL REQUIREMENTS

- `[-]` **Fast startup (<300ms target)** — Implemented and continuously optimized (see CHANGELOG v0.8.56–v0.8.63). The exact sub-300ms figure remains an aspiration and is actively benchmarked via the Debug Panel.
- `[x]` Low memory footprint
- `[x]` Zero telemetry
- `[x]` Offline-first
- `[x]` Stable rendering engine
- `[x]` Clean separation of UI, rendering, and conversion logic

---

# WHAT HAS BEEN PRODUCED

This section replaces the original “What You Must Produce” build checklist with the actual deliverables that now exist in the repository.

## 1. Full Architecture Plan

`[x]` `docs/MarkZ_Architectural_Plan.md` — high-level architecture, Rust module breakdown, Tauri integration plan, rendering pipeline, conversion engine, image pipeline, and risk analysis. *(Note: this plan may itself need an audit to reflect current syntax-highlighting and PlantUML divergences.)*

## 2. Tech Stack Decision

`[x]` Tauri selected over Electron and native Rust GUI frameworks; reasoning documented in `docs/MarkZ_Architectural_Plan.md`.

## 3. File/Folder Structure

`[x]` Implemented as a Rust workspace + Tauri frontend. See `README.md` → Project Structure for the current layout.

## 4. Implementation Plan

`[x]` `ROADMAP.md` tracks shipped phases and remaining work (e.g., split editor, internal plugin architecture).

## 5. Core Code Implementations

`[x]` Production code exists for:
- Rust core bootstrap (`crates/markz-core`)
- Tauri bootstrap (`src-tauri/src/main.rs`, `src-tauri/src/lib.rs`)
- Dual-pane UI (`src/App.svelte`, `SplitPane.svelte`, `EditorPane.svelte`, `PreviewPane.svelte`)
- Markdown renderer (`crates/markz-core::html`)
- Image handling pipeline (`crates/markz-images`, `save_image` Tauri command)
- JIRA/Confluence converters (`crates/markz-convert`)
- Table and code block handling (AST + converters)
- Scroll sync logic (`src/lib/scrollSync.ts`)
- Settings persistence (`crates/markz-config`, `src-tauri/src/commands/settings.rs`)

## 6. UX/UI Specification

`[x]` `docs/MarkZ_UI_UX_Design.md` — design tokens, typography, spacing, component specs, animation timing, accessibility requirements.

## 7. Documentation

- `[x]` `README.md`
- `[ ]` `CONTRIBUTING.md` — missing
- `[x]` Developer setup guide in `README.md`
- `[x]` Architecture overview in `docs/MarkZ_Architectural_Plan.md`
- `[ ]` Plugin API documentation — deferred; plugin system is not user-facing yet

## 8. Testing Strategy

`[x]` Implemented:
- Unit tests (Vitest for frontend stores/utilities, Rust `cargo test` for crates)
- Integration tests (Rust converter tests)
- Snapshot-style rendering validation (Rust e2e render tests)
- Conversion engine tests (54 e2e + 16 unit tests)
- End-to-end tests (Playwright, 200+ tests)
- CI E2E job on Ubuntu via `xvfb-run`

---

# GAPS & DIVERGENCES FROM ORIGINAL PLAN

| Original Requirement | Current Reality |
|----------------------|-----------------|
| Syntax highlighting via tree-sitter in Rust | Implemented with `highlight.js` in the frontend preview. |
| PlantUML diagrams | Not implemented. |
| Image compression on import | Not implemented. |
| Top-level `LICENSE` file | Missing; license is declared in manifests and README only. |
| `CONTRIBUTING.md` | Missing. |
| macOS CI coverage | Tauri config supports macOS, but CI only builds Ubuntu and Windows. |
| Plugin system | Internal plugin architecture remains future work per `ROADMAP.md`. |
| LLM-powered features | Assessed in `docs/LLM_FEATURES_ASSESSMENT.md` but not implemented. |

---

# EXECUTION MODE

The original imperative build instructions are obsolete. MarkZ is now in active release cycles. Ongoing work is tracked in:

- `CHANGELOG.md` — shipped features and fixes
- `ROADMAP.md` — planned refactors and upcoming features
- `docs/UX_AUDIT.md` and `docs/LLM_FEATURES_ASSESSMENT.md` — additional planning/assessment content

Future releases should continue to update this document when major features ship or when original mandates diverge from implementation.
