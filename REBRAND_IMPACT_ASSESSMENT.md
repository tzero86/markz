# Rebrand Impact Assessment: MarkZ → {NEW_NAME}

> **Date:** 2026-05-31
> **Scope:** Exhaustive audit of every `MarkZ` / `markz` reference in the codebase, build system, infrastructure, user data paths, and external presence.
> **Assumption:** New name is identifier-safe in lowercase (e.g., `nova`, `scribe`).

---

## Executive Summary

A full rebrand touches **~75 files** across **10 categories**. The work splits into three tiers:

| Tier | Effort | What Breaks If Skipped |
|------|--------|----------------------|
| **P0 — Critical** | 1–2 days | App won't build, user data is lost, OS treats it as a different app |
| **P1 — User-facing** | 1–2 days | Users see old branding, docs are wrong, marketing site is stale |
| **P2 — Infrastructure** | 2–3 days | Releases fail, updater breaks, GitHub links 404 |

**Total estimated effort:** 3–6 days of focused work, plus GitHub admin coordination.

---

## 1. Rust Workspace — Crate Names & Imports (P0)

Six crates use the `markz_` prefix. Every crate name, directory name, `use` statement, and `Cargo.toml` dependency path must change.

| Current Crate | Directory | Files with `use` / `path` deps |
|--------------|-----------|-------------------------------|
| `markz` (app) | `src-tauri/` | `src-tauri/src/main.rs` (calls `markz_lib::run()`) |
| `markz-core` | `crates/markz-core/` | 15+ files: all converters, parser, renderer, stats, slides |
| `markz-convert` | `crates/markz-convert/` | `src-tauri/src/commands/convert.rs` |
| `markz-config` | `crates/markz-config/` | `src-tauri/src/commands/settings.rs`, `src-tauri/src/lib.rs` |
| `markz-images` | `crates/markz-images/` | `src-tauri/src/commands/documents.rs` |
| `markz-templates` | `crates/markz-templates/` | `src-tauri/src/commands/templates.rs` |

**Files requiring edits:**
- `Cargo.toml` (workspace root) — `authors`, `repository`
- `src-tauri/Cargo.toml` — `[package] name`, `description`, `[lib] name`, all `markz-*` deps
- `crates/*/Cargo.toml` — 6 files: `[package] name`, `markz-core` dependency
- `crates/markz-convert/src/*.rs` — `use markz_core::ast::*` in confluence, docx, github, jira, slack
- `crates/markz-templates/src/lib.rs` — `use markz_core::ast::*` (comment only, but still)
- `src-tauri/src/commands/*.rs` — convert, documents, presentation, settings, templates
- `src-tauri/src/lib.rs` — `use markz_core::…`, `use markz_convert::…`, `use markz_config::…`
- `src-tauri/src/main.rs` — `markz_lib::run()`
- `Cargo.lock` — auto-regenerates after `cargo update -w`

**Risk:** After renaming, `cargo check` will fail until every import is fixed. A global find-replace `markz_` → `nova_` (or equivalent) handles 90% of it.

---

## 2. Tauri Application Configuration (P0)

`src-tauri/tauri.conf.json` is the single most dangerous file to change. The `identifier` field determines how the OS tracks the app.

| Field | Current | Impact of Change |
|-------|---------|-----------------|
| `productName` | `"MarkZ"` | Window title bar, OS app menu, installer filename |
| `identifier` | `"dev.markz.app"` | **CRITICAL:** macOS bundle ID, Windows registry key, Linux `.desktop` file. Changing this makes the OS treat it as a *completely different application*. Existing users lose OS-level permissions (notifications, file associations, keychain entries). |
| `windows.title` | `"MarkZ"` | Default window title |
| `capabilities.description` | `"Default capabilities for MarkZ"` | Tauri security manifest text |
| `updater.endpoints` | `"https://github.com/tzero86/markz/releases/latest/download/latest.json"` | Auto-updater will 404 until the new release is published at the new URL |

