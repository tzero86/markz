# MarkZ Engineering Roadmap

> This document tracks planned refactors, features, and bugfixes. Update as work progresses.
>
> **Current version:** v0.8.66
> **Last updated:** 2026-07-08
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

## Completed Phases

### Phase 0: Foundation (v0.1.0 – v0.3.0)
- [x] Tauri + Svelte 5 scaffold
- [x] CodeMirror 6 integration with syntax highlighting
- [x] Live preview with `pulldown-cmark`
- [x] Dark/light theme system
- [x] Basic file open/save via Tauri dialog
- [x] KaTeX math rendering
- [x] Mermaid diagram support
- [x] DOCX export (native converter)
- [x] Image paste/drop with automatic save to `assets/`
- [x] Settings persistence
- [x] Auto-save (setting + timer)
- [x] Content zoom (50–300%)
- [x] Word wrap toggle
- [x] Line numbers & minimap
- [x] Outline panel (`Ctrl+B`)
- [x] View mode toggle (split/editor/preview)
- [x] Template gallery (RFC, ADR, etc.)
- [x] Text to Speech (Edge + Windows SAPI5)
- [x] Session restore (tabs + workspace)

### Phase 1: Core UX (v0.4.0 – v0.5.2)
- [x] Eliminate `documentStore` — `tabStore` as single source of truth
- [x] Find & Replace (`Ctrl+H` / `Ctrl+F`)
- [x] Frontmatter parsing (YAML/TOML)
- [x] Document statistics (words, chars, reading time, Flesch scores)
- [x] Custom CSS themes injection
- [x] LRU preview cache
- [x] `lib.rs` split into 8 focused command modules
- [x] E2E test suite (Playwright)
- [x] CI E2E job (`xvfb-run`)
- [x] Fix `replaceAll` `$` interpolation vulnerability
- [x] Fix DOCX export code-block corruption

### Phase 2: Engineering Differentiation (v0.6.0)
- [x] WikiLinks `[[Target]]` + `[[Target|Display]]`
- [x] Backlinks panel (incoming/outgoing references)
- [x] Full footnote support (AST + all 5 converters + preview)
- [x] Auto-save with debounce + interval setting
- [x] Text snippets / expansion (`rfc`, `adr`, `todo`, etc.)
- [x] Heading-anchor scroll sync (replaces ratio-based)
- [x] Inline table editing (double-click → grid editor)
- [x] Markdown lint + spellcheck (CodeMirror diagnostics)
- [x] Print to PDF (hidden iframe, light-theme forced)

### Phase 3: Power User Features (v0.7.0 – v0.8.4)
- [x] Git status indicator (branch, modified dot in status bar)
- [x] Git diff panel (`Ctrl+Shift+D`)
- [x] Pandoc integration (auto-detect, Word/PDF/HTML/EPUB export)
- [x] Workspace / folder mode (`Ctrl+Shift+O`)
- [x] Recursive file tree sidebar with search
- [x] VS Code-style activity bar (Files, Outline, Links)
- [x] File watcher auto-refresh (`notify` crate)
- [x] Session workspace restore
- [x] Fix Svelte 5 production prop destructuring bug
- [x] Table editor dark mode fix
- [x] GitHub Pages marketing site + README overhaul

