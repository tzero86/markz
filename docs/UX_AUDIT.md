# UX/UI Audit: MarkZ

> **Original audit date:** 2026-05-31  
> **Last refreshed:** 2026-07-08  
> **Scope:** Comprehensive review of current UI/UX against the design spec, usability heuristics, and competitive parity.  
> **Method:** Code review of layout, editor, preview, settings, modal, and workspace components against `CHANGELOG.md` and the current source tree.

---

## 1. Executive Summary

| Area | Score | Verdict |
|------|-------|---------|
| Visual Design | 8/10 | Strong token system, good dark/light themes and 17 color presets, minor inconsistencies remain |
| Information Architecture | 7/10 | Sidebar is now resizable, tabs overflow handled, file tree still lacks file-management actions |
| Interaction Design | 7/10 | Editor table-stakes are in (smart lists, auto-pair, checkbox toggle), preview search and history still missing |
| Accessibility | 6/10 | ARIA labels improved, focus trap only in some modals, no skip link, high-contrast preset added |
| Performance Perception | 8/10 | Fast startup, chunked preview post-processing, session restore no longer flashes |
| Content & Copy | 8/10 | Clear labels, good empty states, About credits now mention key libraries |

**Top 5 issues still to fix:**
1. **Preview inline search** — search helper code exists but there is no user-facing search bar or `Ctrl+F` wiring.
2. **File tree context menu** — no New File, Rename, or Delete in the workspace explorer.
3. **Command palette frecency/categories** — flat list, no learning from usage or grouping.
4. **Document navigation history** — no Back/Forward stack for WikiLink jumps.
5. **Zen / focus mode** — no way to hide all chrome and write distraction-free.

> **Progress note:** Most of the original P0 list (settings search, tab overflow, find/replace, smart lists, checkbox toggle, export progress, pinned tabs, split layout, high-contrast preset, session restore) has shipped between v0.8.6 and v0.8.66. The remaining gaps are smaller but still matter for competitive parity.

---

## 2. Information Architecture

### 2.1 Sidebar Width

**Current:** The sidebar is now resizable via a drag handle (`App.svelte`) with a global width persisted in settings (min 180px / max 320px). It still uses one width for all three activities (Files, Outline, Links).

**Problem:** Files needs width for long paths; outline needs narrow width; links needs medium width. One size still doesn't fit all.

**Recommendation:** Persist sidebar width per activity. Files = 280px, Outline = 220px, Links = 260px.

### 2.2 Missing Breadcrumbs

**Current:** `TitleBar.svelte` now shows the last 3 segments of the active document path as plain text (e.g. `docs › api › auth.md`).

**Problem:** The path is informative but not clickable, and it only shows the trailing segments. Users can't jump to a parent folder.

**Recommendation:** Make the path segments clickable and show the full hierarchy (or at least one more level). Click a segment to re-root the file tree to that folder.

### 2.3 No Document Navigation History

**Current:** `Ctrl+Click` on a WikiLink jumps to the target file, but there is no Back button.

**Problem:** Engineers navigate between linked docs constantly. Losing the back stack is frustrating.

**Recommendation:** Add `Alt+Left` / `Alt+Right` (or mouse back/forward buttons) for document navigation history. Expose as "Go Back" / "Go Forward" in the Command Palette.

### 2.4 Tab Overflow — ✅ Done

**Status:** Shipped in v0.8.6 and refined in v0.8.39/v0.8.66.  
`TabBar.svelte` now supports horizontal scroll, mouse-wheel scrolling, left/right arrow buttons, drag-to-reorder, and pinned/unpinned groups.

### 2.5 No Pinned Tabs — ✅ Done

**Status:** Shipped in v0.8.8 and extended in v0.8.39.  
Right-click any tab → Pin/Unpin. Pinned tabs stay fixed on the left, show a pin icon, have no close button, survive "Close All", and persist in session restore.

---

