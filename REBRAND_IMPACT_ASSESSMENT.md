# Rebrand Impact Assessment: MarkZ → {NEW_NAME}

> **Prepared:** 2026-05-31
> **Scope:** Complete audit of all `MarkZ` / `markz` references across codebase, infrastructure, user data, and external presence.
> **Assumption:** New name is lowercase-safe for identifiers (e.g., `nova`, `scribe`, `forge`).

---

## Executive Summary

A full rebrand touches **~70 files** across **9 categories**. The work splits into three tiers:

| Tier | Effort | Description |
|------|--------|-------------|
| **Must-have (P0)** | 1 day | Code identifiers, config paths, Tauri app ID, window titles, localStorage keys. Without these the app breaks or loses user data. |
| **User-facing (P1)** | 1–2 days | README, site, docs, logos, about dialog, splash screen, release names. |
| **Infrastructure (P2)** | 2–3 days | GitHub repo rename, Pages URL, CI workflows, release artifacts, social links. |

**Total estimated effort:** 3–5 days of focused work, plus coordination with GitHub/repo admin.

---

## 1. Code & Build System (CRITICAL — P0)

### 1.1 Rust Workspace Crate Names

| Current | Files | Impact |
|---------|-------|--------|
| `markz` (app crate) | `src-tauri/Cargo.toml`, `src-tauri/src/main.rs` | Binary name, Tauri bundle identifier. Changing breaks updater signatures. |
| `markz-core` | `crates/markz-core/Cargo.toml` | 15+ `use markz_core::…` across Rust source. |
| `markz-convert` | `crates/markz-convert/Cargo.toml` | 5+ import sites. |
| `markz-config` | `crates/markz-config/Cargo.toml` | 4+ import sites, also config dir path. |
| `markz-images` | `crates/markz-images/Cargo.toml` | 3+ import sites. |
| `markz-templates` | `crates/markz-templates/Cargo.toml` | 3+ import sites. |

**Action:** Rename crate directories and update all `Cargo.toml` name fields + all `use markz_*::` statements + all `path = "…"` deps.

**Risk:** `Cargo.lock` will churn heavily. A `cargo update -w` is required. Any external crates referencing these (none currently) would break.

### 1.2 Tauri Configuration

| File | Lines | Current | Impact |
|------|-------|---------|--------|
| `src-tauri/tauri.conf.json` | 3 | `"productName": "MarkZ"` | Window title bar, OS menu bar, installer name. |
| | 5 | `"identifier": "dev.markz.app"` | **CRITICAL:** macOS bundle ID, Windows registry, Linux .desktop file. Changing this makes the OS treat it as a *different app* — existing user settings in OS keychain / notification permissions are lost. |
| | 15 | `"title": "MarkZ"` | Window title. |
| | 33 | `"description": "Default capabilities for MarkZ"` | Tauri capabilities description. |
| | 62 | `"https://github.com/tzero86/markz/releases/latest/download/latest.json"` | Updater endpoint URL. |

**Action:** Update all fields. The `identifier` change is the most destructive — it forces a clean install on all users.

**Mitigation:** Keep the old identifier if user data migration is prioritized, OR accept the loss and document it in release notes.

### 1.3 npm / Node.js

| File | Lines | Current | Impact |
|------|-------|---------|--------|
| `package.json` | 2 | `"name": "markz"` | Published package name (not published to npm, but used locally). |
| `package-lock.json` | 2, 8 | `"name": "markz"` | Will auto-regenerate on `npm install`. |

### 1.4 Rust Source Code References

**Crate imports (~45 occurrences):**
- `use markz_core::…` — 12+ files
- `use markz_convert::…` — 6 files
- `use markz_config::…` — 4 files
- `use markz_images::…` — 3 files
- `use markz_templates::…` — 3 files
- `markz_lib::run()` in `src-tauri/src/main.rs`

**Internal strings:**
- `crates/markz-images/src/lib.rs:32` — `"MarkZ/assets"` (fallback documents dir)
- `crates/markz-images/src/lib.rs:63` — docs comment references `MarkZ/assets`
- `crates/markz-config/src/lib.rs:76` — `dirs::config_dir().map(|d| d.join("markz"))`
- `crates/markz-templates/src/lib.rs:38` — `dirs::config_dir().map(|d| d.join("markz").join("templates"))`
- `src-tauri/src/lib.rs:134` — `dirs::config_dir()?.push("markz")` (session path)
- `src-tauri/src/lib.rs:152` — `tauri_plugin_log` file name `"markz"`
- `src-tauri/src/commands/pandoc.rs:47` — temp file prefix `markz-pandoc-`
- `src-tauri/src/commands/watcher.rs:9,32` — event name `markz:workspace-changed` (comment + emit)

