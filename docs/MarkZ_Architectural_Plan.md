# MarkZ — Architecture & Implementation Plan

## 1. Tech Stack Decision

### Winner: Tauri (confirmed)

| Criterion | Tauri | Electron | egui/iced |
|-----------|-------|----------|-----------|
| **Binary size** | ~3-5MB | ~150MB+ | N/A (native) |
| **Memory** | ~50-100MB | ~200-400MB | ~20-50MB |
| **Startup** | <200ms | ~1-2s | <100ms |
| **Rust core** | First-class | Node bridge required | Native |
| **Web tech UI** | Yes (WebView) | Yes (Chromium) | No |
| **Cross-platform** | Win/Mac/Lin | Win/Mac/Lin | Partial |
| **Security** | Process isolation | Shared memory | Native |
| **Ecosystem** | Growing fast | Mature | Small |

**Verdict:** Tauri is the clear choice. The plan's instinct was correct — Rust-first + WebView shell gives us the best of both worlds: native performance where it matters and modern web UI for the editor component.

### Editor Component Choice: **CodeMirror 6**

- Monaco (VSCode's editor) is heavier and more complex to integrate
- CodeMirror 6 is modular, fast, and has excellent Markdown mode support
- Native scroll sync APIs make dual-pane sync easier
- Smaller bundle, faster load

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri WebView Shell                       │
│  ┌──────────────────┐        ┌──────────────────┐             │
│  │   CodeMirror 6   │  IPC   │  Preview Pane    │             │
│  │  (Markdown Edit) │◄──────►│  (HTML Render)   │             │
│  └──────────────────┘        └──────────────────┘             │
│           │                           ▲                       │
│           │                         ┌─┴──────┐                │
│           ▼                         │ Scroll │                │
│  ┌──────────────────┐               │  Sync  │                │
│  │  Frontmatter UI  │               └────────┘                │
│  │  Outline Sidebar   │                                       │
│  │  File Tree (opt) │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Tauri Commands
┌─────────────────────────────────────────────────────────────┐
│                      Rust Core Engine                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Markdown │ │  HTML    │ │  Convert │ │  Image   │      │
│  │  Parser  │ │ Renderer │ │  Engine  │ │ Pipeline │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Scroll  │ │  Syntax  │ │ Template │ │  Config  │      │
│  │  Sync    │ │ Highlight│ │  Engine  │ │ (serde)  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐                                 │
│  │ File I/O │ │ Autosave │                                 │
│  │  Watch   │ │   Save   │                                 │
│  └──────────┘ └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Rust Module Breakdown

### Crate Structure (workspace)

```
markz/
├── Cargo.toml (workspace root)
├── crates/
│   ├── markz-core/           # Markdown parsing & rendering
│   ├── markz-convert/        # Format converters (JIRA, Confluence, Slack, GitHub)
│   ├── markz-images/         # Image pipeline
│   ├── markz-templates/      # Engineering doc templates
│   └── markz-config/         # Settings & config management
├── src-tauri/                # Tauri app shell
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/         # Tauri command handlers
│   │   └── state/            # App state management
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                      # Frontend (Svelte or vanilla TS)
│   ├── components/
│   ├── editor/
│   ├── preview/
│   └── styles/
└── tests/
```

### Core Crate: `markz-core`

```rust
// Key modules:
pub mod parser;      // pulldown-cmark + GFM extensions
pub mod ast;         // Document AST (owned, serializable)
pub mod html;        // HTML renderer
pub mod frontmatter; // YAML/TOML extraction
pub mod toc;         // Table of contents generation
pub mod links;       // Link validation & resolution
```

**Parser choice: `pulldown-cmark`**
- Fastest Rust Markdown parser (streaming, zero-copy where possible)
- GFM support via `pulldown-cmark-to-cmark` or custom extension
- Excellent for real-time preview (low latency)
- Exposes events → we can build our own AST on top

**Alternative: `comrak`**
- GitHub-flavored by default
- Slower but more compatible with GitHub's exact rendering
- Could be swapped in later if needed

**Decision:** Start with `pulldown-cmark`. If GitHub parity becomes critical, add `comrak` as a backend option.

### Convert Crate: `markz-convert`

```rust
pub mod jira;        // JIRA wiki markup
pub mod confluence;  // Confluence storage format (XHTML) + wiki markup
pub mod slack;       // Slack mrkdwn
pub mod github;      // GitHub Issues markdown
```

**Design pattern:**
- All converters take `markz_core::ast::Document` as input
- No string-to-string conversion (avoids the MCP-server bug of parsing JIRA as Markdown)
- Each converter walks the AST and emits target format

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

**Decision:** Implement **Storage Format (XHTML)** as primary target — it's what Confluence's editor expects on paste. Wiki markup as secondary/legacy option.

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

### Command API Surface

```rust
// Document commands
#[tauri::command]
async fn open_document(path: String) -> Result<DocumentInfo, Error>;

#[tauri::command]
async fn save_document(path: String, content: String) -> Result<(), Error>;

#[tauri::command]
async fn render_preview(markdown: String) -> Result<RenderResult, Error>;

// Conversion commands
#[tauri::command]
async fn convert_to_jira(markdown: String) -> Result<String, Error>;

#[tauri::command]
async fn convert_to_confluence(markdown: String) -> Result<String, Error>;

#[tauri::command]
async fn convert_to_slack(markdown: String) -> Result<String, Error>;

// Image commands
#[tauri::command]
async fn process_pasted_image(image_data: Vec<u8>, filename: String) -> Result<ImageResult, Error>;

#[tauri::command]
async fn process_dropped_image(path: String) -> Result<ImageResult, Error>;

// Config commands
#[tauri::command]
async fn get_settings() -> Result<Settings, Error>;

#[tauri::command]
async fn update_settings(settings: Settings) -> Result<(), Error>;
```

### Frontend Architecture

- **Framework:** Svelte 5 (lightweight, fast, excellent TypeScript support)
- **Editor:** CodeMirror 6 with Markdown mode + custom extensions
- **Preview:** Sanitized HTML in iframe or div with shadow DOM
- **Scroll sync:** Bidirectional mapping between editor lines and preview DOM nodes

---

## 6. Implementation Roadmap

### Phase 0: Foundation (Week 1)
- [ ] Set up workspace crate structure
- [ ] Tauri hello-world with dual-pane layout
- [ ] Integrate CodeMirror 6
- [ ] Basic IPC: editor → Rust → HTML preview

### Phase 1: Core Engine (Week 2-3)
- [ ] `markz-core`: pulldown-cmark integration
- [ ] AST definition + HTML renderer
- [ ] Frontmatter parsing (YAML/TOML)
- [ ] Basic scroll sync
- [ ] File I/O + autosave

### Phase 2: Rich Features (Week 4-5)
- [ ] Syntax highlighting (tree-sitter via syntastica or femark approach)
- [ ] Mermaid diagram support
- [ ] MathJax/KaTeX rendering
- [ ] Table of contents generation
- [ ] Outline sidebar

### Phase 3: Image Pipeline (Week 6)
- [ ] Clipboard paste handling
- [ ] Drag-and-drop support
- [ ] Auto-copy to assets folder
- [ ] Path rewriting in Markdown
- [ ] Optional compression

### Phase 4: Converters (Week 7-8)
- [ ] JIRA wiki markup converter
- [ ] Confluence storage format converter
- [ ] Slack mrkdwn converter
- [ ] GitHub Issues formatter
- [ ] "Copy as..." context menus

### Phase 5: Engineering Features (Week 9)
- [ ] RFC template
- [ ] ADR template
- [ ] Design doc template
- [ ] Snippets library
- [ ] Quick search

### Phase 6: Polish & Release (Week 10)
- [ ] Theme system (light/dark)
- [ ] Keyboard shortcuts
- [ ] Settings UI
- [ ] CI/CD pipeline
- [ ] Release builds

---

## 7. Key Design Decisions

1. **AST-first architecture:** All conversions go through a shared AST — no string-to-string regex hell. This prevents the MCP-server class of bugs.

2. **Pulldown-cmark for parsing:** Fastest option, good enough GFM support. Add comrak backend later if needed.

3. **Confluence Storage Format over Wiki Markup:** Storage format is what Confluence expects on paste. Wiki markup is legacy.

4. **Workspace crates over monolith:** Clean separation, testable independently, potential for CLI tools later.

5. **Svelte over React/Vue:** Smaller bundle, faster, less complexity for a desktop app.

---

## 8. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scroll sync accuracy | Medium | High | Use line-marker approach, not pixel-perfect |
| Tree-sitter WASM size | Medium | Medium | Use syntect as fallback, lazy-load grammars |
| Confluence format changes | Low | Medium | Abstract macro generation, easy to update |
| Tauri platform quirks | Medium | Low | Test early on all platforms |
| Startup time >300ms | Low | High | Profile, lazy-load, minimize frontend bundle |

---

*Prepared for Zero. Ready to build when you are.*
