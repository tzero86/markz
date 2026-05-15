# MarkZ — UI/UX Design Specification

> **Version:** 1.0  
> **Status:** Planning Phase — Authoritative reference for all frontend implementation  
> **Goal:** Establish MarkZ as the most visually refined and fluid Markdown editor for engineers.

---

## 1. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Content First** | The interface should disappear. Chrome is minimal, non-distracting, and respects the user's focus on writing. |
| **Native Fluidity** | Every interaction must feel instantaneous and native. No jank, no lag, no layout shifts. Target: 60fps for all animations. |
| **Precision & Craft** | Engineers appreciate precision. Borders are 1px. Shadows are subtle. Alignment is pixel-perfect. |
| **Quiet Confidence** | The UI doesn't shout. It uses restrained color, generous whitespace, and purposeful contrast. |
| **Adaptive Density** | Information density adapts to context — clean and spacious for writing, information-rich for navigation and toolbars. |

### Personality

MarkZ is **the technical writer's workshop** — not a toy, not a corporate tool. It feels like a high-end native app: think *Bear* meets *VS Code* with the soul of *iA Writer*.

- **Serious but warm** — no cold corporate blues; use nuanced neutrals with intentional accent color.
- **Fast and responsive** — every click, hover, and keystroke has immediate visual feedback.
- **Engineer-respecting** — no hand-holding wizards, no noise. Power features are discoverable, not intrusive.

---

## 2. Color System

### Design Tokens

All colors are defined as semantic tokens. Implementations must use tokens, never hardcoded hex values.

#### Base Neutrals (Both Themes)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-base` | `#FFFFFF` | `#0D0D0D` | App background |
| `--bg-surface` | `#F5F5F5` | `#1A1A1A` | Panels, sidebars, toolbars |
| `--bg-elevated` | `#FFFFFF` | `#242424` | Cards, popovers, menus |
| `--bg-hover` | `#EBEBEB` | `#2E2E2E` | Hover states |
| `--bg-active` | `#E0E0E0` | `#383838` | Active/pressed states |
| `--bg-subtle` | `#FAFAFA` | `#141414` | Subtle differentiation |
| `--border-default` | `#E5E5E5` | `#2A2A2A` | Dividers, borders |
| `--border-focus` | `#B3B3B3` | `#4A4A4A` | Focused borders |

#### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | `#1A1A1A` | `#F0F0F0` | Headings, primary content |
| `--text-secondary` | `#6B6B6B` | `#9E9E9E` | Meta text, timestamps |
| `--text-tertiary` | `#A3A3A3` | `#6B6B6B` | Placeholders, disabled |
| `--text-inverse` | `#FFFFFF` | `#0D0D0D` | Text on accent/colored backgrounds |
| `--text-accent` | `#0D8A5D` | `#3DD68D` | Links, accent text |

#### Accent Color

A single, carefully chosen accent that feels fresh and engineering-oriented — not the generic "tech blue."

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--accent-default` | `#0D8A5D` | `#3DD68D` | Primary buttons, active indicators, links |
| `--accent-hover` | `#0A734D` | `#5BDF9E` | Hover on accent elements |
| `--accent-subtle` | `#E6F5EE` | `#1A3D2E` | Accent backgrounds, badges |
| `--accent-muted` | `#B8DECC` | `#2A5C45` | Borders with accent tint |

> **Rationale:** Emerald/teal green evokes freshness, growth (documentation), and stands out from the sea of blue editors. It pairs beautifully with both light and dark neutrals.

#### Semantic / Status Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--error` | `#DC2626` | `#F87171` | Errors, destructive actions |
| `--error-bg` | `#FEF2F2` | `#3D1515` | Error toast backgrounds |
| `--warning` | `#D97706` | `#FBBF24` | Warnings |
| `--warning-bg` | `#FFFBEB` | `#3D300F` | Warning backgrounds |
| `--success` | `#0D8A5D` | `#3DD68D` | Success states (shares accent) |
| `--info` | `#2563EB` | `#60A5FA` | Info badges |

### Theme Switching

- Transition between light/dark must be **smooth** (300ms ease) on all color properties.
- Use CSS custom properties at the `:root` level; toggle a `data-theme` attribute on `<html>`.
- Respect system preference by default (`prefers-color-scheme`).

### Preview Pane Color Adaptation

