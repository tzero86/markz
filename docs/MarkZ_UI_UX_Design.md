# MarkZ — UI/UX Design Specification

> **Version:** 1.1 (aligned with app v0.8.66)  
> **Status:** Implemented — living reference for the shipped frontend  
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
| `--bg-base` | `#FAFAFA` | `#0D0D0D` | App background |
| `--bg-surface` | `#FFFFFF` | `#181818` | Panels, sidebars, toolbars |
| `--bg-elevated` | `#FFFFFF` | `#222222` | Cards, popovers, menus |
| `--bg-hover` | `#F0F0F0` | `#2A2A2A` | Hover states |
| `--bg-active` | `#E8E8E8` | `#323232` | Active/pressed states |
| `--bg-subtle` | `#F5F5F5` | `#141414` | Subtle differentiation |
| `--bg-pressed` | `#E0E0E0` | `#3A3A3A` | Pressed/deep states |
| `--border-default` | `#E2E2E2` | `#2A2A2A` | Dividers, borders |
| `--border-subtle` | `#EDEDED` | `#222222` | Very subtle borders |
| `--border-focus` | `#B8B8B8` | `#4A4A4A` | Focused borders |

#### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | `#1A1A1A` | `#F0F0F0` | Headings, primary content |
| `--text-secondary` | `#6B6B6B` | `#A0A0A0` | Meta text, timestamps |
| `--text-tertiary` | `#A0A0A0` | `#6B6B6B` | Placeholders, disabled |
| `--text-muted` | `#C0C0C0` | `#4A4A4A` | Very faint hints |
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
| `--info-bg` | `#EFF6FF` | `#172554` | Info backgrounds |

#### Slide Break Tokens

Used by the presentation slide-break gutter and preview boundary markers.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--slide-break-end` | `#B05A5A` | `#D48888` | "Slide ends here" marker |
| `--slide-break-start` | `#4A8A5A` | `#7EC494` | "Slide starts here" marker |
| `--slide-break-end-bg` | `rgba(176,90,90,0.12)` | `rgba(212,136,136,0.15)` | End marker background |
| `--slide-break-start-bg` | `rgba(74,138,90,0.12)` | `rgba(126,196,148,0.15)` | Start marker background |

#### Shadow Elevation Scale

| Token | Value |
|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` light / `0.2` dark |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` light / `0.35` dark |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` light / `0.5` dark |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.16)` light / `0.6` dark |
| `--shadow-focus` | `0 0 0 3px rgba(13,138,93,0.15)` light / `rgba(61,214,141,0.2)` dark |

#### Editor Cursor

| Token | Value |
|-------|-------|
| `--editor-cursor` | `--accent-default` | Inherited by CodeMirror caret color |

### Theme Switching

- Transition between light/dark must be **smooth** (300ms `var(--ease-in-out)`) on all color properties.
- Use CSS custom properties at the `:root` level; toggle `data-theme` on `<html>`.
- Respect system preference by default (`prefers-color-scheme`).
- Theme presets are applied via `data-theme-preset` on `<html>`; selecting a preset overrides the default light/dark palette until the preset is cleared.
- Reduced motion is controlled by `data-reduced-motion="true"` on `<html>` and by the `prefers-reduced-motion` media query.

### Theme Presets

MarkZ ships 17 curated color palettes selectable from Settings → General → Color Preset:

- **Default** — Emerald accent on clean light/dark neutrals.
- **Nord** — Arctic north-bluish dark.
- **Dracula** — Purple-tinted dark.
- **Tokyo Night** — Deep blue-purple dark.
- **Gruvbox Dark / Light** — Retro warm palettes.
- **Solarized Dark / Light** — Ethan Schoonover classic.
- **High Contrast** — Accessibility-first pure black/white.
- **WGSN 2026 Dark Palettes** — Cosmic, Supernatural, Restorative, Hedonistic, Luxurious, Ancient, Subversive, Noir.

Each preset defines the full token set (backgrounds, text, accents, status colors, syntax highlighting, shadows, focus rings, and slide-break colors). Selecting a preset applies immediately and is persisted to settings.

### Preview Pane Color Adaptation

The HTML preview renders with theme-aware styles. The rendered Markdown inherits the app's color tokens so that preview and editor feel like one surface, not two separate worlds.

---

## 3. Typography

### Font Stack

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Segoe UI Emoji",
  Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif,
  "Apple Color Emoji", "Segoe UI Symbol", "Noto Color Emoji";