### 1.5 Frontend Custom Event Namespace

All app-wide events use the `markz:` prefix. These are internal-only and safe to rename:

```
markz:toggle-sidebar      markz:settings-changed     markz:open-git-diff
markz:workspace-changed   markz:set-activity          markz:set-view-mode
markz:open-settings       markz:open-help             markz:trigger-export
markz:trigger-print       markz:open-palette          markz:export-docx
markz:print-pdf           markz:start-presentation    markz:print
```

**Files affected:** `src/App.svelte`, `src/lib/keyboard.ts`, `src/components/layout/TitleBar.svelte`, `src/components/preview/PreviewPane.svelte`, `src/components/editor/EditorPane.svelte`, `src/components/settings/SettingsModal.svelte`, `src/components/ui/CommandPalette.svelte`, `src/components/templates/TemplateBrowser.svelte`, `src-tauri/src/commands/watcher.rs`, and E2E tests.

**Count:** ~60 event string occurrences.

### 1.6 Global Window Properties (E2E / Debug)

| Current | File | Purpose |
|---------|------|---------|
| `window.__markz_editorCommands` | `src/components/editor/editorCommands.ts` | E2E test access to editor commands |
| `window.__markz_editorView` | `src/components/editor/EditorPane.svelte` | E2E access to CM6 instance |
| `window.__markz_sessionRestored` | `src/lib/sessionStore.ts` | E2E signal |

---

## 2. User Data & Config Paths (CRITICAL — P0)

These paths determine where user settings, sessions, templates, and logs live. **Changing them without migration loses all user data.**

| OS | Current Path | Contents |
|----|-------------|----------|
| macOS | `~/Library/Application Support/markz/` | Session, settings, templates, logs |
| Windows | `%APPDATA%/markz/` | Same |
| Linux | `~/.config/markz/` | Same |
| All | `~/Documents/MarkZ/assets/` | Default image paste directory (when doc has no path) |

### 2.1 LocalStorage Keys (Browser/WebView)

| Key | File | Data |
|-----|------|------|
| `markz-session` | `src/lib/sessionStore.ts`, E2E | Open tabs, active tab |
| `markz-recent-files` | `src/lib/recentFiles.ts` | Recent file paths |
| `markz-theme` | `src/lib/themeStore.ts` | Dark/light/system preference |
| `markz-content-zoom` | `src/lib/contentZoomStore.ts` | Preview zoom level |

### 2.2 Custom CSS Style ID

| Current | File | Element ID in DOM |
|---------|------|-------------------|
| `markz-custom-css` | `src/App.svelte` | `<style id="markz-custom-css">` |

---

## 3. User-Facing Branding (HIGH — P1)

### 3.1 Visual Identity

| Asset | File | Description |
|-------|------|-------------|
| Logo | `src/assets/logo.png` | 96×96 app icon (also referenced in README, Settings About) |
| Icons | `src-tauri/icons/*.png` | macOS .icns, Windows .ico, iOS/Android sizes |
| Icon source | `src-tauri/icons/icon-source.png` | Source asset for regenerating icons |
| Favicon | `site/index.html` | No dedicated favicon; uses inline SVG |

**Action required:** Generate new logo → run `tauri icon` to regenerate all platform icon sets.

### 3.2 In-App Text

| Location | File | Current Text |
|----------|------|-------------|
| Window title | `index.html` | `<title>MarkZ</title>` |
| Splash screen | `index.html` | `<span class="app-name">MarkZ</span>` |
| Title bar | `src/components/layout/TitleBar.svelte:249` | `<span class="app-name">MarkZ</span>` |
| About dialog | `src/components/settings/SettingsModal.svelte:507-508` | Logo alt text + `<span class="logo-text">MarkZ</span>` |
| Settings test | `e2e/settings.spec.ts:139` | Expects `.logo-text:has-text("MarkZ")` |
| Preview font | `src/components/preview/PreviewPane.svelte:557,728` | Font-family `"MarkZEmoji"` (internal name, harmless to keep or change) |
| Default welcome content | `src/lib/tabStore.ts` | 25+ "MarkZ" mentions in default tab text |
| Template content | `crates/markz-templates/src/lib.rs` | 15+ "MarkZ" mentions in built-in template |
| E2E mock HTML | `e2e/tauri-mock.ts` | 20+ "MarkZ" mentions in mock HTML/MD |