**Mitigation for `identifier`:** Either (a) accept the OS-level reset and document it in release notes, or (b) keep the old identifier to preserve user data and permissions. Recommendation: **change it** — a rebrand without a new bundle ID is confusing, and users can re-grant permissions once.

---

## 3. User Data & Config Paths (P0)

These paths are hardcoded in Rust. Changing them **without a migration deletes all user data**.

| OS | Current Config Dir | Contents |
|----|-------------------|----------|
| macOS | `~/Library/Application Support/markz/` | settings.json, session.json, templates/, logs/ |
| Windows | `%APPDATA%\markz\` | same |
| Linux | `~/.config/markz/` | same |
| All | `~/Documents/MarkZ/assets/` | Default image paste fallback dir (when doc has no path) |

**Hardcoded locations:**
- `crates/markz-config/src/lib.rs:80` — `dirs::config_dir().map(|d| d.join("markz"))`
- `crates/markz-templates/src/lib.rs:38` — `dirs::config_dir().map(|d| d.join("markz").join("templates"))`
- `crates/markz-images/src/lib.rs:72` — `dirs::document_dir().map(|p| p.join("MarkZ"))`
- `src-tauri/src/lib.rs:134` — `dirs::config_dir()?.push("markz")` (session path)
- `src-tauri/src/lib.rs:152` — `tauri_plugin_log` file_name: `"markz"`
- `src-tauri/src/commands/pandoc.rs:47` — temp file prefix `markz-pandoc-{uuid}.md`

**localStorage keys (WebView):**
- `markz-session` — `src/lib/sessionStore.ts` (not hardcoded there, but E2E tests set it directly)
- `markz-recent-files` — `src/lib/recentFiles.ts:1`
- `markz-theme` — `src/lib/themeStore.ts:23,34`
- `markz-content-zoom` — `src/lib/contentZoomStore.ts:3`

**DOM element ID:**
- `markz-custom-css` — `src/App.svelte:51,56` (style tag ID for custom CSS injection)

---

## 4. Frontend Custom Event Namespace (P0)

All app-wide communication uses `markz:` prefix. ~60 occurrences across ~15 files.

**Event names:**
```
markz:toggle-sidebar        markz:settings-changed       markz:open-git-diff
markz:workspace-changed     markz:set-activity            markz:set-view-mode
markz:open-settings         markz:open-help               markz:trigger-export
markz:trigger-print         markz:open-palette            markz:export-docx
markz:print-pdf             markz:start-presentation      markz:print
```

**Files affected:**
- `src/App.svelte` — 20 event listeners
- `src/lib/keyboard.ts` — 6 event dispatches
- `src/components/editor/EditorPane.svelte` — 1 listener
- `src/components/layout/TitleBar.svelte` — 1 dispatch
- `src/components/preview/PreviewPane.svelte` — 1 listener
- `src/components/settings/SettingsModal.svelte` — 1 dispatch
- `src/components/ui/CommandPalette.svelte` — 9 dispatches
- `src/components/templates/TemplateBrowser.svelte` — likely references
- `src-tauri/src/commands/watcher.rs` — 1 emit (`markz:workspace-changed`)
- `e2e/titlebar.spec.ts` — 1 listener test

**Scope:** Internal-only. Safe to bulk-rename with no external impact.

---

## 5. Window Global Properties (P1)

Used for E2E test access and debug:

| Property | File | Purpose |
|----------|------|---------|
| `window.__markz_editorCommands` | `src/components/editor/editorCommands.ts:248` | E2E access to editor toolbar actions |
| `window.__markz_editorView` | `src/components/editor/EditorPane.svelte` | E2E access to CodeMirror instance |
| `window.__markz_sessionRestored` | `src/lib/sessionStore.ts` | E2E signal that session restore completed |

---

## 6. In-App User-Facing Text (P1)

### 6.1 Window / Splash / Title Bar

| Location | File | Text |
|----------|------|------|
| Browser tab title | `index.html:7` | `<title>MarkZ</title>` |
| Splash screen | `index.html:78` | `<span class="app-name">MarkZ</span>` |
| Title bar brand | `src/components/layout/TitleBar.svelte:249` | `<span class="app-name">MarkZ</span>` |
| About dialog logo | `src/components/settings/SettingsModal.svelte:527-528` | `alt="MarkZ logo"` + `<span class="logo-text">MarkZ</span>` |

### 6.2 Default Welcome Content

`src/lib/tabStore.ts` contains the default tab text shown on first launch — **25+ "MarkZ" mentions** including headings, body text, code samples (`println!("Hello, MarkZ!")`), image URLs (`picsum.photos/seed/markz1`), and the closing line.

### 6.3 Built-in Template

`crates/markz-templates/src/lib.rs` — the `FORMATTING_TEST` built-in template contains **15+ "MarkZ" mentions** in headings, descriptions, code samples, and image URLs.

### 6.4 E2E Mock Data

`e2e/tauri-mock.ts` — `MOCK_HTML` and `FORMATTING_TEST_MD` contain **20+ "MarkZ" mentions**. These are what E2E tests assert against.

### 6.5 Preview Font Face

`src/components/preview/PreviewPane.svelte:557` — `@font-face { font-family: "MarkZEmoji"; … }`. This is an internal CSS font name; harmless to keep or change.

### 6.6 Debug Output

`src/lib/debug.ts:26` — `console.info("=== MarkZ startup ===")`

---

## 7. Documentation (P1)

| File | References | Notes |
|------|-----------|-------|
| `README.md` | ~30 | Title, badges, clone commands, crate names, feature descriptions, architecture diagram |
| `CHANGELOG.md` | 1+ | Header line. Historical entries should keep the old name for accuracy. |
| `ROADMAP.md` | 5+ | Title, feature descriptions, file paths |
| `AGENTS.md` | 15+ | Extensive references to project name, docs filenames, architecture |
| `docs/MarkZ_App_Plan.md` | 10+ | Filename + content throughout |
| `docs/MarkZ_Architectural_Plan.md` | 15+ | Filename + crate names, architecture diagrams |
| `docs/MarkZ_UI_UX_Design.md` | 5+ | Filename + design philosophy text |
| `REBRAND_IMPACT_ASSESSMENT.md` | 20+ | This file itself (meta) |

---

## 8. Marketing Site (P1)

`site/index.html` — **~20 references**:
- Page `<title>` and `<meta name="description">`
- Nav logo text
- GitHub links (5): `github.com/tzero86/markz`
- Download links (3): releases/latest
- Hero screenshot `alt` text
- Gallery screenshot `alt` text
- Download section heading
- Footer links: Releases, Issues, Roadmap, License
- Copyright / author credit
- JavaScript: default gallery caption

---

## 9. CI/CD & Release Infrastructure (P2)

| File | Line | Content |
|------|------|---------|
| `.github/workflows/release.yml` | 20 | Bundle name: `markz_*_amd64.deb` |
| | 23 | Bundle name: `markz_*_x64-setup.exe` |
| | 63 | Release name: `"MarkZ ${{ github.ref_name }}"` |
| `.github/workflows/pages.yml` | 44 | Comment: `https://tzero86.github.io/markz/` |
| `Cargo.toml` (workspace) | 9 | `authors = ["MarkZ Contributors"]` |
| | 11 | `repository = "https://github.com/zero/markz"` *(note: appears to be a typo, should be `tzero86`)* |
| `package.json` | 2 | `"name": "markz"` |
| `package-lock.json` | 2, 8 | `"name": "markz"` (auto-regenerates) |