--font-mono: "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code",
  "Consolas", "Menlo", monospace,
  "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
```

> **Note:** JetBrains Mono is the default editor font. The preview pane additionally uses a `MarkZEmoji` font-face fallback so emoji and symbols in file names render correctly.

### Type Scale

Tokens are defined in `rem` against a configurable `--ui-font-size` (default 14px).

| Token | Default size | Weight | Line Height | Letter Spacing | Usage |
|-------|--------------|--------|-------------|----------------|-------|
| `--text-xs` | 11px | 400 | 16px | 0.01em | Status bar, badges |
| `--text-sm` | 12px | 400 | 20px | 0 | UI labels, sidebar items |
| `--text-base` | 14px | 400 | 22px | 0 | Body text |
| `--text-md` | 15px | 400 | 24px | -0.01em | Preview body default |
| `--text-lg` | 17px | 500 | 28px | -0.01em | Section titles |
| `--text-xl` | 20px | 600 | 28px | -0.02em | Dialog titles |
| `--text-2xl` | 24px | 700 | 32px | -0.02em | Empty states |

### Editor Typography

- **Font family:** User-configurable, default `JetBrains Mono`.
- **Font size:** User-configurable, default 14px.
- **Line height:** User-configurable, default 1.7.
- **Caret:** 2px wide, `--accent-default`, blinking at OS-native rate.

### Preview Typography

- **Body:** User-configurable font size (default 16px), `--text-primary`, line height 1.7.
- **Headings:** Tightly tracked, bold, with generous margins.
- **Code blocks:** `--font-mono`, ~13px, with subtle background (`--bg-surface`).
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
| `--radius-sm` | 6px | Buttons, inputs, tags |
| `--radius-md` | 8px | Cards, popovers |
| `--radius-lg` | 10px | Dialogs, modals |
| `--radius-xl` | 14px | Large panels |
| `--radius-full` | 9999px | Pills, avatars |

---

## 5. Layout Architecture

### Overall Window Layout

```
┌────────────────────────────────────────────────────────────┐
│  Title Bar (frameless, custom, 40px)                        │
├──────┬─────────────────────────────────────────────────────┤
│      │  Tab Bar                                            │
│  A   ├─────────────────────────────────────────────────────┤
│  c   │                                                     │
│  t   │  Editor Pane          │  Preview Pane              │
│  i   │  (CodeMirror 6)       │  (Rendered HTML)           │
│  v   │                       │                            │
│  i   │                       │                            │
│  t   ├───────────────────────┼────────────────────────────┤
│  y   │  Status Bar (30px)                                  │
│  B   ├─────────────────────────────────────────────────────┤
│  a   │  Debug Panel (collapsible, resizable)               │
│  r   │                                                     │
└──────┴─────────────────────────────────────────────────────┘
```

### Frameless Window Chrome

- Custom title bar integrated with the toolbar (40px).
- Drag region is the entire title bar except interactive elements (`-webkit-app-region: drag`).
- Brand icon, breadcrumb path, document title with dirty indicator, and action groups live in the title bar.

### Activity Bar

- **Width:** 36px, fixed.
- **Position:** Far left, vertical column.
- **Items:** Files, Outline, Links.
- **Active state:** Accent color with tinted background (`--accent-muted`).

### Dual-Pane Editor

- **Default split:** 50/50.
- **Resizable:** Drag the center divider to adjust widths/heights.
- **Divider appearance:** 1px `--border-default`, with a 6px invisible hit area and a visible 3×24px grab handle on hover. On hover/drag the divider brightens to `--accent-default`.
- **Split limits:** 20% minimum, 80% maximum per pane.
- **Collapse modes:** Users can collapse either pane to go full-editor or full-preview.
- **Split directions:** Horizontal (side by side), vertical (preview below), or vertical-reversed (preview above).
- **Animation:** No transition during live drag; hidden panes use `display: none`.

### Sidebar

- **Width:** 220px default, resizable.
- **Behavior:** Collapsible with `Cmd/Ctrl + B` or via the activity bar.
- **Sections:** File tree / workspace, Outline, Backlinks.

### Debug Panel

- **Position:** Bottom of the window, above the status bar.
- **Height:** User-resizable, persisted in settings (default ~180px).
- **Toggle:** `Ctrl+Shift+Y` (`Cmd+Shift+Y` on macOS) or Command Palette.
- **Features:** Log level filtering, error badge when collapsed, ring buffer (500 entries).

### Z-Index Layering

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base | 0 | App background |
| Content | 10 | Editor, preview |
| Floating | 100 | Splitter, sticky headers |
| Popover | 200 | Dropdowns, tooltips |
| Overlay | 300 | Modals, dialogs |
| Toast | 1000 | Notifications |

---

## 6. Component Design

### Buttons

**Primary Button** (`btn-primary`)
- Background: `--accent-default`
- Text: `--text-inverse`, `--text-sm` (~12px), weight 500
- Padding: `--space-2` `--space-4` (8px 16px)
- Border radius: `--radius-sm`
- Hover: Background shifts to `--accent-hover`, 150ms ease.
- Active: Scale to 0.98, background darkens further.
- Focus: 2px outline `--accent-default` offset 2px.

**Secondary Button** (`btn-secondary`)
- Background: `--bg-elevated`
- Border: 1px `--border-default`
- Text: `--text-primary`
- Hover: Background `--bg-hover`, border `--border-focus`.
- Active: Scale to 0.98.

**Ghost Button (Toolbar)** (`btn-ghost`)
- Background: transparent
- Text: `--text-secondary`
- Hover: Background `--bg-hover`, text `--text-primary`.
- Size: 28px × 28px with centered 16px icon.
- Active: Scale to 0.96.

**Danger Button** (`btn-danger`)
- Background: `--error`
- Text: `--text-inverse`
- Hover: Opacity 0.9.
- Active: Scale to 0.98.

### Inputs

- Background: `--bg-base`
- Border: 1px `--border-default`
- Border radius: `--radius-sm`
- Padding: `--space-2` `--space-3`
- Font size: `--text-sm`
- Focus: Border transitions to `--accent-default`, shadow `0 0 0 3px var(--accent-subtle)`.
- Transition: 150ms ease on border-color and box-shadow.
- Variants: `.input-field`, `.textarea-field`, `.select-field`, `.input-search`.

### Editor Surface

- No visible border around the editor itself — it bleeds into the container.
- Background: `--bg-base`.
- Gutter (if shown): `--bg-surface`, right border 1px `--border-default`.
- Active line highlight: transparent content background; active line number uses `--bg-hover`.
- Selection: `--accent-subtle` background, `--text-primary` text.

### Scrollbars

- **App scrollbars:** 8px width, transparent track, thumb `--text-tertiary` at 30% opacity, `--radius-full`.
- **Thumb hover:** `--text-secondary` at 50% opacity.
- **CodeMirror editor scrollbar:** 6px width, thumb `--text-muted`.
- **Behavior:** Standard WebKit scrollbars (overlay scrollbars where the OS supports them).

### Tooltips

- Background: `--bg-elevated`
- Border: 1px `--border-default`
- Text: `--text-secondary`, 12px
- Padding: `--space-1` `--space-3` (4px 12px)
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
- Text: `--text-primary`, `--text-sm`
- Hover: `--bg-hover`
- Active/selected: `--bg-active`
- Divider: 1px `--border-default`, margin `--space-1` vertical
- Animation: Scale from 0.97 + fade in, 120ms ease-out.

### Toasts / Notifications

- Position: Bottom-right, `--space-5` from edges.
- Background: `--bg-elevated`
- Border: 1px `--border-subtle`
- Border-left accent: 3px semantic color (`--accent-default` default, `--success`, `--error`, `--info`).
- Shadow: `--shadow-lg`
- Animation: Slide in from right (350ms spring), auto-dismiss with a 2px shrinking progress bar.
- Default duration: 3000ms.

### Badges / Tags

- Background: `--bg-subtle`
- Border: 1px `--border-default`
- Text: `--text-secondary`, `--text-xs`, weight 500
- Border radius: `--radius-full`
- Variants: accent, success, warning, error, info (using semantic colors).

---

## 7. Animation & Motion

### Timing Principles

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Instant | 0ms | — | Color changes on hover for buttons |
| Micro | 100ms | ease-out | Tooltips, popovers |
| Fast | 150ms | ease | Button states, input focus, toggles |
| Standard | 200ms | ease-in-out | Preview fade-in, sidebar toggle |
| Smooth | 300ms | `var(--ease-in-out)` | Theme switch, modal enter |

#### Easing Curves

| Token | Curve |
|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-smooth` | `cubic-bezier(0.45, 0.05, 0.55, 0.95)` |