### 3.3 Console / Debug Output

| Location | File | Text |
|----------|------|------|
| Startup log | `src/lib/debug.ts:26` | `=== MarkZ startup ===` |

---

## 4. Documentation (MEDIUM — P1)

| File | References |
|------|-----------|
| `README.md` | ~25 references: repo URLs, clone commands, crate names, feature descriptions |
| `CHANGELOG.md` | Header + all release notes mention "MarkZ" |
| `ROADMAP.md` | Header, feature descriptions, file paths |
| `AGENTS.md` | Extensive references to project name, docs filenames, architecture |
| `docs/MarkZ_App_Plan.md` | Filename + content |
| `docs/MarkZ_Architectural_Plan.md` | Filename + content |
| `docs/MarkZ_UI_UX_Design.md` | Filename + content |

---

## 5. Infrastructure & CI/CD (HIGH — P2)

### 5.1 GitHub Repository

| Aspect | Current | Impact of Rename |
|--------|---------|-----------------|
| Repo URL | `https://github.com/tzero86/markz` | All README links, site links, CI refs break unless GitHub redirect is preserved. |
| Pages URL | `https://tzero86.github.io/markz/` | Hardcoded in `.github/workflows/pages.yml:44`, site download links. |
| Releases | `https://github.com/tzero86/markz/releases` | 10+ links in `site/index.html`, README, CI. |

### 5.2 GitHub Actions Workflows

| File | Lines | Content |
|------|-------|---------|
| `.github/workflows/release.yml` | 20, 23 | Bundle name patterns: `markz_*_amd64.deb`, `markz_*_x64-setup.exe` |
| | 63 | Release name: `"MarkZ ${{ github.ref_name }}"` |
| `.github/workflows/pages.yml` | 44 | Comment referencing `https://tzero86.github.io/markz/` |

### 5.3 Marketing Site

`site/index.html` contains **~15** MarkZ references:
- Page title + meta description
- Nav logo text
- GitHub links (5)
- Download card links (3)
- Hero screenshot alt text
- Gallery alt text
- Footer links (4)
- Copyright / author credit

---

## 6. E2E Test Suite (MEDIUM — P1)

| File | References | Notes |
|------|-----------|-------|
| `e2e/app.spec.ts` | 2 | Welcome heading assertions |
| `e2e/sidebar-preview.spec.ts` | 2 | TOC heading + preview heading assertions |
| `e2e/settings.spec.ts` | 1 | About dialog logo text assertion |
| `e2e/session-restore.spec.ts` | 6 | `localStorage.setItem("markz-session", …)` |
| `e2e/screenshot-capture.spec.ts` | 1 | Editor content with `"Hello, MarkZ!"` |
| `e2e/editor.spec.ts` | 7 | `__markz_editorCommands` access |
| `e2e/titlebar.spec.ts` | 1 | `markz:print` event name |
| `e2e/tauri-mock.ts` | 25+ | Mock HTML, Markdown, template descriptions |

---

## 7. Data Migration Strategy (CRITICAL)

When the app identifier and config paths change, existing users lose:

1. **Settings** (font, theme, zoom, custom CSS, key bindings)
2. **Session** (open tabs, active tab, unsaved content)
3. **Recent files** list
4. **User templates** (saved in config dir)
5. **OS-level permissions** (notifications, file access on macOS)

### Recommended Migration Approach

Add a one-time migration in Rust on app startup (before `tauri::Builder::run()`):

```rust
// Pseudocode
fn migrate_from_markz() {
    let old_config = dirs::config_dir().map(|d| d.join("markz"));
    let new_config = dirs::config_dir().map(|d| d.join("nova"));
    if let (Some(old), Some(new)) = (old_config, new_config) {
        if old.exists() && !new.exists() {
            // Copy settings, session, templates
            std::fs::rename(&old, &new).ok();
        }
    }
}
```

