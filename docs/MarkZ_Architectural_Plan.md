# MarkZ — Architecture & Implementation Plan

> **Version reflected in this document:** v0.8.66 (shipping).  
> The codebase is no longer in the planning phase; the architecture below describes what is actually implemented today.

## 1. Tech Stack Decision

### Winner: Tauri 2.x (confirmed)

| Criterion | Tauri | Electron | egui/iced |
|-----------|-------|----------|-----------|
| **Binary size** | ~3–5 MB | ~150 MB+ | N/A (native) |
| **Memory** | ~50–100 MB | ~200–400 MB | ~20–50 MB |
| **Startup** | < 200 ms | ~1–2 s | < 100 ms |
| **Rust core** | First-class | Node bridge required | Native |
| **Web tech UI** | Yes (WebView) | Yes (Chromium) | No |
| **Cross-platform** | Win / Mac / Lin | Win / Mac / Lin | Partial |
| **Security** | Process isolation | Shared memory | Native |
| **Ecosystem** | Growing fast | Mature | Small |

**Verdict:** Tauri remains the clear choice. The shipping app uses Tauri 2.x with the following official plugins:

- `tauri-plugin-dialog` — native open/save/folder dialogs
- `tauri-plugin-log` — Rust-side logging to stdout + log dir
- `tauri-plugin-process` — process control helpers
- `tauri-plugin-updater` — auto-updater (Windows passive install)
- `tauri-plugin-single-instance` — reuse the same window when opening files from the OS

### Editor Component Choice: CodeMirror 6

- Monaco is heavier and more complex to integrate.
- CodeMirror 6 is modular, fast, and has excellent Markdown mode support.
- Native scroll-sync APIs make dual-pane sync easier.
- Smaller bundle, faster load.
- Optional Vim bindings via `@replit/codemirror-vim`, toggleable at runtime through a `Compartment`.

### Frontend

- **Framework:** Svelte 5 with runes (`$state`, `$derived`, `$effect`) and TypeScript.
- **Build tooling:** Vite 6 + `@sveltejs/vite-plugin-svelte`.
- **Preview rendering:** Sanitized HTML, with KaTeX math, Mermaid diagrams, and `highlight.js` syntax highlighting loaded on demand.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Tauri WebView Shell                                   │
│  ┌─────────────────────┐   IPC   ┌─────────────────────┐                     │
│  │   Svelte 5 Shell    │◄───────►│   Rust Core Engine  │                     │
│  │  (TitleBar,         │         │   (Tauri commands)  │                     │
│  │   ActivityBar,      │         │                     │                     │
│  │   StatusBar,        │         │                     │                     │
│  │   DebugPanel)       │         │                     │                     │
│  └─────────────────────┘         └─────────────────────┘                     │
│           │                                ▲                                  │
│           │                                │ Tauri events                      │
│           ▼                                │ (open-file, markz:workspace-      │
│  ┌───────────────────────────────────────┐│  changed, markz:file-externally-  │
│  │  CodeMirror 6  ◄──►  Preview Pane     ││  changed, markz:log,              │
│  │  (Markdown edit)     (sanitized HTML  ││  markz:scroll-to-heading)         │
│  │                      + KaTeX/Mermaid/ ││                                   │
│  │                        highlight.js)  ││                                   │
│  └───────────────────────────────────────┘│                                   │
│           │                               │                                    │
│           └──────── Scroll Sync ──────────┘                                    │
│              (heading-aware + ratio fallback)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Tauri Commands + Events
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Rust Workspace                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  markz-core  │ │ markz-convert│ │ markz-images │ │markz-templates│        │
│  │  parser/ast  │ │ JIRA/Conf/   │ │ save_image   │ │ built-in +   │        │
│  │  html/toc    │ │ Slack/GitHub │ │              │ │ user-defined │        │
│  │  frontmatter │ │ DOCX         │ │              │ │ templates    │        │
│  │  stats/slides│ │              │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌────────────────────────────────────────────────────────┐ │
│  │ markz-config │ │ src-tauri command modules                                │ │
│  │ Settings/    │ │ documents, convert, settings, session, workspace,      │ │
│  │ serde        │ │ watcher, git, backlinks, templates, tts, pandoc,       │ │
│  │              │ │ presentation, logging, app                               │ │
│  └──────────────┘ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rust Module Breakdown