### Specific Interactions

**Pane Resizing**
- Live resize: Update splitter position on drag directly.
- No transition during drag — direct manipulation must be 1:1.
- Collapse/expand uses CSS `display: none`; no flex transition.

**Scroll Sync**
- Preview scroll matches editor scroll via heading anchors with ratio fallback.
- Scroll lock grace period of 150ms prevents feedback loops from coalesced scroll events.

**Editor → Preview Updates**
- Typing: Preview debounces re-render at **50ms**.
- On re-render: New preview content fades in (opacity 0→1, 200ms `var(--ease-out)`).
- Large documents: A 2px accent-colored progress bar appears at the top of the preview pane with a shimmer animation.

**Image Paste / Drop**
- Paste and drop both route through the single `save_image` backend command.
- On paste: Brief flash of `--accent-subtle` at the cursor position (300ms).
- On drop: Drag-over the editor shows a dashed 2px `--accent-default` border around the drop zone.
- After processing: The inserted Markdown image renders in the preview on the next render cycle.

**Loading States**
- Skeleton screens use the `.skeleton` utility with a 1.5s shimmer animation.
- If a spinner is needed: 12–16px, 2px stroke, `--accent-default`, 600ms linear spin.

---

## 8. Editor-Specific UX

### CodeMirror 6 Styling