## 3. Visual Design

### 3.1 Inconsistent Border Radius

**Current:** `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`. `TabBar` tabs now use `--radius-md`, `ActivityBar` buttons use `--radius-sm`, and menus/modals use the expected tokens.

**Problem:** Small inconsistencies still appear in custom overlays and context menus.

**Fix:** Audit every component once more and document the token mapping in the component spec.

### 3.2 Status Bar Information Density

**Current:** Left = save indicator + cursor position. Center = zoom badge + view mode buttons + split-direction toggle. Right = git status, words, chars, read time, format badges.

**Problem:** The right side still shows three separate stat badges (words / chars / read time) that could be more compact.

**Recommendation:** Collapse to `1,234 words · ~6 min` with a tooltip showing chars. Keep the git badge as-is.

### 3.3 Preview Pane Max Width

**Current:** `preview_max_width` is not exposed as a user setting; the preview content is capped at 820px and centered.

**Problem:** With a wide window the blank space on both sides has no visual boundary and can look broken.

**Fix:** Add a subtle vertical guide line at the max-width boundary (1px `--border-default`, 50% opacity) or a faint background shade within the content area.

### 3.4 Custom CSS Textarea Too Small

**Current:** The custom CSS field in `AdvancedSettings.svelte` is still 6 rows.

**Problem:** Writing CSS in a tiny box is painful.

**Fix:** Make it resizable (`resize: vertical`), minimum 12 rows, or open it in a dedicated "Custom CSS Editor" modal with line numbers and basic syntax highlighting.

### 3.5 No Focus Mode / Zen Mode

**Current:** Users can toggle view modes (split/editor/preview) but there is no "hide everything" mode.

**Problem:** Writers want minimal chrome. VS Code has Zen Mode; iA Writer is *all* Zen Mode.

**Recommendation:** `Ctrl+K Z` → hide title bar, status bar, sidebar, tab bar. Show only editor + optional preview. Exit via `Esc` twice or `Ctrl+K Z`.

### 3.6 Activity Bar Visual Weight — ✅ Done

**Status:** Improved. `ActivityBar.svelte` is now 36px wide with 15px icons, which feels balanced for three activities.

---

## 4. Interaction Design

### 4.1 No Progress Indicators for Long Operations — ✅ Done

**Status:** Shipped in v0.8.6 and v0.8.43.  
DOCX/Pandoc/Print operations show a "Exporting…" toast, and the in-app Debug Panel logs start/end/failure for exports, file open/save, workspace search, and copy-to-clipboard operations.

### 4.2 Preview Flash on Theme Switch — ✅ Done

**Status:** Fixed. `PreviewPane.svelte` updates CSS variables and re-themes highlight.js / Mermaid without re-rendering the full HTML. The markdown content does not change — only the CSS does.

### 4.3 No Inline Search in Preview

**Current:** `PreviewPane.svelte` contains search helper functions (`openPreviewSearch`, `highlightSearchMatches`, etc.) but no visible search UI and no `Ctrl+F` binding when the preview pane is focused.

**Problem:** Users read in preview and want to find text there. Switching to the editor breaks flow.

**Fix:** Wire `Ctrl+F` context-aware: if the preview pane is focused, open the existing search overlay with previous/next navigation and match highlighting.

### 4.4 Find & Replace Missing — ✅ Done

**Status:** Shipped in v0.8.6.  
CodeMirror's `@codemirror/search` panel is enabled. `Ctrl+F` opens find, `Ctrl+H` opens replace, and the panel is themed to match the app.

### 4.5 No Click-to-Jump in Outline — ✅ Done

**Status:** Shipped in v0.8.65.  
Clicking an item in `OutlineSidebar.svelte` dispatches `markz:scroll-to-heading`, which scrolls both the editor and the preview to the corresponding heading.

### 4.6 Image Paste Flow