---

## 10. Visual Assets (P1)

| Asset | Path | Platform |
|-------|------|----------|
| App logo (frontend) | `src/assets/logo.png` | In-app: README, Settings About |
| Icon source | `src-tauri/icons/icon-source.png` | Source for `tauri icon` generator |
| macOS icon | `src-tauri/icons/icon.icns` | Generated from source |
| Windows icon | `src-tauri/icons/icon.ico` | Generated from source |
| Linux/general | `src-tauri/icons/icon.png` | Generated from source |
| Android icons | `src-tauri/icons/android/mipmap-*/` | 5 density buckets |
| iOS icons | `src-tauri/icons/ios/AppIcon-*.png` | 10 sizes |
| Square logos | `src-tauri/icons/Square*.png` | Windows Store, etc. |

**Action:** Design new logo → run `tauri icon /path/to/new-source.png` to regenerate all platform icon sets.

---

## 11. Data Migration Strategy (P0 — Do Not Skip)

When config paths change, existing users lose:
1. **Settings** — fonts, themes, zoom, custom CSS, TTS preferences, auto-save
2. **Session** — open tabs, active tab, unsaved content
3. **Recent files** list
4. **User templates** — anything saved via Settings > Templates
5. **OS permissions** — notifications, file associations (due to bundle ID change)

