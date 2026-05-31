# UX/UI Audit: MarkZ

> **Date:** 2026-05-31  
> **Scope:** Comprehensive review of current UI/UX against design spec, usability heuristics, and competitive parity.  
> **Method:** Code review of all layout, editor, preview, settings, and modal components.

---

## 1. Executive Summary

| Area | Score | Verdict |
|------|-------|---------|
| Visual Design | 8/10 | Strong token system, good dark/light themes, minor inconsistencies |
| Information Architecture | 6/10 | Sidebar overloaded, missing navigation patterns, no breadcrumbs |
| Interaction Design | 7/10 | Good keyboard coverage, weak feedback on long operations, no progress states |
| Accessibility | 5/10 | ARIA labels present but incomplete, focus management gaps, no skip links |
| Performance Perception | 7/10 | Fast startup, no loading skeletons, preview flash on theme switch |
| Content & Copy | 8/10 | Clear labels, good empty states, Settings help tab is well-organized |

**Top 5 issues to fix:**
1. Settings modal has no search — 7 sections, 30+ fields, users get lost.
2. Tab bar lacks overflow handling — >6 tabs clip with no scroll or dropdown.
3. No inline search in preview pane — users expect `Ctrl+F` to work in rendered HTML.
4. File tree context menu missing — no New File, Rename, Delete in sidebar.
5. Command palette lacks categories/recent — flat alphabetical list, no frecency.

---

## 2. Information Architecture

### 2.1 Sidebar Overload

**Current:** One sidebar serves three purposes via activity bar tabs: Files, Outline, Links.

**Problem:** The sidebar width is fixed (240px default). The file tree needs width for long paths; the outline needs narrow width for headings; the backlinks panel needs medium width. One size doesn't fit all.

**Recommendation:**
- Make sidebar width **persist per activity**. Files = 280px, Outline = 220px, Links = 260px.
- Add a **resizable sidebar** (drag edge), with min 180px / max 400px.

### 2.2 Missing Breadcrumbs

**Current:** The title bar shows the app name + file name, but no path hierarchy.

**Problem:** Opening `~/projects/backend/docs/api/auth.md` shows only "auth.md". Users lose context about which project/subfolder they're in.

**Recommendation:** Replace static title with breadcrumb: `backend › docs › api › auth.md`. Click segment to open that folder in the file tree.

### 2.3 No Document Navigation History

**Current:** `Ctrl+Click` on a WikiLink jumps, but there's no Back button.

**Problem:** Engineers navigate between linked docs constantly. Losing the back stack is frustrating.

**Recommendation:** Add `Alt+Left` / `Alt+Right` (or mouse back/forward buttons) for document navigation history. Show in Command Palette as "Go Back" / "Go Forward."

### 2.4 Tab Overflow

**Current:** `TabBar.svelte` renders all tabs in a flex row. Beyond ~6 tabs, titles truncate aggressively and close buttons disappear.

**Problem:** Users who keep many docs open (common for RFC cross-referencing) can't see tab titles.

**Recommendation:**
- Add horizontal scroll with arrow buttons when tabs exceed container width.
- Or: Tab dropdown (`v`) showing all open tabs when space is tight.
- Minimum tab width: 80px (showing ~8 chars + close button).

### 2.5 No Pinned Tabs

**Current:** All tabs are equal. Closing "all others" is the only tab management.

**Problem:** Users want reference docs (style guide, API spec) always open but not in the way.

**Recommendation:** Right-click → "Pin Tab". Pinned tabs: small width (icon only), fixed left, excluded from "Close Others", no close button (unpin via right-click).

---

## 3. Visual Design

### 3.1 Inconsistent Border Radius

**Current:** `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`. But `TabBar` tabs use no radius, `ActivityBar` buttons use `--radius-sm`, and `Toast` uses `--radius-md`.

**Problem:** Subtle but perceptible inconsistency.

**Fix:** Audit all components. Use `--radius-sm` for buttons/tabs, `--radius-md` for cards/menus, `--radius-lg` for modals. Document in component spec.

### 3.2 Status Bar Information Density

**Current:** Left = word count, char count, reading time. Center = view mode buttons. Right = git status, zoom.

**Problem:** Left section uses ~200px for 3 metrics that could be more compact. Reading time is useful but rarely glanced at.

**Recommendation:**
- Collapse metrics: `Words: 1,234 · Chars: 5,678 · ~6 min read` → `1,234 words · ~6 min`
- Click to expand full stats in a tooltip.
- Move reading time to a tooltip on the word count.