**Current:** Paste/drop image → copied to the assets folder → relative path inserted (`EditorPane.svelte`). No preview of the image and no alt-text prompt.

**Problem:** Users don't get a chance to confirm the save location or add alt text before the image is committed.

**Fix:** Show a small modal on paste: image thumbnail + alt text input + confirm/cancel. Pre-fill alt text if an LLM alt-text feature is ever added.

### 4.7 No Smart List Continuation — ✅ Done

**Status:** Shipped in v0.8.6.  
`codemirror.ts` implements `smartListEnter`: pressing Enter on a list item continues `-`, `*`, `+`, or `1.`, and pressing Enter on an empty list line removes the marker and exits the list.

### 4.8 No Auto-Pair for Markdown — ✅ Done

**Status:** Fixed in current development.  
`closeBrackets()` is enabled and `EditorState.languageData` now supplies a custom `closeBrackets` config that includes the standard pairs plus markdown emphasis/code delimiters: `*`, `_`, `` ` ``.

**Note:** HTML angle brackets (`<`) were left out because auto-pairing them interferes with plain text typing in Markdown.

### 4.9 No Task List Toggle in Preview — ✅ Done

**Status:** Shipped in v0.8.6.  
Clicking a checkbox in the preview dispatches `markz:toggle-checkbox`; `EditorPane.svelte` finds the corresponding `- [ ]` / `- [x]` and toggles it in the source.

### 4.10 Command Palette Missing Frecency

**Current:** `CommandPalette.svelte` / `commandPalette.ts` returns a flat, alphabetically-ish fuzzy-sorted list. Commands are not grouped by category and usage is not tracked.

**Problem:** "Copy as JIRA" may be used 10× per day but always requires typing "jira".

**Fix:** Track command usage frequency in session/local storage and sort by frecency when the query is empty. Add lightweight category headers (File, View, Export, etc.).

---

## 5. Accessibility

### 5.1 Incomplete ARIA Labeling

**Current:** Most title-bar, tab-bar, and preview toolbar buttons now have `aria-label`. `SettingsModal.svelte` uses `aria-label="Settings"` but not `aria-labelledby`, and not every modal follows the same pattern.

**Problem:** Screen reader users may still miss context for some interactive elements.

**Fix:** Audit all interactive elements. Every modal should point `aria-labelledby` to its title. Every icon-only button needs a persistent `aria-label`.

### 5.2 Focus Trap in Modals — Partially Done

**Current:** `focusTrap.ts` exists and is used by `SearchPanel.svelte`. `CommandPalette.svelte` and `TableEditorModal.svelte` import it but do not apply it; `SettingsModal.svelte`, `SaveTemplateDialog.svelte`, `GitDiffModal.svelte`, and `TemplateBrowser.svelte` do not trap focus at all.

**Problem:** Tab key can escape a modal and focus elements behind it.

**Fix:** Apply `use:trapFocus` consistently to all modal containers. Auto-focus the first focusable element on open and close on `Escape`.

### 5.3 No Skip Link — ✅ Done

**Status:** Fixed in current development.  
`App.svelte` now renders a `.skip-link` anchor as the first focusable element. It is visually hidden off-screen by default and slides into view on focus; activating it moves focus to `.cm-content`.

**Note:** The link uses `--accent-default` background with `--text-inverse` text and a 2px inverse outline to satisfy WCAG focus visibility.

### 5.4 No High Contrast Theme — ✅ Done

**Status:** Shipped in v0.8.45 and preserved through the WGSN palette additions in v0.8.49.  
A "High Contrast" preset is available in Settings → General → Color Preset.

### 5.5 Preview Heading Hierarchy — ✅ Done

**Status:** Confirmed. `PreviewPane.svelte` renders actual `<h1>`–`<h6>` elements, and `addHeadingAnchors` assigns stable IDs for navigation.

### 5.6 Color-Only Status Indicators — Partially Done

**Current:** The status bar save indicator now uses text ("Saved"/"Unsaved") plus a dot. The git badge shows the branch name plus a modified dot. Unsaved tabs still rely on a colored dot only.

**Problem:** Colorblind users may struggle with the tab unsaved indicator.

**Fix:** Add a non-color cue to unsaved tabs, e.g. an italic title or a visible `●` glyph.

---

## 6. Performance Perception

### 6.1 No Loading Skeletons

**Current:** Settings modal shows "Loading settings…". File tree shows blank or "Searching…" text while loading.

**Problem:** Blank/text states feel slower than skeletons.

**Fix:** Replace "Loading…" with a pulsing skeleton block (3–5 gray bars). Use the same for the file tree initial load.

### 6.2 Preview Render Delay

**Current:** Preview updates are debounced to 50ms. Heavy post-processing (KaTeX, Mermaid, syntax highlighting) now runs in `requestAnimationFrame` chunks.

**Problem:** On very large documents (50,000+ chars), re-rendering can still cause frame drops.

**Fix:** Increase the debounce dynamically for long documents (e.g. 300ms when >10,000 words). Consider virtualizing the preview for very long docs.

### 6.3 Session Restore Flash — ✅ Done

**Status:** Fixed in v0.8.57 and v0.8.60.  
`App.svelte` waits for `startupComplete` before rendering the workspace, and `PreviewPane.svelte` skips preview renders until startup finishes. The "empty → populated" flash is gone.

---

## 7. Content & Copy

### 7.1 Settings Section Labels

**Current:** `SettingsModal.svelte` was refactored into General, Editor, Preview, Shortcuts, Advanced, and About. General still groups sparse Appearance, Layout, and Accessibility subsections.

**Problem:** Layout and Accessibility still feel light.

**Fix:** Either merge Layout fully into Appearance, rename Accessibility to "Accessibility & Reading", or add enough settings to justify each subsection.

### 7.2 Empty Workspace State — ✅ Done

**Status:** Shipped. `OutlineSidebar.svelte` shows an `EmptyState` with an icon, "No folder open", explanatory subtitle, and an "Open folder" action button.

### 7.3 About Dialog Tech Stack — Mostly Done

**Status:** Updated in v0.8.39/v0.8.40. `AboutSettings.svelte` credits now mention KaTeX, Mermaid, and docx-rs. The tech-grid badges still list only the core stack.

**Fix:** Add badges for `pulldown-cmark`, KaTeX, Mermaid, highlight.js, and docx-rs, or link to a full credits page.

---

## 8. Enhancement Recommendations (Prioritized)

### P0 — Fix Before Next Release

| # | Issue | Effort | Files | Status |
|---|-------|--------|-------|--------|
| 1 | Preview inline search (wire existing helpers to UI/keyboard) | 1 day | `PreviewPane.svelte` | Not done |
| 2 | File tree context menu (New File, Rename, Delete) | 1 day | `OutlineSidebar.svelte`, `workspaceStore.ts`, backend | Not done |
| 3 | Command palette frecency + categories | ½ day | `commandPalette.ts`, `CommandPalette.svelte` | Not done |
| 4 | Document navigation history (Back/Forward) | 1 day | New store + `keyboard.ts` | Not done |
| 5 | Markdown auto-pair for `*`, `_`, `` ` `` | ¼ day | `codemirror.ts` | Done |
| 6 | Focus trap in all modals | ½ day | All modal components | Partial |
| 7 | Skip to editor link | ¼ day | `App.svelte` | Done |