### Recommended: One-Time Migration on Startup

**Rust side** (in `src-tauri/src/lib.rs`, before `tauri::Builder::run()`):

```rust
fn migrate_user_data() {
    let old_config = dirs::config_dir().map(|d| d.join("markz"));
    let new_config = dirs::config_dir().map(|d| d.join("nova")); // or new name

    if let (Some(old), Some(new)) = (old_config, new_config) {
        if old.exists() && !new.exists() {
            // Try atomic rename first; fallback to copy
            if std::fs::rename(&old, &new).is_err() {
                // Copy recursively if rename fails (cross-device, permissions)
                copy_dir_all(&old, &new).ok();
            }
        }
    }
}
```

**JavaScript side** (in `src/main.ts` or `src/App.svelte`, on first mount):

```typescript
function migrateLocalStorage() {
  const mapping: Record<string, string> = {
    "markz-session": "nova-session",
    "markz-recent-files": "nova-recent-files",
    "markz-theme": "nova-theme",
    "markz-content-zoom": "nova-content-zoom",
  };
  for (const [oldKey, newKey] of Object.entries(mapping)) {
    const val = localStorage.getItem(oldKey);
    if (val !== null) {
      localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
  }
}
```

**Run once, remove in the next release.** Gate it with a `migration-v1-to-v2` flag in the new config dir so it doesn't run twice.

---

## 12. Execution Checklist

### Phase A: Prep
- [ ] Finalize new name (identifier-safe, domain-available)
- [ ] Design new logo (1024×1024+ PNG with transparency)
- [ ] Confirm GitHub repo rename plan (preserve redirects)

### Phase B: Code Rebrand (P0)
- [ ] Rename `crates/markz-*` dirs → `crates/{newname}-*`
- [ ] Update all `Cargo.toml` `[package] name` and `path` deps
- [ ] Update all `use markz_*::` imports across Rust source
- [ ] Update `src-tauri/src/main.rs` lib crate name
- [ ] Update `src-tauri/tauri.conf.json`: productName, identifier, title, description, updater URL
- [ ] Update `Cargo.toml` (workspace): authors, repository
- [ ] Update `package.json`: name
- [ ] Update Rust config paths: `markz` → `{newname}` (config dir, templates dir, assets dir, session path, log file)
- [ ] Update temp file prefix: `markz-pandoc-*` → `{newname}-pandoc-*`
- [ ] Update localStorage keys in TypeScript stores
- [ ] Update custom CSS style ID: `markz-custom-css` → `{newname}-custom-css`
- [ ] Rename all `markz:*` custom events → `{newname}:*`
- [ ] Rename window globals: `__markz_*` → `__{newname}_*`
- [ ] Run `cargo clean && cargo update -w && cargo check`
- [ ] Run `npm install` to regenerate package-lock.json