### Crate Structure (workspace)

```
markz/
├── Cargo.toml                # Workspace root (members: crates/*, src-tauri)
├── Cargo.lock
├── crates/
│   ├── markz-core/           # Markdown parsing, AST, HTML renderer, TOC, stats, slides
│   ├── markz-convert/        # JIRA, Confluence, Slack, GitHub, DOCX converters
│   ├── markz-images/         # Image pipeline (single save_image entry point)
│   ├── markz-templates/      # Engineering doc templates (RFC, ADR, etc.)
│   └── markz-config/         # Settings schema and persistence
├── src-tauri/                # Tauri app shell
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs            # App state, helpers, parse_document, embed_local_images
│   │   └── commands/         # Tauri command handlers (no separate state/ dir)
│   ├── Cargo.toml
│   ├── tauri.conf.json       # Bundle config incl. Markdown file associations
│   └── capabilities/
├── src/                      # Frontend (Svelte 5 / TypeScript)
│   ├── App.svelte
│   ├── components/
│   │   ├── editor/           # EditorPane, codemirror.ts, toolbar, snippets, linter, table editor
│   │   ├── layout/           # ActivityBar, TabBar, SplitPane, StatusBar, TitleBar, DebugPanel, SearchPanel, OutlineSidebar
│   │   ├── preview/          # PreviewPane, PresentationMode, math/mermaid/syntax renderers
│   │   ├── settings/         # Settings modal + category components
│   │   ├── templates/        # Template browser and save dialog
│   │   └── ui/               # CommandPalette, EmptyState, Toast
│   ├── lib/                  # Stores and utilities (tabStore, sessionStore, workspaceStore, scrollSync, etc.)
│   ├── assets/
│   └── styles/
├── e2e/                      # Playwright end-to-end specs
└── src/**/*.test.ts          # Vitest unit tests co-located with source
```

### Core Crate: `markz-core`

```rust
// Key modules:
pub mod parser;           // pulldown-cmark + GFM extensions
pub mod ast;              // Document AST (owned, serializable)
pub mod html;             // HTML renderer
pub mod frontmatter;      // YAML/TOML extraction
pub mod toc;              // Table of contents generation
pub mod stats;            // Word/char/reading-time statistics
pub mod slides;           // Presentation-mode slide deck generation
pub mod html_to_markdown; // Bidirectional HTML → Markdown conversion
pub mod util;             // Shared helpers (is_markdown_path, etc.)
```

**Parser choice: `pulldown-cmark`**
- Fastest Rust Markdown parser (streaming, zero-copy where possible).
- GFM support via options on the parser.
- Excellent for real-time preview (low latency).
- Exposes events → we build our own AST on top.

**Alternative: `comrak`**
- GitHub-flavored by default.
- Slower but more compatible with GitHub's exact rendering.
- Not currently used; could be swapped in later if needed.

**Decision:** `pulldown-cmark` is the production parser.

### Convert Crate: `markz-convert`

```rust
pub mod context;     // ConvertContext (embed-remote-images, base path)
pub mod jira;        // JIRA wiki markup
pub mod confluence;  // Confluence storage format (XHTML)
pub mod slack;       // Slack mrkdwn
pub mod github;      // GitHub-flavored Markdown
pub mod docx;        // Native DOCX export
```

**Design pattern:**
- All converters take `markz_core::ast::Document` as input.
- No string-to-string conversion (avoids the MCP-server bug of parsing JIRA as Markdown).
- Each converter walks the AST and emits the target format.
- `ConvertContext` supplies the document path and settings such as `embed_remote_images`.

### Image Crate: `markz-images`

Single public entry point:

```rust
pub fn save_image(
    image_data: &[u8],
    suggested_filename: &str,
    doc_path: Option<&str>,
) -> Result<ImageResult, ImageError>
```