Also add a JavaScript migration for localStorage keys:

```typescript
function migrateLocalStorage() {
  const keys = ["markz-session", "markz-recent-files", "markz-theme", "markz-content-zoom"];
  keys.forEach(oldKey => {
    const val = localStorage.getItem(oldKey);
    if (val !== null) {
      const newKey = oldKey.replace("markz", "nova");
      localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
  });
}
```

**Run migrations once, then remove in the following release.**

---

## 8. Execution Checklist

### Phase A: Preparation (before touching code)
- [ ] Finalize new name (lowercase-safe, domain-available)
- [ ] Design new logo (PNG source, 1024×1024+)
- [ ] Register new domain (if applicable)
- [ ] Reserve social handles (if applicable)

### Phase B: Code Rebrand (P0)
- [ ] Rename Rust crate directories + `Cargo.toml` names
- [ ] Update all `use markz_*::` imports
- [ ] Update `src-tauri/tauri.conf.json` identifier, productName, title
- [ ] Update `package.json` name
- [ ] Update config dir paths in Rust (`markz` → `nova`)
- [ ] Update localStorage keys in TypeScript
- [ ] Update custom CSS style ID
- [ ] Update temp file prefixes
- [ ] Update log file name
- [ ] Run `cargo update -w` and verify build
- [ ] Add data migration (Rust config + JS localStorage)

### Phase C: UI Text & Assets (P1)
- [ ] Generate new icon set with `tauri icon`
- [ ] Replace `src/assets/logo.png`
- [ ] Update all in-app text strings (window title, splash, title bar, about)
- [ ] Update default welcome tab content
- [ ] Update built-in template content
- [ ] Update E2E mock content
- [ ] Update `MarkZEmoji` font name (optional)

### Phase D: Documentation (P1)
- [ ] Rewrite README.md
- [ ] Update CHANGELOG.md header (keep historical entries)
- [ ] Update ROADMAP.md
- [ ] Rename `docs/MarkZ_*` files → `docs/{NEW_NAME}_*`
- [ ] Update AGENTS.md
- [ ] Update CSS file headers (cosmetic)

### Phase E: Infrastructure (P2)
- [ ] Rename GitHub repository
- [ ] Verify GitHub auto-redirect preserves old links
- [ ] Update `.github/workflows/release.yml` bundle names
- [ ] Update `.github/workflows/pages.yml` URL comments
- [ ] Update updater endpoint in `tauri.conf.json`
- [ ] Regenerate `site/index.html` with new branding
- [ ] Update all GitHub URLs in site and README
- [ ] Cut a release with new name + migration

### Phase F: Cleanup (post-release)
- [ ] Remove one-time migration code (next release)
- [ ] Verify old config dir can be safely deleted by users

---

## 9. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Users lose settings/session | High | High | Implement Rust + JS migration; test on all 3 OSes |
| macOS treats app as new (permissions lost) | Certain | Medium | Document in release notes; users re-grant permissions |
| Updater breaks (old app can't find new releases) | High | High | Ship one intermediate release with old identifier pointing to new updater URL; OR accept that old versions won't auto-update |
| Cargo/workspace build breaks | Medium | High | Full `cargo clean` + `cargo update -w`; verify all crate paths |
| E2E tests break | High | Low | Update all mock content and assertions |
| GitHub Pages 404s | Medium | Medium | GitHub auto-redirects repo Pages for 6+ months; update custom domains if any |
| External blog/posts link to old repo | N/A | Low | GitHub preserves redirects indefinitely for renamed repos |

---

## 10. Effort Estimate

| Task | Hours | Owner |
|------|-------|-------|
| Rust crate rename + import fixes | 2 | Rust dev |
| Tauri config + identifier change | 1 | Rust dev |
| Config path + data migration (Rust) | 3 | Rust dev |
| Frontend text + event rename + localStorage migration | 2 | Frontend dev |
| Logo + icon generation | 2 | Designer |
| E2E test updates | 1 | QA |
| README + docs rewrite | 2 | Writer |
| Site HTML update | 1 | Frontend dev |
| CI workflow updates | 0.5 | DevOps |
| GitHub repo rename + release | 1 | Admin |
| **Total** | **~15.5 hours** | |

---

*End of assessment. This document should be updated as the definitive new name is chosen and as work progresses.*
