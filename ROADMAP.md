# MarkZ Engineering Roadmap

> This document tracks planned refactors, features, and bugfixes across all phases. Each item has a status, priority, effort estimate, and owner. Update this file as work progresses.
>
> Last updated: 2026-05-28

---

## Legend

| Status | Icon | Meaning |
|--------|------|---------|
| Not Started | `[ ]` | No work done yet |
| In Progress | `[-]` | Actively being worked on |
| PR Open | `[#]` | Pull request submitted, awaiting review/merge |
| Done | `[x]` | Merged to master and released |
| Blocked | `[!]` | Blocked on external dependency or other task |

| Priority | Meaning |
|----------|---------|
| P0 | Critical — blocks users or causes data loss |
| P1 | High — significant UX improvement or bug fix |
| P2 | Medium — nice-to-have, competitive parity |
| P3 | Low — exploratory or future consideration |

---

## Phase 0: Stability (This Week)

Quick wins and bug fixes that improve reliability without architectural changes.

### P0 — Fix `replaceAll` `$` interpolation across the frontend
- **Status:** `[x]` Done (PR #8)
- **File:** `src/lib/docxPrep.ts`
- **Problem:** `String.prototype.replaceAll` treats `$$`, `$&`, `$'`, `` $` `` as special replacement tokens. Any `replaceAll(placeholder, userContent)` call is vulnerable.
- **Fix:** Use callback form: `replaceAll(placeholder, () => userContent)`.
- **Owner:** —
- **Notes:** Audit all `replaceAll` calls in `src/` and fix the pattern wherever user content flows into replacement strings.

### P1 — Implement auto-save (setting exists but is a no-op)
- **Status:** `[ ]`
- **Files:** `src/lib/documentStore.ts`, `src/components/editor/EditorPane.svelte`, `crates/markz-config/src/lib.rs`
- **Problem:** `Settings` has `auto_save: bool` and `auto_save_interval_seconds: u16`, but no timer ever reads these values or triggers saves.
- **Fix:** Add a debounced auto-save timer in the editor/document layer. Save to the existing `doc.path` if set; do nothing for untitled tabs.
- **Owner:** —
- **Effort:** Small (½ day)
- **Notes:** Should respect `isDirty` flag. Cancel timer on manual save.

### P1 — Add `ENABLE_FOOTNOTES` to pulldown-cmark parser options
- **Status:** `[ ]`
- **File:** `crates/markz-core/src/parser.rs`
- **Problem:** Footnotes are standard in GitHub Flavored Markdown and academic writing, but disabled.
- **Fix:** Add `Options::ENABLE_FOOTNOTES` to the default parser options. This is step 0 — full footnote AST support comes in Phase 2.
- **Owner:** —
- **Effort:** Small (1 hour)

### P1 — Fix scroll sync to use heading anchors instead of scroll ratio
- **Status:** `[ ]`
- **File:** `src/lib/scrollSync.ts`
- **Problem:** Ratio-based sync breaks when editor and preview have different vertical proportions (e.g., a code block expands the preview more than the editor).
- **Fix:** Map editor scroll position to the nearest heading above the cursor. Scroll the preview to the corresponding heading's `id` anchor.
- **Owner:** —
- **Effort:** Medium (1–2 days)
- **Notes:** Requires exposing heading line numbers from CodeMirror and mapping to preview DOM elements.

---

## Phase 1: Core UX (Next 2 Weeks)

Structural improvements and missing features that users expect from any serious editor.

### P0 — Single source of truth refactor: eliminate `documentStore`
- **Status:** `[ ]`
- **Files:** `src/lib/tabStore.ts`, `src/lib/documentStore.ts`, `src/App.svelte`, `src/components/editor/EditorPane.svelte`, `src/components/preview/PreviewPane.svelte`, `src/lib/keyboard.ts`, `src/lib/sessionStore.ts`
- **Problem:** `tabStore` and `documentStore` have a bidirectional sync loop with a `syncing` guard flag. Fragile, bypassable, causes dropped state during rapid tab switching.
- **Fix:** Make `tabStore` the single source of truth. Derive current document via `$derived(tabStore.activeTab)` in components. Remove `documentStore` entirely.
- **Owner:** —
- **Effort:** Medium (2–3 days)
- **Notes:** This is the most invasive refactor. Test thoroughly: tab switching, session restore, new/close/save flows.

### P1 — Find & Replace (`Ctrl+H`)
- **Status:** `[ ]`
- **File:** `src/components/editor/codemirror.ts`
- **Problem:** CodeMirror 6 has `@codemirror/search` with `replaceKeymap`, but it's not wired into the editor.
- **Fix:** Add `keymap.of([...defaultSearchKeymap, ...replaceKeymap])` to the editor extensions. Style the find/replace panel to match MarkZ's UI.
- **Owner:** —
- **Effort:** Small (½ day)

### P1 — Parse frontmatter into structured data
- **Status:** `[ ]`
- **Files:** `crates/markz-core/src/frontmatter.rs`, `crates/markz-core/src/ast.rs`
- **Problem:** Frontmatter is extracted as raw strings but never parsed. No access to `title`, `date`, `tags`, `author`, etc.
- **Fix:** Add `serde_yaml` and `toml` dependencies. Parse YAML/TOML frontmatter into a `metadata: HashMap<String, serde_json::Value>` field on `Frontmatter`. Expose to frontend via a Tauri command or include in the document state.
- **Owner:** —
- **Effort:** Medium (1–2 days)
- **Notes:** Use this to auto-populate document title in the tab bar, show tags in sidebar, etc.

### P2 — Document statistics panel
- **Status:** `[ ]`
- **Files:** `crates/markz-core/src/` (new `stats.rs`), `src/components/layout/StatusBar.svelte` or sidebar
- **Problem:** Only word count is shown. No reading time, sentence count, readability scores.
- **Fix:** New Rust module `markz_core::stats` computing: words, characters (with/without spaces), sentences, paragraphs, reading time (200 WPM), Flesch Reading Ease, Flesch-Kincaid Grade Level. Expose via Tauri command. Add a stats panel (sidebar or modal).
- **Owner:** —
- **Effort:** Small (1 day)

### P2 — Custom CSS themes
- **Status:** `[ ]`
- **Files:** `src/lib/themeStore.ts`, `src/styles/`, `src/components/settings/SettingsModal.svelte`
- **Problem:** Only hardcoded light/dark themes. Users can't match corporate branding or personal preferences.
- **Fix:** Add a `themes/` directory in the config folder. Allow `.css` files that override CSS variables. Add a theme picker in Settings. Allow custom `preview.css` globally or per-document.
- **Owner:** —
- **Effort:** Small (1 day)

### P2 — Replace preview content hash cache with an LRU
- **Status:** `[ ]`
- **File:** `src/components/preview/PreviewPane.svelte`
- **Problem:** `renderCache` is a `Map` with a hard cap of 10 entries but no eviction logic. The hash function (`hash()`) is a 32-bit FNV-like hash with collision risk.
- **Fix:** Replace with an actual LRU (using `Map` as LRU, or a tiny dependency). Use SHA-256 or a cryptographic hash for cache keys.
- **Owner:** —
- **Effort:** Small (½ day)

---

## Phase 2: Engineering Differentiation (Next Month)

Features that differentiate MarkZ from Typora, Zettlr, and Mark Text in the engineering-documentation niche.

### P1 — WikiLinks (`[[Internal Links]]`) + Backlinks panel
- **Status:** `[ ]`
- **Files:** `crates/markz-core/src/ast.rs`, `crates/markz-core/src/parser.rs`, `crates/markz-core/src/html.rs`, `src/components/layout/OutlineSidebar.svelte`
- **Problem:** Engineers writing RFCs/ADRs constantly reference other docs. No way to link or discover related documents.
- **Fix:**
  1. Add `Inline::WikiLink { target, display }` to AST.
  2. Detect `[[...]]` syntax in parser (opt-in via settings).
  3. Resolve `[[target]]` to `{doc_dir}/{target}.md` in HTML renderer.
  4. Add a "Backlinks" panel that scans all `.md` files in the document directory for `[[CurrentDoc]]` references.
- **Owner:** —
- **Effort:** Large (1 week)
- **Notes:** This is the biggest differentiator vs. open-source competitors.

### P1 — Full footnote support (AST + all renderers + DOCX)
- **Status:** `[ ]`
- **Files:** `crates/markz-core/src/ast.rs`, `crates/markz-core/src/parser.rs`, `crates/markz-core/src/html.rs`, `crates/markz-convert/src/docx.rs`, `crates/markz-convert/src/jira.rs`, `crates/markz-convert/src/confluence.rs`, `crates/markz-convert/src/slack.rs`, `crates/markz-convert/src/github.rs`
- **Problem:** Footnotes are standard in technical writing but completely unsupported.
- **Fix:**
  1. Add `Block::Footnote { label, blocks }` and `Inline::FootnoteReference(label)` to AST.
  2. Enable `ENABLE_FOOTNOTES` in parser (Phase 0 pre-work).
  3. Update HTML renderer: `<sup><a href="#fn-1">1</a></sup>` + `<div class="footnote">`.
  4. Update DOCX converter to use `docx-rs` footnote API.
  5. Text converters: render as parenthetical or endnote.
- **Owner:** —
- **Effort:** Medium (3–4 days)

### P2 — Snippets / text expansion
- **Status:** `[ ]`
- **Files:** New `crates/markz-snippets/`, `src/components/editor/`, `src/components/settings/SettingsModal.svelte`
- **Problem:** Engineers write repetitive structures: RFC headers, ADR templates, API doc blocks.
- **Fix:**
  1. Add a `snippets/` directory in config folder.
  2. JSON format: `{ "trigger": "rfc", "description": "RFC header", "body": ["# RFC-{NUMBER}: {TITLE}", ""] }`.
  3. CodeMirror: detect trigger word + `Tab`, expand with tab stops (`$1`, `$2`, `${3:default}`).
- **Owner:** —
- **Effort:** Medium (2–3 days)

### P2 — Inline table editing (WYSIWYG-style)
- **Status:** `[ ]`
- **Files:** `src/components/preview/PreviewPane.svelte`, `src/components/editor/editorCommands.ts`
- **Problem:** Markdown tables are painful to edit by hand. MarkZ has insert-table but no mutation after creation.
- **Fix:** Add a context menu on preview tables: add/remove row/column, delete row/column. Trigger edits to the markdown source via CodeMirror transactions.
- **Owner:** —
- **Effort:** Medium (2–3 days)

### P2 — Spell check / markdown lint
- **Status:** `[ ]`
- **Files:** `src/components/editor/codemirror.ts`, `src-tauri/src/lib.rs` (new commands)
- **Problem:** No spell checking or markdown-specific linting.
- **Fix:**
  - Spell check: integrate `hunspell`/`aspell` via Rust (tauri plugin or custom command), or use a WebAssembly spell checker with CodeMirror lint extension.
  - Markdown lint: implement `markdownlint`-style rules (inconsistent heading levels, missing alt text, trailing spaces, duplicate headings) as CodeMirror diagnostics.
- **Owner:** —
- **Effort:** Medium–Large (3–5 days)
- **Notes:** Start with spell check. Markdown lint can be a follow-up.

### P2 — Split `lib.rs` into command modules
- **Status:** `[ ]`
- **Files:** `src-tauri/src/lib.rs` → `src-tauri/src/commands/*.rs`
- **Problem:** `lib.rs` is 567 lines with 20+ commands mixed with helpers and types. Becoming a god file.
- **Fix:** Move commands into submodules: `commands/docx.rs`, `commands/convert.rs`, `commands/tts.rs`, `commands/session.rs`. Register in `lib.rs`.
- **Owner:** —
- **Effort:** Small (1 day)

---

## Phase 3: Power User Features (Following Month)

Advanced features for users who live in MarkZ daily.

### P2 — Pandoc integration for advanced export
- **Status:** `[ ]`
- **Files:** `src-tauri/src/commands/`, `src/components/layout/TitleBar.svelte`
- **Problem:** Native DOCX converter handles basics well but falls short on footnotes, citations, cross-references, and custom templates.
- **Fix:** Detect if `pandoc` is installed. Add "Export via Pandoc" option. Allow YAML frontmatter to configure Pandoc options (reference doc, bibliography, CSL). Fallback to native converter if Pandoc unavailable.
- **Owner:** —
- **Effort:** Medium (2–3 days)

### P2 — Print to PDF
- **Status:** `[ ]`
- **Files:** `src/components/preview/PreviewPane.svelte`, `src-tauri/src/commands/`
- **Problem:** No way to generate a PDF. PDF is the most common sharing format for finalized documents.
- **Fix:** Use WebView `window.print()` with a print-specific CSS stylesheet. Or integrate `paged.js` for paginated output with headers/footers.
- **Owner:** —
- **Effort:** Medium (2 days)

### P3 — Git integration (status, diff, blame)
- **Status:** `[ ]`
- **Files:** New `crates/markz-git/`, `src/components/editor/`, `src/components/layout/StatusBar.svelte`
- **Problem:** No visibility into whether the current file is modified, who last edited a line, or what changed.
- **Fix:**
  1. Use `git2` crate to read git status of the current file. Show "modified" indicator in status bar.
  2. "View Diff" command: side-by-side or inline diff view.
  3. "Git Blame" for current line (author/date in gutter tooltip).
- **Owner:** —
- **Effort:** Large (1 week)
- **Notes:** Start with status indicator only. Diff and blame are follow-ups.

---

## Test & CI Gaps

These are cross-cutting and should be addressed alongside the phases above.

### P1 — Unit tests for `docxPrep.ts` extraction logic
- **Status:** `[ ]`
- **File:** `src/lib/docxPrep.ts`
- **Problem:** The bug fixed in PR #8 had zero test coverage. The extraction/round-trip logic is pure string processing and testable.
- **Fix:** Extract the placeholder replacement logic into a pure function. Add `vitest` tests covering: code blocks with `$$`, inline code with `$var$`, multi-line content, valid math preservation.
- **Owner:** —
- **Effort:** Small (½ day)

### P1 — E2E test for DOCX export
- **Status:** `[ ]`
- **Files:** `e2e/titlebar.spec.ts`
- **Problem:** The mock for `export_to_docx` is a no-op: `export_to_docx: () => null`.
- **Fix:** Add an E2E test that triggers export and verifies the file is created (or at minimum that the command completes without throwing).
- **Owner:** —
- **Effort:** Small (½ day)

### P1 — Add E2E tests to CI
- **Status:** `[ ]`
- **File:** `.github/workflows/ci.yml`
- **Problem:** CI builds the app but never runs Playwright tests.
- **Fix:** Add an E2E job that installs Playwright browsers and runs `npm run test:e2e`.
- **Owner:** —
- **Effort:** Small (½ day)
- **Notes:** May need to run headless or with a virtual display on Linux (`xvfb-run`).

---

## What NOT to Do

These are explicitly out of scope. They don't align with MarkZ's target user or would introduce disproportionate complexity.

| Feature | Reason |
|---------|--------|
| Plugin system | Architecture not ready; user base too small. Obsidian's took years. |
| Cloud sync | Antithetical to offline-first, zero-telemetry brand. Users can use Dropbox/OneDrive on markdown files. |
| Real-time collaboration | Engineers collaborate via Git, not operational transforms. |
| Replace native DOCX with Pandoc | Native converter is a differentiator for users without Pandoc. Add Pandoc as an *option*, not a replacement. |
| Mobile app | Out of scope for a desktop engineering tool. |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-28 | Initial roadmap created after codebase audit and competitive analysis. |