- **Theme:** Fully custom theme using the token system above. No default CM6 light/dark theme.
- **Line numbers:** `--text-tertiary`, right-aligned, 12px, same font as editor.
- **Cursor:** Line cursor, 2px wide, `--accent-default`.
- **Active line:** Content background is transparent; active line number uses `--bg-hover`.
- **Matching brackets:** 1px underline `--accent-default`, no distracting background box.
- **Selection:** Rounded corners (2px), `--accent-subtle` fill.
- **Search matches:** Current match uses `--accent-default`; other matches use `--warning-bg` with `--warning` outline.

### Syntax Highlighting Colors (Editor)

A carefully tuned palette based on GitHub's Primer palette that adapts per theme preset:

| Scope | Default Light | Default Dark |
|-------|---------------|--------------|
| Keyword | `#D73A49` | `#FF7B72` |
| String | `#032F62` | `#A5D6FF` |
| Number | `#005CC5` | `#79C0FF` |
| Comment | `#6A737D` | `#8B949E` |
| Function | `#6F42C1` | `#D2A8FF` |
| Type | `#E36209` | `#FFA657` |
| Variable | `#24292E` | `#E6EDF3` |
| Operator | `#D73A49` | `#FF7B72` |
| Property | `#005CC5` | `#79C0FF` |
| Regexp | `#032F62` | `#A5D6FF` |
| Deleted | `#B31D28` | `#FFA198` |
| Inserted | `#22863A` | `#56D364` |
| Changed | `#E36209` | `#E2B142` |
| Tag | `#22863A` | `#7EE787` |
| Attr name | `#6F42C1` | `#D2A8FF` |
| Attr value | `#032F62` | `#A5D6FF` |

### Markdown-Specific Enhancements