### Phase C: UI Text & Assets (P1)
- [ ] Generate icon set: `tauri icon src/assets/logo.png`
- [ ] Replace `src/assets/logo.png`
- [ ] Update `index.html`: title, splash screen app name
- [ ] Update `src/components/layout/TitleBar.svelte`: app name
- [ ] Update `src/components/settings/SettingsModal.svelte`: about dialog text
- [ ] Update `src/lib/tabStore.ts`: default welcome content (25+ mentions)
- [ ] Update `crates/markz-templates/src/lib.rs`: built-in template content
- [ ] Update `src/lib/debug.ts`: startup console log
- [ ] Update `MarkZEmoji` font name (optional)

### Phase D: E2E Tests (P1)
- [ ] Update `e2e/tauri-mock.ts`: MOCK_HTML, FORMATTING_TEST_MD
- [ ] Update `e2e/app.spec.ts`: "Welcome to MarkZ" assertions
- [ ] Update `e2e/sidebar-preview.spec.ts`: TOC heading assertions
- [ ] Update `e2e/settings.spec.ts`: logo text assertion
- [ ] Update `e2e/editor.spec.ts`: `__markz_editorCommands` → `__{newname}_editorCommands`
- [ ] Update `e2e/screenshot-capture.spec.ts`: editor content text
- [ ] Update `e2e/session-restore.spec.ts`: localStorage keys
- [ ] Update `e2e/titlebar.spec.ts`: event name

### Phase E: Documentation (P1)
- [ ] Rewrite `README.md` (keep historical accuracy in old changelog entries)
- [ ] Update `CHANGELOG.md` header
- [ ] Update `ROADMAP.md`
- [ ] Rename `docs/MarkZ_*.md` → `docs/{NEW_NAME}_*.md`
- [ ] Update `AGENTS.md`
- [ ] Update CSS file header comments (cosmetic)

### Phase F: Infrastructure (P2)
- [ ] Rename GitHub repository (`tzero86/markz` → `tzero86/{newname}`)
- [ ] Verify GitHub auto-redirect is active
- [ ] Update `.github/workflows/release.yml`: bundle name patterns, release name
- [ ] Update `.github/workflows/pages.yml`: URL comments
- [ ] Regenerate `site/index.html` with new branding and all GitHub URLs
- [ ] Update updater endpoint in `tauri.conf.json`

### Phase G: Release & Migration
- [ ] Implement Rust + JS data migration
- [ ] Cut release with migration + new branding
- [ ] Publish release notes explaining bundle ID change

### Phase H: Cleanup (next release)
- [ ] Remove one-time migration code
- [ ] Document that old config dir can be manually deleted

---

## 13. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Users lose settings/session | High | High | Rust + JS migration; test on macOS, Windows, Linux |
| macOS treats app as new (permissions lost) | Certain | Medium | Document in release notes |
| Updater breaks for old versions | High | High | Ship one transitional release with old identifier + new updater URL; OR accept old versions won't auto-update |
| Workspace build breaks | Medium | High | `cargo clean`, `cargo update -w`, full `cargo check` |
| E2E tests break | High | Low | Bulk update mock content + assertions |
| GitHub Pages 404 | Low | Medium | GitHub preserves repo redirects; update if custom domain |
| External links rot | N/A | Low | GitHub preserves repo redirects indefinitely |

---

## 14. Effort Estimate

| Task | Hours |
|------|-------|
| Rust crate rename + imports | 2 |
| Tauri config + identifier | 1 |
| Config path migration (Rust) | 3 |
| Frontend events + localStorage + globals | 2 |
| Logo + icon generation | 2 |
| E2E test updates | 1 |
| README + docs rewrite | 2 |
| Marketing site update | 1 |
| CI workflow updates | 0.5 |
| GitHub repo rename + release | 1 |
| **Total** | **~15.5 hrs** |

---

*End of assessment. Update as the definitive new name is chosen.*