### Phase 3.x: P0 UX Fixes (v0.8.6)
- [x] Settings modal search input
- [x] Tab bar overflow (scroll arrows + mouse wheel)
- [x] Smart list continuation (Enter continues lists, exits on empty)
- [x] Auto-pair markdown delimiters (`closeBrackets`) — standard brackets/quotes plus `*`, `_`, `` ` `` auto-close.
- [x] Preview inline search (`Ctrl+F` in preview) — search bar rendered in `PreviewPane.svelte` with prev/next, match highlighting, and counter; `Ctrl+F` wired when preview has focus.
- [x] Click-to-toggle task list checkboxes
- [x] Focus traps in all modals (Settings, Templates, Palette, TableEditor, SaveTemplateDialog, GitDiffModal) — `use:trapFocus` applied to all modal containers; first focusable element auto-focused on open.
- [x] Export progress toasts + breadcrumb in title bar
- [x] CodeMirror search panel themed to match app

### Phase 3.x: Presentation Mode (v0.8.6)
- [x] Slide deck generation from Markdown (H1/H2/--- boundaries)
- [x] Five slide types: Title, Section, Content, Code, Image
- [x] Keyboard navigation (arrows, space, Home, End, Escape, Q)
- [x] Progress dots and slide counter
- [x] Touch swipe support
- [x] Preview toolbar button to start presentation
- [x] Fix: strip thematic breaks from slide content (no empty slides)
- [x] Slide Break Editor — gutter markers to define custom presentation slide boundaries

---

## Phase 4: Editor Power Tools (Current)

Features that make MarkZ feel like a serious IDE for markdown.

### P1 — Command Palette (`Ctrl+Shift+P`)
- **Status:** `[x]` Done
- **Files:** New `src/components/ui/CommandPalette.svelte`, `src/lib/commandPalette.ts`
- **Scope:** Fuzzy search across all app commands (new file, open file, open folder, save, export formats, toggle sidebar, switch view mode, git diff, apply template, etc.). Commands are grouped under File / View / Export / Tools category headers and sorted by usage frecency when the query is empty; frequently used commands receive a small score boost while searching.
- **Effort:** Small (1 day)

### P1 — Quick Open / Recent Files (`Ctrl+P`)
- **Status:** `[x]` Done
- **Files:** Same palette component, `src/lib/workspaceStore.ts`, `src/lib/sessionStore.ts`
- **Scope:** Fuzzy search across recent files (from session) + workspace files (from `list_workspace_files`). Arrow keys to navigate, Enter to open, Escape to close.
- **Effort:** Small (½ day)

### P2 — Vim keybindings option
- **Status:** `[x]` Done
- **Files:** `src/components/editor/codemirror.ts`
- **Scope:** Integrate `@replit/codemirror-vim` as an optional extension. Toggle in Settings.
- **Effort:** Small (½ day)
- **Notes:** CodeMirror 6 vim plugin is mature. Mostly wiring + state persistence.

### P2 — Global find/replace across workspace
- **Status:** `[x]` Done
- **Files:** `src-tauri/src/commands/workspace.rs`, new UI component
- **Scope:** Multi-file grep + replace using existing `search_workspace` command. Results panel with file:line previews. Click to jump.
- **Effort:** Medium (2–3 days)

### P2 — Pin tabs
- **Status:** `[x]` Done
- **Files:** `src/lib/tabStore.ts`, `src/components/layout/TabBar.svelte`
- **Scope:** Right-click → "Pin Tab". Pinned tabs stay at the left, show only icon or shortened title, don't close with `Ctrl+W` unless explicitly unpinned.
- **Effort:** Small (½ day)

---

## Phase 5: Polish & Ecosystem
### P2 — Draggable tabs
- **Status:** `[x]` Done
- **Files:** `src/lib/tabStore.ts`, `src/components/layout/TabBar.svelte`
- **Scope:** Reorder tabs via drag-and-drop within pinned/unpinned groups. Cross-group drag prevented. Visual feedback on drop target. Persist order in session.
- **Effort:** Small (½ day)

### P2 — Debug Log Panel
- **Status:** `[x]` Done
- **Files:** `src/lib/debugLogStore.ts`, `src/components/layout/DebugPanel.svelte`, `src/lib/debug.ts`
- **Scope:** Collapsible bottom panel (VS Code terminal-style) showing operational logs. Resizable, level-filtered, ring-buffered (500 entries). Instruments exports, file I/O, workspace ops. Keyboard shortcut `Ctrl+Shift+Y`. Persisted state. Foundation for future plugin extensibility.
- **Effort:** Small (½ day)

### P2 — Theme Presets
- **Status:** `[x]` Done
- **Files:** `src/lib/themeStore.ts`, `src/components/settings/ThemePresetCard.svelte`, `src/styles/presets.css`
- **Scope:** 17 curated color palettes (8 classic + 8 WGSN 2026 dark + default) selectable from Settings → General → Color Preset. Live 4-color preview strip, immediate apply, persisted selection.
- **Effort:** Small (1 day)

### P2 — Custom Spellcheck Dictionary
- **Status:** `[x]` Done
- **Files:** `src/components/settings/categories/EditorSettings.svelte`, `src/components/editor/codemirror.ts`
- **Scope:** Per-user word list in Settings → Editor. Right-click any word in the editor to add it to the dictionary and suppress browser red underlines.
- **Effort:** Small (½ day)

### P2 — Markdown File Associations
- **Status:** `[x]` Done
- **Files:** `src-tauri/tauri.conf.json`
- **Scope:** Register MarkZ as an OS editor for `.md`, `.markdown`, `.mdx`, and `.mdown`. Double-clicking a Markdown file launches MarkZ; if already running, the existing window opens the file in a new tab.
- **Effort:** Small (½ day)

### P2 — Split editor (two editor panes)
- **Status:** `[ ]`
- **Files:** `src/App.svelte`, `src/components/editor/EditorPane.svelte`
- **Scope:** Horizontal split: two editor panes side by side, or editor + preview + editor. Useful for comparing docs.
- **Effort:** Medium (2 days)

### P2 — Plugin architecture (internal only)
- **Status:** `[ ]`
- **Files:** New `crates/markz-plugin/` or `src/lib/plugins/`
- **Scope:** Not user-facing plugins yet. Internal refactoring to make converters, templates, and snippets load from a well-defined plugin interface. Prepares ground for future external plugins.
- **Effort:** Large (1 week)

### P3 — Collaborative editing (Git-based)
- **Status:** `[ ]`
- **Scope:** Not real-time OT. Instead: merge conflict visualization when opening a file with Git conflicts. Side-by-side conflict resolution UI.
- **Effort:** Large (1 week)

---

## Known Bugs / Follow-ups

| Issue | Status | Notes |
|-------|--------|-------|
| Activity bar unresponsive in production (v0.8.2) | `[x]` Done | Fix applied in `5baee85` (Svelte 5 prop destructuring workaround). Confirmed fixed. |
| E2E `Ctrl+W` keyboard test | `[x]` Skipped | Playwright Chromium intercepts browser shortcut. Close-tab logic covered in `tabs.spec.ts`. |
| Settings button lacks `data-testid` | `[x]` Done | Fixed in v0.8.37. Added `data-testid="settings-button"` to TitleBar settings button. |

---

## What NOT to Do

| Feature | Reason |
|---------|--------|
| Plugin system (user-facing) | Architecture not ready; user base too small. Obsidian's took years. |
| Mobile app | Out of scope for a desktop engineering tool. |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-08 | v0.8.66 release — workspace replace-all fix, panes stay mounted across view modes, merged image paste/drop into single `save_image` command. |
| 2026-07-06 | Markdown file associations — MarkZ registers as an OS editor for `.md`/`.markdown`/`.mdx`/`.mdown` with single-instance reuse. |
| 2026-07-06 | Copy as Word (Pandoc) — copy formatted HTML to clipboard for pasting into Word. |
| 2026-06-16 | Stable workspace file tree — tree no longer auto-follows the active tab; breadcrumb navigation; non-markdown files visible. |
| 2026-06-15 | Converter test coverage — 54 integration + 16 unit tests for JIRA, Confluence, Slack, and GitHub converters. |
| 2026-06-11 | WGSN 2026 Dark themes — 8 additional curated dark color palettes. |
| 2026-06-10 | Theme Presets — 8 curated color palettes selectable from Settings → General. |
| 2026-06-04 | Debug Log Panel — collapsible bottom panel with resizable height, level filtering, error badge, and instrumented operation logging. |
| 2026-05-30 | Settings/Help/About modal redesign — CSS grid field layout, consistent input widths, categorized shortcuts, removed unused HelpModal.svelte. |
| 2026-05-30 | Command Palette (`Ctrl+Shift+P`) and Quick Open (`Ctrl+P`) shipped. |
| 2026-05-28 | Initial roadmap created after codebase audit. |