The HTML preview must render with theme-aware styles. The rendered Markdown inherits the app's color tokens so that preview and editor feel like one surface, not two separate worlds.

---

## 3. Typography

### Font Stack

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", Consolas, monospace;
--font-preview: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

> **Note:** Bundle JetBrains Mono or Fira Code as the default editor font. It is free, legible at small sizes, and beloved by engineers.

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-xs` | 11px | 400 | 16px | 0.01em | Status bar, badges |
| `--text-sm` | 13px | 400 | 20px | 0 | UI labels, sidebar items |
| `--text-base` | 14px | 400 | 22px | 0 | Body text, editor |
| `--text-md` | 15px | 400 | 24px | -0.01em | Preview body |
| `--text-lg` | 17px | 500 | 28px | -0.01em | Section titles |
| `--text-xl` | 20px | 600 | 28px | -0.02em | Dialog titles |
| `--text-2xl` | 24px | 700 | 32px | -0.02em | Empty states |

### Editor Typography

- **Font size:** User-configurable, default 14px.
- **Line height:** 1.7 (generous for readability).
- **Tab size:** 2 spaces visible width.
- **Caret:** 2px wide, `--accent-default`, blinking at OS-native rate.

### Preview Typography

- **Body:** `--text-md` (15px), `--text-primary`.
- **Headings:** Tightly tracked, bold, with generous margins.
- **Code blocks:** `--font-mono`, 13px, with subtle background tint (`--bg-surface`).
- **Blockquotes:** Left border 3px `--accent-muted`, italic, `--text-secondary`.

---

## 4. Spacing System

Use an 4px base grid. All spacing values are multiples of 4.

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Buttons, inputs, tags |
| `--radius-md` | 6px | Cards, popovers |
| `--radius-lg` | 8px | Dialogs, modals |
| `--radius-full` | 9999px | Pills, avatars |

---

## 5. Layout Architecture

### Overall Window Layout

```
┌────────────────────────────────────────────────────────────┐
│  Title Bar (frameless, custom, ~38px)                       │
├──────┬─────────────────────────────────────────────────────┤
│      │  Toolbar (breadcrumbs, actions, ~40px)              │
│  S   ├─────────────────────────────────────────────────────┤
│  i   │                                                     │
│  d   │  Editor Pane          │  Preview Pane              │
│  e   │  (CodeMirror 6)       │  (Rendered HTML)           │
│  b   │                       │                            │
│  a   │                       │                            │
│  r   ├───────────────────────┼────────────────────────────┤
│      │  Status Bar (~26px)                                 │
└──────┴─────────────────────────────────────────────────────┘
```

### Frameless Window Chrome

- Custom title bar integrated with the toolbar.
- Window controls (minimize/maximize/close) are native-looking but styled to match the theme.
- Drag region is the entire title bar except interactive elements.

### Dual-Pane Editor

- **Default split:** 50/50.
- **Resizable:** Drag the center divider to adjust widths.
- **Divider appearance:** 1px `--border-default`, with a 4px invisible hit area. On hover, the divider subtly brightens (`--border-focus`).
- **Collapse modes:** Users can collapse either pane to go full-editor or full-preview.
- **Animation:** Pane resize is smooth (no layout thrashing). Use CSS `flex` transitions or a performant splitter library.

### Sidebar

- **Width:** 240px default, resizable down to 180px, max 320px.
- **Behavior:** Collapsible with a keyboard shortcut (`Cmd/Ctrl + B`).
- **Animation:** Slide in/out with 200ms ease. Content fades slightly during animation.
- **Sections:** File tree, Outline, Search results (tabbed or stacked).

### Z-Index Layering

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base | 0 | App background |
| Content | 10 | Editor, preview |
| Floating | 100 | Splitter, sticky headers |
| Popover | 200 | Dropdowns, tooltips |
| Overlay | 300 | Modals, dialogs |
| Toast | 400 | Notifications |

---

## 6. Component Design

### Buttons

**Primary Button**
- Background: `--accent-default`
- Text: `--text-inverse`, 13px, weight 500
- Padding: `--space-2` `--space-4` (8px 16px)
- Border radius: `--radius-sm`
- Hover: Background shifts to `--accent-hover`, 150ms ease.
- Active: Scale to 0.98, background darkens further.
- Focus: 2px outline `--accent-subtle` offset 2px.

**Secondary Button**
- Background: `--bg-elevated`
- Border: 1px `--border-default`
- Text: `--text-primary`
- Hover: Background `--bg-hover`, border `--border-focus`.

**Ghost Button (Toolbar)**
- Background: transparent
- Text: `--text-secondary`
- Hover: Background `--bg-hover`, text `--text-primary`.
- Size: 28px × 28px with centered 16px icon.

### Inputs

- Background: `--bg-base` (light) / `--bg-surface` (dark)
- Border: 1px `--border-default`
- Border radius: `--radius-sm`
- Padding: `--space-2` `--space-3`
- Focus: Border transitions to `--accent-default`, subtle shadow `0 0 0 3px var(--accent-subtle)`.
- Transition: 150ms ease on all states.

### Editor Surface

- No visible border around the editor itself — it bleeds into the container.
- Gutter (if shown): `--bg-surface`, right border 1px `--border-default`.
- Active line highlight: extremely subtle (`--bg-hover` at 50% opacity).
- Selection: `--accent-subtle` background, `--text-primary` text.

### Scrollbars

- **Width:** 8px (macOS-style overlay).
- **Track:** Transparent.
- **Thumb:** `--text-tertiary` at 30% opacity, `--radius-full`.
- **Thumb hover:** `--text-secondary` at 50% opacity.
- **Behavior:** Overlay (doesn't consume layout space). Hidden when not scrolling (on supported platforms).

### Tooltips

- Background: `--bg-elevated`
- Border: 1px `--border-default`
- Text: `--text-secondary`, 12px
- Padding: `--space-2` `--space-3`
- Border radius: `--radius-md`
- Shadow: `0 4px 12px rgba(0,0,0,0.12)`
- Arrow: 4px, same background/border.
- Animation: Fade in 100ms, translateY(-4px → 0).

### Context Menus

- Background: `--bg-elevated`
- Border: 1px `--border-default`
- Border radius: `--radius-md`
- Shadow: `0 8px 24px rgba(0,0,0,0.16)`
- Item height: 28px
- Item padding: `--space-3` horizontal
- Hover: `--bg-hover`
- Active/selected: `--bg-active`
- Divider: 1px `--border-default`, margin `--space-1` vertical
- Animation: Scale from 0.97 + fade in, 120ms ease-out.

### Toasts / Notifications

- Position: Bottom-right, `--space-4` from edges.
- Background: `--bg-elevated`
- Border left: 3px semantic color (success = accent, error = red).
- Shadow: `0 4px 16px rgba(0,0,0,0.12)`
- Animation: Slide in from right (300ms), auto-dismiss with a shrinking progress bar.

---

## 7. Animation & Motion

### Timing Principles

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Instant | 0ms | — | Color changes on hover for buttons |
| Micro | 100ms | ease-out | Tooltips, popovers |
| Fast | 150ms | ease | Button states, input focus, toggles |
| Standard | 200ms | ease-in-out | Sidebar toggle, pane collapse |
| Smooth | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Theme switch, modal enter |

### Specific Interactions

**Pane Resizing**
- Live resize: Update splitter position on drag with `requestAnimationFrame`.
- No transition during drag — direct manipulation must be 1:1.
- On collapse/expand (via button): 250ms ease on `flex-basis`.

**Scroll Sync**
- Preview scroll should match editor scroll with **zero perceptible lag**.
- Use debounced or throttled sync at 16ms (60fps).
- If sync jumps (e.g., on large image load), fade in the preview update rather than snapping.

**Editor → Preview Updates**
- Typing: Preview updates should feel "live." Debounce at ~80ms for re-render.
- On re-render: If content changes structurally (new headings, images), animate new elements with a subtle fade-in (opacity 0→1, 150ms).
- Large documents: Show a 2px accent-colored progress bar at the top of the preview pane during heavy re-renders.

**Image Paste / Drop**
- On paste: Brief flash of `--accent-subtle` at the cursor position (200ms).
- On drop: Drag-over the editor shows a dashed 2px `--accent-default` border around the drop zone.
- After processing: Image fades in (opacity 0→1, 300ms) in the preview.

**Loading States**
- Skeleton screens instead of spinners where possible.
- If a spinner is needed: A 16px, 2px stroke, `--accent-default` CSS animation. Never use generic browser spinners.

---

## 8. Editor-Specific UX

### CodeMirror 6 Styling

- **Theme:** Fully custom theme using the token system above. No default CM6 light/dark theme.
- **Line numbers:** `--text-tertiary`, right-aligned, same font as editor.
- **Cursor:** Block cursor option in settings (default: line).
- **Active line:** Highlight only the line number, or a very subtle full-line tint.
- **Matching brackets:** 1px underline `--accent-default`, no distracting background box.
- **Selection:** Rounded corners (2px), `--accent-subtle` fill.

### Syntax Highlighting Colors (Editor)

A carefully tuned palette that works in both light and dark modes:

| Scope | Light | Dark |
|-------|-------|------|
| Keyword | `#D73A49` | `#FF7B72` |
| String | `#032F62` | `#A5D6FF` |
| Number | `#005CC5` | `#79C0FF` |
| Comment | `#6A737D` | `#8B949E` |
| Function | `#6F42C1` | `#D2A8FF` |
| Type | `#E36209` | `#FFA657` |
| Variable | `#24292E` | `#E6EDF3` |
| Operator | `#D73A49` | `#FF7B72` |