- **Headings in editor:** Slightly larger font size for `#` headings (H1 20px, H2 18px, H3 16px) to create a visual rhythm while editing.
- **Links:** Underlined in the editor using `--syntax-link`.
- **Smart list continuation:** Pressing `Enter` on a list item continues the list; `Enter` on an empty item exits it.
- **Auto-pair delimiters:** Typing `*`, `` ` ``, `[`, `(`, `{`, `"`, `'` auto-inserts the closing pair.
- **Horizontal rules:** Rendered as a subtle 1px `--border-default` line across the editor width.
- **Slide break gutter:** Optional visual breakpoints for presentation mode, persisted per tab.

---

## 9. Preview Pane Design

### Rendering Goals

The preview is not a "web page" — it is a **typeset document**.

- Max width: 820px centered (optimal reading width), user-configurable (400–1600px).
- Padding: `--space-8` on sides, `--space-6` vertical.
- Font: `--font-sans` (with emoji fallback) for body, `--font-mono` for code.
- Font size: User-configurable (default 16px).

### Element Styling

**Headings**
- H1: 28px, weight 700, margin top `--space-10`, margin bottom `--space-4`.
- H2: 22px, weight 600, margin top `--space-8`, margin bottom `--space-3`.
- H3: 18px, weight 600, margin top `--space-6`, margin bottom `--space-3`.
- H4: 16px, weight 600, margin top `--space-5`, margin bottom `--space-2`.
- H5/H6: `--text-md`, weight 600, `--text-secondary`.
- All headings: `--text-primary`, `letter-spacing: -0.02em`.
- H1/H2: Bottom border 1px `--border-default` as a subtle separator.

**Paragraphs**
- Margin: `--space-4` vertical.
- Line height: 1.7.

**Code Blocks**
- Background: `--bg-surface`.
- Border: 1px `--border-default`.
- Border radius: `--radius-md`.
- Padding: `--space-4`.
- Font: `--font-mono`, ~13px.
- Language badge: Top-right corner, `--text-xs`, `--text-tertiary`, background `--bg-hover`, uppercase.

**Tables**
- Border collapse, full width.
- Header: Background `--bg-hover`, text `--text-primary`, weight 600.
- Cells: Padding `--space-2` `--space-3`.
- Borders: 1px `--border-default`.
- Striped rows: Alternating `--bg-subtle`.
- Hover: Row background `--bg-hover`.
- Double-click a table to open the inline table editor modal.

**Blockquotes**
- Left border: 3px solid `--accent-muted`.
- Padding: `--space-2` 0 `--space-2` `--space-4`.
- Text: `--text-secondary`, italic.
- Background: transparent.

**Images**
- Max width: 100%, border radius `--radius-md`.
- Margin: `--space-4` vertical.
- Box shadow: `--shadow-sm`.

**Task Lists**
- Checkboxes are rendered in the preview.
- Clicking a checkbox toggles the corresponding `- [ ]` / `- [x]` in the editor source.

**Mermaid / Diagrams**
- Background: `--bg-surface`.
- Border: 1px `--border-default`.
- Border radius: `--radius-md`.
- Centered with padding.
- Scaled with the preview zoom level.

**Math (KaTeX)**
- Block math: Centered, `--space-6` vertical margin, background `--bg-surface`, border `--radius-md`.
- Inline math: Slightly larger than body (1.05em) for baseline alignment.

**Slide Break Markers**
- Horizontal gradient line (`--slide-break-end` → `--slide-break-start`).
- Rounded badge with slide number.
- Only visible when slide-break mode is enabled for the current tab.

**Inline Search**
- `Ctrl+F` in the preview opens a search bar with previous/next navigation and match highlighting.
- Active match uses `--accent-default`; inactive matches use `--accent-subtle`.

**Floating Action Bar**
- Sticky top-right bar inside the preview scroller.
- Actions: Copy dropdown (HTML, JIRA, Confluence, Slack, GitHub, Word via Pandoc), TTS controls (play/pause/stop), Start presentation.
- Style: Frosted-glass background (`color-mix` + `backdrop-filter`), 11px labels, `--shadow-sm`.

---

## 10. Icons & Visual Language

### Icon Set

- **Primary:** [Lucide](https://lucide.dev/) — clean, consistent, MIT licensed, feels native.
- **Size:** 15px for title-bar and activity-bar buttons; 16px for standard buttons; 18px for sidebar; 48px for empty states.
- **Stroke width:** 1.5px default; 2px for small tool buttons where extra clarity is needed.
- **Color:** Inherit `--text-secondary` by default, `--text-primary` on hover, `--accent-default` when active/selected.

### Empty States

- Centered layout with a muted 48px icon.
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
- Default light theme `--text-primary` on `--bg-base`: ~16:1 (exceeds).
- Default light theme `--text-secondary` on `--bg-surface`: ~7:1 (exceeds).
- Default light theme `--accent-default` on `--bg-base`: ~5.5:1 (exceeds).
- The **High Contrast** preset is available for users who need stronger differentiation.

### Keyboard Navigation

- Full keyboard operability: No mouse-required features.
- `Tab` order is logical and visible.
- `Escape` closes modals, popovers, menus, and the command palette.
- `Cmd/Ctrl + K` opens the command palette.
- `Cmd/Ctrl + Shift + P` opens quick file open.
- `Cmd/Ctrl + Shift + F` opens workspace search.
- `Cmd/Ctrl + Shift + Y` toggles the debug panel.
- Visible focus rings on all interactive elements (`:focus-visible` uses `--shadow-focus`).

### Motion Preferences

- Respect `prefers-color-scheme` for the default theme.
- Respect `prefers-reduced-motion`:
  - Disable all non-essential animations.
  - Instant transitions for theme switches.
  - No fade-ins for preview updates.
- Also controllable via the **Reduced motion** setting, which sets `data-reduced-motion="true"` on `<html>`.

### Screen Reader Support

- Proper `aria-label` on all icon-only buttons.
- `role="status"` and `aria-live="polite"` on toast notifications.
- `role="separator"` and `aria-label="Resize panes"` on the split-pane divider.
- Editor announced as a Markdown editor with current document name.

---

## 13. Settings & Customization

### Appearance Settings

| Setting | Options | Default |
|---------|---------|---------|
| Theme | Light / Dark / System | System |
| Color preset | Default + 16 curated presets (Nord, Dracula, Tokyo Night, Gruvbox, Solarized, High Contrast, 8 WGSN 2026 dark palettes) | Default |
| UI font size | 10–24px | 14px |
| Editor font size | 8–32px | 14px |
| Editor font family | JetBrains Mono, Fira Code, Source Code Pro, Cascadia Code, Consolas, Monaco, Menlo, Courier New, monospace | JetBrains Mono |
| Line height | 1.0–3.0 (0.1 step) | 1.7 |
| Word wrap | On / Off | On |
| Show line numbers | On / Off | On |
| Show minimap | On / Off | Off |
| Spellcheck | On / Off | On |
| Vim mode | On / Off | Off |
| Preview font size | 8–32px | 16px |
| Preview max width | 400–1600px | 820px |
| Embed remote images | On / Off | Off |
| Reduced motion | On / Off | Off |
| Default view mode | Split / Editor only / Preview only | Split |
| Split direction | Horizontal / Vertical / Vertical-reversed | Horizontal |
| Auto save | On / Off | On |
| Auto save interval | seconds | 30 |
| Custom CSS | free-form text | (empty) |

### Settings UI Design

- Sidebar-based settings (like macOS Preferences / VS Code Settings).
- Categories: General, Editor, Preview, Shortcuts, Advanced, About.
- Real-time search filter at the top of the modal.
- Changes apply instantly (no "Save" button needed).
- Reset to default per-section.

---

## 14. Interaction Patterns Summary

| Action | Visual Feedback |
|--------|-----------------|
| Hover button | Background `--bg-hover`, 150ms |
| Click button | Scale 0.97–0.98, background `--bg-active` |
| Focus input | Border `--accent-default`, shadow ring |
| Toggle sidebar | `Cmd/Ctrl + B`; auto-collapses below 1200px |
| Resize pane | Real-time 1:1 drag, no transition |
| Scroll editor | Preview syncs via heading anchors + ratio fallback |
| Type in editor | Preview updates after 50ms debounce |
| Paste / drop image | Cursor flash, then image inserted as Markdown |
| Copy as JIRA | Toast: "Copied as JIRA" with checkmark |
| Save file | Status bar dot switches to Saved instantly |
| Error | Toast slides in, red left border, auto-dismiss 3s |
| Open command palette | `Cmd/Ctrl + K` |
| Open quick file open | `Cmd/Ctrl + Shift + P` |
| Toggle presentation | `F5` |
| Toggle debug panel | `Cmd/Ctrl + Shift + Y` |
| Search workspace | `Cmd/Ctrl + Shift + F` |

---

## 15. Assets & File Organization

```
src/
├── styles/
│   ├── tokens.css          # CSS custom properties (all design tokens)
│   ├── presets.css         # Theme preset palettes (17 total)
│   ├── base.css            # Global resets, typography, scrollbars
│   ├── components/         # Button, Input, Tooltip, Badge, Context Menu
│   ├── editor-theme.css    # CodeMirror 6 theme using tokens
│   ├── preview-theme.css   # Markdown preview styles using tokens
│   └── animations.css      # Keyframes, transition utilities, skeleton
├── components/
│   ├── ui/                 # CommandPalette, Toast, EmptyState, etc.
│   ├── layout/             # TitleBar, SplitPane, StatusBar, ActivityBar, DebugPanel
│   ├── editor/             # CodeMirror wrapper, Toolbar, TableEditorModal
│   ├── preview/            # PreviewPane, PresentationMode
│   ├── settings/           # SettingsModal + category components
│   └── templates/          # Template browser and save dialog
```

---

*This document is a living specification. As implementation progresses, refine tokens and components based on real usage and user feedback.*