- Saves to `{doc_dir}/assets/` when a document path is present, otherwise to the OS documents dir under `MarkZ/assets/`.
- Sanitizes filenames and prefixes a timestamp to avoid collisions.
- Clipboard paste and drag-and-drop both flow through this one function (the two separate commands were merged in v0.8.66).

### Config Crate: `markz-config`

```rust
pub struct Settings { /* theme, fonts, view_mode, split_direction, vim_mode, etc. */ }
pub fn config_dir() -> Option<PathBuf>;
pub fn settings_path() -> Option<PathBuf>;
```

- Settings are serialized to JSON in the OS config dir (`~/.config/markz/settings.json` on Linux, etc.).
- The Rust `Settings` struct is the source of truth; TypeScript mirrors it via `src/lib/settingsTypes.ts`.

---

## 4. JIRA & Confluence Format Research Summary

### JIRA Wiki Markup

| Markdown | JIRA Wiki |
|----------|-----------|
| `# Heading` | `h1. Heading` |
| `## Heading` | `h2. Heading` |
| `**bold**` | `*bold*` |
| `*italic*` | `_italic_` |
| `` `code` `` | `{{code}}` |
| ```` ``` ```` | `{code:lang}` ... `{code}` |
| `- item` / `* item` | `* item` |
| `  - item` | `** item` |
| `1. item` | `# item` |
| `[text](url)` | `[text\|url]` |
| `\|a\|b\|` | `\|a\|b\|` |
| `> quote` | `bq. quote` |
| `~~strike~~` | `-strike-` |

**Critical gotcha (from MCP bug analysis):**
- `#` without space in JIRA = heading (`h1.`)
- `#` with space = numbered list
- `**` at line start = nested bullet, NOT bold
- Converters must be context-aware, not regex-based

### Confluence Storage Format (XHTML-based)

Standard HTML for basics:
```xml
<h1>Heading</h1>
<p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
<ul><li>Item</li></ul>
<table><tbody><tr><th>Header</th></tr><tr><td>Cell</td></tr></tbody></table>
```

Special elements via Atlassian namespace:
```xml
<!-- Code block -->
<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">rust</ac:parameter>
  <ac:rich-text-body>
    <pre><code>fn main() {}</code></pre>
  </ac:rich-text-body>
</ac:structured-macro>

<!-- Info panel -->
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body><p>Note text</p></ac:rich-text-body>
</ac:structured-macro>
```

**Decision:** Implement **Storage Format (XHTML)** as primary target — it's what Confluence's editor expects on paste. Wiki markup is secondary/legacy.

### Slack Formatting (mrkdwn)

| Markdown | Slack |
|----------|-------|
| `**bold**` | `*bold*` |
| `*italic*` | `_italic_` |
| `` `code` `` | `` `code` `` |
| ```` ``` ```` | ```` ``` ```` (fenced) |
| `[text](url)` | `<url\|text>` |
| `> quote` | `> quote` |
| `# heading` | `*Heading*\n` (no native headings) |

Slack has limited formatting — headings become bold text, tables become code blocks or plain text.

---

## 5. Tauri Integration Plan

### Plugins

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-dialog` | Native file/folder open/save dialogs |
| `tauri-plugin-log` | Rust logging to stdout + log dir |
| `tauri-plugin-process` | Process helpers |
| `tauri-plugin-updater` | Auto-updater |
| `tauri-plugin-single-instance` | OS file-open reuse in a single window |

### Registered Command Surface

The invoke handler in `src-tauri/src/lib.rs` exposes the following commands (grouped by domain):

```rust
// Documents / preview
render_preview(markdown, doc_path) -> String
open_document(path) -> DocumentInfo
save_document(path, content)
read_file_text(path) -> String
open_file_dialog() -> Option<DocumentInfo>
save_file_dialog(default_name, filter_name, filter_extensions) -> Option<String>
generate_toc(markdown) -> Vec<TocEntry>
compute_stats(markdown) -> DocumentStats
save_image(image_data, filename, doc_path) -> ImageResult