> Based on GitHub's Primer palette — proven, accessible, familiar to engineers.

### Markdown-Specific Enhancements

- **Headings in editor:** Slightly larger font size for `#` headings (e.g., H1 at 20px, H2 at 18px) to create a visual rhythm while editing.
- **URL underlines:** Links show a 1px dotted underline on hover only.
- **Task lists:** Custom checkbox rendering in the editor (not just `- [ ]` text).
- **Horizontal rules:** Rendered as a subtle 1px `--border-default` line across the editor width.

---

## 9. Preview Pane Design

### Rendering Goals

The preview is not a "web page" — it is a **typeset document**.

- Max width: 820px centered (optimal reading width).
- Padding: `--space-8` on sides, `--space-6` vertical.
- Font: System sans-serif for body, mono for code.

### Element Styling

**Headings**
- H1: 28px, weight 700, margin top `--space-10`, margin bottom `--space-4`.
- H2: 22px, weight 600, margin top `--space-8`, margin bottom `--space-3`.
- H3: 18px, weight 600, margin top `--space-6`, margin bottom `--space-3`.
- All headings: `--text-primary`, `letter-spacing: -0.02em`.
- H1/H2: Bottom border 1px `--border-default` as a subtle separator.

**Paragraphs**
- Margin: `--space-4` vertical.
- Line height: 1.7.