### P1 — Next Sprint

| # | Issue | Effort | Files | Status |
|---|-------|--------|-------|--------|
| 8 | Per-activity sidebar widths | ½ day | `App.svelte`, settings | Not done |
| 9 | Clickable title-bar breadcrumb | 1 day | `TitleBar.svelte` | Partial |
| 10 | Zen / focus mode | 1 day | `App.svelte` | Not done |
| 11 | Image paste preview + alt text | 1 day | `EditorPane.svelte`, new modal | Not done |
| 12 | Custom CSS editor (resizable / CodeMirror) | 1 day | `AdvancedSettings.svelte` | Not done |
| 13 | Loading skeletons | ½ day | New component | Not done |
| 14 | Tab dropdown when overflow | ½ day | `TabBar.svelte` | Not done |
| 15 | Status bar metric collapse | ¼ day | `StatusBar.svelte` | Not done |
| 16 | Preview max-width visual guide | ¼ day | `PreviewPane.svelte` | Not done |

### P2 — Backlog

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 17 | Full ARIA audit | 1 day | Not done |
| 18 | Colorblind-safe tab unsaved indicator | ¼ day | Partial |
| 19 | `prefers-contrast: more` support | ½ day | Not done |
| 20 | Dynamic preview debounce by document size | ½ day | Not done |