// Conversion
convert_to_jira(markdown, doc_path) -> String
convert_to_confluence(markdown, doc_path) -> String
convert_to_slack(markdown, doc_path) -> String
convert_to_github(markdown, doc_path) -> String
convert_html_to_markdown(html) -> String
export_to_docx(markdown, doc_path, output_path)

// Pandoc
pandoc_available() -> bool
export_via_pandoc(markdown, doc_path, output_path, format)
copy_via_pandoc(markdown, doc_path, format) -> String

// Session
save_session(tabs, active_tab_path, workspace_path)
load_session() -> Option<SessionState>
clear_session_disk()

// Settings
get_settings() -> Settings
update_settings(settings)

// Workspace
open_folder_dialog() -> Option<String>
list_workspace_files_shallow(root) -> Vec<FileTreeNode>
list_dir_children(path, root) -> Vec<FileTreeNode>
search_workspace(root, query) -> Vec<SearchResult>

// File watching
watch_workspace(path)
unwatch_workspace()
watch_open_files(paths)
unwatch_open_files()

// Git
git_status(doc_path) -> GitStatus
git_diff(doc_path) -> String

// WikiLinks / backlinks
get_backlinks(doc_path) -> Vec<DocumentInfo>
get_wikilinks(doc_path) -> Vec<String>
resolve_wikilink(target, doc_dir) -> Option<String>

// Templates
list_templates() -> Vec<Template>
get_template(id) -> Option<Template>
save_template(id, name, category, description, content)
delete_template(id)
apply_template(id) -> String

// Presentation
render_slides(markdown, doc_path) -> SlideDeck

// TTS
tts_get_voices(engine) -> Vec<EdgeVoice>
tts_speak(engine, text, voice_id) -> String  // base64 audio