### 3.3 Preview Pane Max Width

**Current:** `preview_max_width` setting exists but no visual indication when content is narrower than the pane.

**Problem:** Users set 800px max width but see blank space on both sides with no visual boundary. Looks broken.

**Fix:** Add a subtle vertical guide line at the max-width boundary (1px `--border-default`, 50% opacity). Or center content with a faint background shade within the max-width area.

### 3.4 Custom CSS Textarea Too Small

**Current:** 6 rows for potentially 100+ lines of custom CSS.

**Problem:** Writing CSS in a tiny box is painful.

**Fix:** Make it resizable (`resize: vertical`), minimum 12 rows, or open in a dedicated "Custom CSS Editor" modal with line numbers and basic syntax highlighting.

### 3.5 No Focus Mode / Zen Mode

**Current:** Users can toggle view modes (split/editor/preview) but there's no "hide everything" mode.

**Problem:** Writers want minimal chrome. VS Code has Zen Mode; iA Writer is *all* Zen Mode.

**Recommendation:** `Ctrl+K Z` (like VS Code) → hide title bar, status bar, sidebar, tab bar. Show only editor + optional preview. Exit via `Esc` twice or `Ctrl+K Z`.

### 3.6 Activity Bar Visual Weight

**Current:** 44px wide, solid background, large icons (20px).

**Problem:** Slightly heavy for an app with only 3 activities. VS Code's is 48px with 12 activities; ours feels disproportionate.

**Fix:** Reduce to 40px, icon size to 18px. Or add more activities (Search, Git, LLM) to justify the width.

---

## 4. Interaction Design

### 4.1 No Progress Indicators for Long Operations

**Current:** DOCX export, Pandoc conversion, and file open show no loading state.

**Problem:** Large documents (10,000+ words) take 1–3 seconds to export. Users click "Copy as DOCX" and wonder if it worked.

**Fix:**
- Toast notification: "Exporting DOCX…" → "DOCX copied to clipboard ✓"
- Or: Status bar spinner during operation.
- Or: Disable button + show spinner on the button itself.

### 4.2 Preview Flash on Theme Switch

**Current:** Switching light ↔ dark re-renders the preview HTML, causing a visible flash.

**Problem:** Jarring, especially when the system theme changes at sunset.

**Fix:** Use CSS variables in preview styles. Toggle a `data-theme` attribute instead of re-rendering HTML. The markdown content doesn't change — only the CSS does.

### 4.3 No Inline Search in Preview

**Current:** `Ctrl+F` opens CodeMirror's find panel in the editor. The preview pane has no search.

**Problem:** Users read in preview and want to find text there. Switching to editor breaks flow.

**Fix:** Implement `Ctrl+F` context-aware: if preview pane is focused, search within preview HTML. Use `window.find()` or a custom highlight overlay.

### 4.4 Find & Replace Missing

**Current:** `Ctrl+F` and `Ctrl+H` are in keyboard.ts but no find/replace UI was visible in EditorPane.

**Problem:** Critical editor feature. CodeMirror 6 has `@codemirror/search` built-in.

**Fix:** Enable CodeMirror's search panel. Ensure `Ctrl+F` focuses it, `Ctrl+H` opens replace. Style to match app theme.

### 4.5 No Click-to-Jump in Outline

**Current:** `OutlineSidebar.svelte` renders headings but need to verify click-to-jump works.

**Problem:** If headings are not clickable, the outline is decorative, not functional.

**Fix:** Ensure each heading in outline is clickable and scrolls editor + preview to that section. Add hover underline.

### 4.6 Image Paste Flow

**Current:** Paste image → copied to assets folder → path inserted.

**Problem:** No preview of the image before confirming. No alt text prompt.

**Fix:** Show a small modal on paste: image thumbnail + alt text input + confirm/cancel. Pre-fill alt text if LLM alt-text feature exists (see LLM assessment).

### 4.7 No Smart List Continuation

**Current:** Pressing Enter on a list item (`- item`) creates a new line but doesn't continue the list.

**Problem:** Every markdown editor does this. It's table stakes.

**Fix:** CodeMirror extension: on Enter in list context, insert `- ` or `1. ` on the new line. On Enter on empty list item, remove the marker and exit list.

### 4.8 No Auto-Pair for Markdown

**Current:** Typing `*` or `` ` `` doesn't auto-close the delimiter.

**Problem:** Typing `` ` `` for inline code requires typing it twice.