**Code Blocks**
- Background: `--bg-surface`.
- Border radius: `--radius-md`.
- Padding: `--space-4`.
- Font: `--font-mono`, 13px.
- Line numbers: Optional, `--text-tertiary`.
- Language badge: Top-right corner, `--text-xs`, `--text-tertiary`, background `--bg-hover`.

**Tables**
- Border collapse, full width.
- Header: Background `--bg-hover`, text `--text-primary`, weight 600.
- Cells: Padding `--space-2` `--space-3`.
- Borders: 1px `--border-default`.
- Striped rows: Alternating `--bg-subtle`.

**Blockquotes**
- Left border: 3px solid `--accent-muted`.
- Padding left: `--space-4`.
- Text: `--text-secondary`, italic.
- Background: transparent.

**Images**
- Max width: 100%, border radius `--radius-md`.
- Caption (if alt text provided): `--text-sm`, `--text-secondary`, centered below.
- On click: Lightbox zoom (subtle scale to 1.02, dim background overlay).

**Mermaid / Diagrams**
- Background: `--bg-surface`.
- Border radius: `--radius-md`.
- Centered with padding.

**Math (KaTeX)**
- Block math: Centered, `--space-6` vertical margin.
- Inline math: Slightly larger than body (1.05em) for baseline alignment.

---

## 10. Icons & Visual Language

### Icon Set