// Logging / startup
log_frontend(level, message)
take_pending_open() -> Vec<String>
```

### Events emitted from Rust

- `open-file` — OS file association / argv open request.
- `markz:workspace-changed` — workspace directory changed externally.
- `markz:file-externally-changed` — an open file changed on disk.
- `markz:log` — log entry to the frontend Debug Panel.
- `markz:scroll-to-heading` — outline ↔ editor/preview heading navigation.

### Frontend Architecture

- **Framework:** Svelte 5 (lightweight, fast, excellent TypeScript support).
- **Editor:** CodeMirror 6 with Markdown mode, custom lint/spellcheck, snippets, smart list continuation, auto-pair delimiters, optional Vim mode, slide-break gutter, and minimap.
- **Preview:** Sanitized HTML in a scrollable container; KaTeX, Mermaid, and `highlight.js` are loaded on demand and post-processed in `requestAnimationFrame` chunks.
- **Scroll sync:** Heading-aware bidirectional sync with a ratio-based fallback; uses a source-based lock to avoid feedback loops.
- **State:** Svelte stores in `src/lib/` — `tabStore`, `sessionStore`, `workspaceStore`, `debugLogStore`, `themeStore`, etc.

---

## 6. Implementation Roadmap

All originally planned phases are now shipped. The sections below mark every item `[x]` and add the additional capabilities that landed after the initial plan.

### Phase 0: Foundation — shipped
- [x] Set up workspace crate structure (`crates/*`, `src-tauri`)
- [x] Tauri hello-world with dual-pane layout
- [x] Integrate CodeMirror 6
- [x] Basic IPC: editor → Rust → HTML preview

### Phase 1: Core Engine — shipped
- [x] `markz-core`: `pulldown-cmark` integration, AST, HTML renderer
- [x] Frontmatter parsing (YAML/TOML)
- [x] TOC generation
- [x] Basic scroll sync
- [x] File I/O + autosave
- [x] Document statistics (`markz_core::stats`)

### Phase 2: Rich Features — shipped
- [x] Syntax highlighting via `highlight.js` (loaded on demand)
- [x] Mermaid diagram support
- [x] KaTeX math rendering
- [x] Table of contents generation
- [x] Outline sidebar
- [x] Footnotes
- [x] WikiLinks + backlinks panel

### Phase 3: Image Pipeline — shipped
- [x] Clipboard paste handling
- [x] Drag-and-drop support
- [x] Auto-copy to `assets/` folder
- [x] Path rewriting in Markdown
- [x] Single `save_image` command (merged from separate paste/drop commands in v0.8.66)

### Phase 4: Converters — shipped
- [x] JIRA wiki markup converter
- [x] Confluence storage format converter
- [x] Slack mrkdwn converter
- [x] GitHub-flavored Markdown converter
- [x] Native DOCX converter
- [x] "Copy as..." context menus
- [x] Pandoc export/copy integration (DOCX/PDF/HTML/EPUB + HTML/RTF clipboard)

### Phase 5: Engineering Features — shipped
- [x] RFC, ADR, design doc, bug report, test plan, PR description, meeting notes, weekly status templates
- [x] User-defined templates (save/delete)
- [x] Snippets library (editor toolbar + expansions)
- [x] Quick search / global workspace search (`Ctrl+Shift+F`)
- [x] Command palette (`Ctrl+Shift+P`) and Quick Open (`Ctrl+P`)
- [x] Workspace / folder mode (`Ctrl+Shift+O`)
- [x] VS Code-style activity bar (Files, Outline, Links)
- [x] File watcher auto-refresh (`notify` crate)
- [x] Session restore including workspace path

### Phase 6: Polish & Release — shipped / ongoing
- [x] Theme system (light/dark + 17 curated presets incl. WGSN palettes)
- [x] Keyboard shortcuts
- [x] Settings UI (categorized, searchable)
- [x] CI/CD pipeline (GitHub Actions + Playwright E2E)
- [x] Release builds + auto-updater
- [x] Markdown file associations on all platforms
- [x] Single-instance file open from OS
- [x] Pin tabs, draggable tabs, tab context menu
- [x] Presentation mode (`F5`) with slide boundaries
- [x] Debug log panel (`Ctrl+Shift+Y`)
- [x] Vim mode option
- [x] Vertical/horizontal split direction toggle
- [x] Print to PDF (hidden iframe, light theme forced)
- [x] Git status + diff panel

### Still Outstanding

Per `ROADMAP.md`, these items are explicitly deferred:

- [ ] **Split editor (two editor panes)** — not started.
- [ ] **Plugin architecture (internal only)** — not started; user-facing plugins deferred.
- [ ] **Collaborative editing (Git-based conflict visualization)** — not started.

---

## 7. Key Design Decisions

1. **AST-first architecture:** All conversions go through a shared AST — no string-to-string regex hell. This prevents the MCP-server class of bugs.

2. **`pulldown-cmark` for parsing:** Fastest option, good enough GFM support. A `comrak` backend remains a future option if GitHub parity becomes critical.

3. **Confluence Storage Format over Wiki Markup:** Storage format is what Confluence expects on paste; wiki markup is legacy.

4. **Workspace crates over monolith:** Clean separation, independently testable, and a foundation for CLI tools later.

5. **Svelte over React/Vue:** Smaller bundle, faster, less complexity for a desktop app.

6. **Rust-first, thin frontend:** Parsing, rendering, conversion, file I/O, image handling, and Git operations live in Rust; the frontend handles UI shell, editor, preview, and IPC only.

7. **On-demand heavy libraries:** Mermaid, KaTeX, and `highlight.js` are lazy-loaded to keep the initial bundle small and startup fast.

---

## 8. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Scroll sync accuracy | Low | High | Heading-aware sync with ratio fallback; source-based lock prevents feedback loops |
| `highlight.js` bundle size | Low | Low | Lazy-load only when needed; only common languages bundled |
| Confluence format changes | Low | Medium | Abstract macro generation, easy to update |
| Tauri platform quirks | Medium | Low | Test early on all platforms; CI runs Playwright E2E on Linux |
| Startup time > 300 ms | Low | High | Lazy-load heavy libs, async disk I/O, deferred preview rendering, profile-guided polish |
| Pandoc not installed | High | Low | Graceful fallback to native converters; availability check in UI |

---

*Prepared for Zero. Reflects the v0.8.66 shipping codebase.*