### Resolved in this cycle

| # | Issue | Shipped |
|---|-------|---------|
| — | Settings modal search/filter | v0.8.6 / v0.8.40 |
| — | Tab bar overflow + scroll arrows | v0.8.6 |
| — | Find & Replace UI | v0.8.6 |
| — | Smart list continuation | v0.8.6 |
| — | Click checkbox in preview → toggle source | v0.8.6 |
| — | Export / save progress indicators | v0.8.6 / v0.8.43 |
| — | Pin tabs | v0.8.8 |
| — | Global workspace search | v0.8.8 |
| — | Vim keybindings | v0.8.8 |
| — | Draggable tabs | v0.8.39 |
| — | Slide break editor / presentation mode | v0.8.39 / v0.8.41 |
| — | Vertical / horizontal split layout | v0.8.7 |
| — | High contrast theme preset | v0.8.45 |
| — | Outline click-to-jump | v0.8.65 |
| — | Session restore flash | v0.8.57 / v0.8.60 |
| — | Preview theme switch without re-render | v0.8.6+ |
| — | Rich empty workspace state | v0.8.0+ |

---

## 9. Competitive Benchmark

| Feature | MarkZ | iA Writer | Typora | Obsidian | VS Code |
|---------|-------|-----------|--------|----------|---------|
| Live preview | ✓ | ✓ | ✓ | ✓ | plugin |
| Dual-pane | ✓ | — | — | ✓ | ✓ |
| Vertical/horizontal split | ✓ | — | — | ✓ | ✓ |
| Draggable tabs | ✓ | N/A | N/A | ✓ | ✓ |
| Pin tabs | ✓ | N/A | N/A | ✓ | ✓ |
| Tab overflow handling | ✓ | N/A | N/A | ✓ | ✓ |
| Vim mode | ✓ | — | — | plugin | ✓ |
| Presentation mode | ✓ | — | — | plugin | plugin |
| Global workspace search | ✓ | — | — | ✓ | ✓ |
| Zen mode | — | ✓ | — | plugin | ✓ |
| Preview inline search | — | — | — | — | ✓ |
| Smart lists | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auto-pair delimiters | ✓ | ✓ | ✓ | ✓ | ✓ |
| Checkbox toggle (preview) | ✓ | — | ✓ | plugin | plugin |
| Breadcrumbs | partial | — | — | ✓ | ✓ |
| Settings search | ✓ | — | — | ✓ | ✓ |
| Focus trap | partial | ✓ | ✓ | ✓ | ✓ |
| High contrast | ✓ | — | — | ✓ | ✓ |
| File tree context menu | — | N/A | N/A | ✓ | ✓ |
| Skip link | ✓ | — | — | — | ✓ |

**Gaps that matter most now:** preview inline search, file tree context menu, command palette frecency, document navigation history, zen/focus mode, and completing focus-trap coverage. These are table stakes for a polished 2026 editor.

---

*End of audit. Revisit after each release cycle to track progress.*