- **Primary:** [Lucide](https://lucide.dev/) — clean, consistent, MIT licensed, feels native.
- **Size:** 16px for buttons/toolbar, 18px for sidebar, 20px for empty states.
- **Stroke width:** 1.5px (Lucide default).
- **Color:** Inherit `--text-secondary` by default, `--text-primary` on hover, `--accent-default` when active/selected.

### Empty States

- Centered layout with a 48px muted icon.
- Title: `--text-lg`, `--text-primary`.
- Subtitle: `--text-sm`, `--text-secondary`.
- Action: Secondary button if applicable.

### Drag & Drop Visuals

- **Drag ghost:** Semi-transparent (opacity 0.8) snapshot of the dragged element.
- **Drop target:** Dashed 2px border `--accent-default`, background `--accent-subtle` at 30%.
- **Invalid drop:** Dashed 2px border `--error`, background `--error-bg`.

---

## 11. Responsive & Resize Behavior

### Minimum Window Size

- **Minimum:** 900px × 600px.
- Below this: Show a gentle warning overlay suggesting the window be resized.

### Adaptive Layouts

| Width | Behavior |
|-------|----------|
| > 1200px | Full layout: sidebar + dual pane |
| 900–1200px | Dual pane, sidebar auto-collapses to icons |
| < 900px | Single pane mode with tab toggle (Editor / Preview) |

### High-DPI (Retina) Support

- All CSS uses `px` values (they map to device pixels automatically via WebView).
- Icons as SVG (vector).
- Ensure 2× asset variants where raster is unavoidable.

---

## 12. Accessibility (A11y)

### Contrast Requirements

- All text must meet **WCAG AA** (4.5:1 for normal, 3:1 for large).
- `--text-primary` on `--bg-base`: ~16:1 (exceeds).
- `--text-secondary` on `--bg-surface`: ~7:1 (exceeds).
- `--accent-default` on `--bg-base`: ~5.5:1 (exceeds).

### Keyboard Navigation

- Full keyboard operability: No mouse-required features.
- `Tab` order is logical and visible.
- `Escape` closes modals, popovers, and menus.
- `Cmd/Ctrl + K` for command palette / quick search.
- Visible focus rings on all interactive elements.

### Motion Preferences

- Respect `prefers-reduced-motion`:
  - Disable all non-essential animations.
  - Instant transitions for theme switches.
  - No fade-ins for preview updates.

### Screen Reader Support

- Proper ARIA labels on all icon-only buttons.
- Live regions for toast notifications.
- Editor announced as "Markdown editor" with current document name.

---

## 13. Settings & Customization

### Appearance Settings

| Setting | Options | Default |
|---------|---------|---------|
| Theme | Light / Dark / System | System |
| Editor font size | 10–22px | 14px |
| Editor font family | JetBrains Mono, Fira Code, SF Mono, Custom | JetBrains Mono |
| Line height | 1.4, 1.5, 1.7, 2.0 | 1.7 |
| Word wrap | On / Off | On |
| Show line numbers | On / Off | On |
| Show minimap | On / Off | Off |
| Preview max width | 600–1000px | 820px |

### Settings UI Design

- Sidebar-based settings (like macOS Preferences / VS Code Settings).
- Categories: General, Editor, Preview, Shortcuts, Advanced.
- Changes apply instantly (no "Save" button needed).
- Reset to default per-section.

---

## 14. Interaction Patterns Summary

| Action | Visual Feedback |
|--------|-----------------|
| Hover button | Background `--bg-hover`, 150ms |
| Click button | Scale 0.97, background `--bg-active` |
| Focus input | Border `--accent-default`, glow ring |
| Toggle sidebar | Slide 200ms, content reflows |
| Resize pane | Real-time 1:1 drag, no transition |
| Scroll editor | Preview syncs at 60fps |
| Type in editor | Preview updates after 80ms debounce |
| Paste image | Cursor flash, then fade-in |
| Copy as JIRA | Toast: "Copied as JIRA" with checkmark |
| Save file | Status bar dot disappears instantly |
| Error | Toast slides in, red left border, auto-dismiss 5s |

---

## 15. Assets & File Organization

```
src/
├── styles/
│   ├── tokens.css          # CSS custom properties (all design tokens)
│   ├── base.css            # Global resets, typography, scrollbars
│   ├── components/         # Button, Input, Tooltip, etc.
│   ├── editor-theme.css    # CodeMirror 6 theme using tokens
│   ├── preview-theme.css   # Markdown preview styles using tokens
│   └── animations.css      # Keyframes, transition utilities
├── components/
│   ├── ui/                 # Reusable UI primitives
│   ├── layout/             # Sidebar, TitleBar, SplitPane, StatusBar
│   ├── editor/             # CodeMirror wrapper
│   └── preview/            # Preview renderer
```

---

*This document is a living specification. As implementation progresses, refine tokens and components based on real usage and user feedback.*