**Fix:** CodeMirror close-brackets extension configured for markdown: `*`, `_`, `` ` ``, `[`, `(`, `{`, `"`, `'`, `<`.

### 4.9 No Task List Toggle in Preview

**Current:** Checkboxes in preview are static HTML.

**Problem:** Users expect to click a checkbox in preview to toggle it in the source.

**Fix:** Add click handler on preview checkboxes that finds the corresponding `- [ ]` / `- [x]` in the editor and toggles it.

### 4.10 Command Palette Missing Frecency

**Current:** Commands are always in the same order. No learning from usage.

**Problem:** "Copy as JIRA" is used 10× per day but always requires typing "jira" instead of being first.

**Fix:** Track command usage frequency in localStorage. Sort by frecency (frequency × recency) when query is empty. Reset on app restart is fine — learned within a session.

---

## 5. Accessibility

### 5.1 Incomplete ARIA Labeling

**Current:** Some buttons have `aria-label`, many don't. The `TitleBar` has drag region but no `role="banner"`.

**Problem:** Screen reader users can't identify many interactive elements.

**Fix:** Audit all interactive elements. Every `<button>` without visible text needs `aria-label`. Every modal needs `aria-labelledby` pointing to its title.

### 5.2 Focus Trap in Modals

**Current:** Modals (Settings, Templates, Command Palette) may not trap focus.

**Problem:** Tab key can escape modal and focus elements behind it.

**Fix:** Implement focus trap: `Tab` on last element → first element, `Shift+Tab` on first → last. Close on `Escape` (already works for some).

### 5.3 No Skip Link

**Current:** No way to skip title bar + sidebar and jump directly to editor.

**Problem:** Keyboard users must tab through 10+ elements to reach the editor.

**Fix:** Add a visually hidden "Skip to editor" link as the first focusable element. Visible on focus.

### 5.4 No High Contrast Theme

**Current:** Light, Dark, System themes. No high contrast.

**Problem:** Users with visual impairments need stronger contrast.

**Fix:** Add a "High Contrast" theme option with pure black/white and thick borders. Or respect `prefers-contrast: more`.

### 5.5 Preview Heading Hierarchy

**Current:** Preview renders headings with visual size but no semantic `aria-level` on the container.

**Problem:** Screen readers may not announce heading levels correctly if rendered in a generic div.

**Fix:** Ensure preview HTML uses actual `<h1>`–`<h6>` tags, not styled `<div>`s.

### 5.6 Color-Only Status Indicators

**Current:** Git status uses a colored dot (green/yellow/red). Unsaved changes use a dot on the tab.

**Problem:** Colorblind users can't distinguish states.

**Fix:** Add shape or text: unsaved tab = `●` + italic title. Git clean = checkmark icon, modified = dot icon.

---

## 6. Performance Perception

### 6.1 No Loading Skeletons

**Current:** Settings modal shows "Loading…" text. File tree shows nothing while loading.

**Problem:** Blank states feel slower than skeletons.

**Fix:** Replace "Loading…" with a pulsing skeleton block (3–5 gray bars). Use the same for file tree initial load.

### 6.2 Preview Render Delay

**Current:** Preview updates on every keystroke (debounced).

**Problem:** On large documents (50,000+ chars), re-rendering causes frame drops.

**Fix:**
- Increase debounce from ~100ms to ~300ms for docs >10,000 words.
- Or: Use a Web Worker for markdown → HTML conversion (already in Rust, but the DOM insertion is sync).
- Or: Virtualize the preview for very long docs (render visible portion only).

### 6.3 Session Restore Flash

**Current:** App opens with empty editor, then tabs appear after session restore completes.

**Problem:** Visible flash of empty state → populated state.

**Fix:** Block render until session restore completes (fast, <50ms) or show a splash/loading state during restore.

---

## 7. Content & Copy

### 7.1 Settings Section Labels

**Current:** "Appearance", "Editor", "Layout", "Accessibility", "Custom CSS", "Text to Speech", "Auto Save", "Export".

**Problem:** "Layout" has only one setting (default view mode). "Accessibility" has font size + reduced motion. Feels sparse.

**Fix:** Merge "Layout" into "Appearance". Rename "Accessibility" to "Accessibility & Reading". Or add more settings to justify the sections.

### 7.2 Empty Workspace State

**Current:** "Open Folder" prompt in sidebar.

**Problem:** Cold and minimal. Doesn't explain what workspace mode does.

**Fix:** Rich empty state: icon + "Open a folder to browse files, search across your project, and keep your docs organized." + "Open Folder" button + "Learn more" link.

### 7.3 About Dialog Tech Stack

**Current:** Lists Tauri, Svelte, CodeMirror, Rust, TypeScript, Vite.

**Problem:** Missing pulldown-cmark, KaTeX, Mermaid, and other libraries users care about.

**Fix:** Add all significant dependencies. Or link to a full credits page.

---

## 8. Enhancement Recommendations (Prioritized)

### P0 — Fix Before Next Release

| # | Issue | Effort | Files |
|---|-------|--------|-------|
| 1 | Settings modal search/filter | ½ day | `SettingsModal.svelte` |
| 2 | Tab bar overflow (scroll/dropdown) | ½ day | `TabBar.svelte` |
| 3 | Find & Replace UI | ½ day | `EditorPane.svelte`, `codemirror.ts` |
| 4 | Preview inline search | 1 day | `PreviewPane.svelte` |
| 5 | Smart list continuation | ¼ day | `codemirror.ts` |
| 6 | Auto-pair markdown delimiters | ¼ day | `codemirror.ts` |
| 7 | Click checkbox in preview → toggle source | ½ day | `PreviewPane.svelte` |
| 8 | Focus trap in all modals | ½ day | All modal components |
| 9 | Progress indicators for export/save | ½ day | `StatusBar.svelte`, `Toast.svelte` |
| 10 | Breadcrumb in title bar | 1 day | `TitleBar.svelte` |

### P1 — Next Sprint

| # | Issue | Effort | Files |
|---|-------|--------|-------|
| 11 | Resizable sidebar | 1 day | `App.svelte`, `SplitPane.svelte` |
| 12 | Pinned tabs | ½ day | `TabBar.svelte`, `tabStore.ts` |
| 13 | Document navigation history (Back/Forward) | 1 day | New store + `keyboard.ts` |
| 14 | Zen mode | 1 day | `App.svelte` |
| 15 | Command palette frecency | ½ day | `commandPalette.ts` |
| 16 | File tree context menu (New/Rename/Delete) | 1 day | `OutlineSidebar.svelte` |
| 17 | Image paste preview + alt text | 1 day | `keyboard.ts`, new modal |
| 18 | Custom CSS editor (resizable/CodeMirror) | 1 day | `SettingsModal.svelte` |
| 19 | Loading skeletons | ½ day | New component |
| 20 | Skip to editor link | ¼ day | `App.svelte` |

### P2 — Backlog

| # | Issue | Effort |
|---|-------|--------|
| 21 | High contrast theme | 1 day |
| 22 | Tab dropdown when overflow | ½ day |
| 23 | Preview theme-switch without re-render | 1 day |
| 24 | Status bar metric collapse | ¼ day |
| 25 | Preview max-width visual guide | ¼ day |
| 26 | Rich empty workspace state | ½ day |
| 27 | ARIA audit (full pass) | 1 day |
| 28 | Heading hierarchy validation (lint) | ½ day |
| 29 | Colorblind-safe status indicators | ¼ day |
| 30 | Session restore blocking render | ½ day |

---

## 9. Competitive Benchmark

| Feature | MarkZ | iA Writer | Typora | Obsidian | VS Code |
|---------|-------|-----------|--------|----------|---------|
| Live preview | ✓ | ✓ | ✓ | ✓ | plugin |
| Dual-pane | ✓ | — | — | ✓ | ✓ |
| Zen mode | — | ✓ | — | plugin | ✓ |
| Tab overflow | — | N/A | N/A | ✓ | ✓ |
| Pin tabs | — | N/A | N/A | ✓ | ✓ |
| Preview search | — | — | — | — | ✓ |
| Smart lists | — | ✓ | ✓ | ✓ | ✓ |
| Auto-pair | — | ✓ | ✓ | ✓ | ✓ |
| Checkbox toggle (preview) | — | — | ✓ | plugin | plugin |
| Breadcrumbs | — | — | — | ✓ | ✓ |
| Settings search | — | — | — | ✓ | ✓ |
| Focus trap | partial | ✓ | ✓ | ✓ | ✓ |
| High contrast | — | — | — | ✓ | ✓ |

**Gaps that matter most:** Zen mode, preview search, smart lists, auto-pair, checkbox toggle, breadcrumbs, settings search. These are table stakes in 2026.

---

*End of audit. Revisit after each release cycle to track progress.*
