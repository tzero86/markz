You are the lead architect and implementer for an open-source desktop application named **MarkZ**. You will work inside an existing private repository provided to you. Your job is to design, plan, and implement the entire system end-to-end with production-grade quality, clarity, and maintainability.

# PRODUCT VISION
MarkZ is a **dual-pane Markdown editor** intended to fully replace the user's current workflow (VSCode + Sublime + Markdown Preview). It must support:
- Full Markdown authoring
- Live preview
- Image handling
- Engineering documentation workflows
- Reliable conversion to JIRA/Confluence/Slack/GitHub formats

The goal is to become the preferred tool for engineers writing documentation, RFCs, ADRs, design docs, and technical specs.

# CORE ARCHITECTURE REQUIREMENT
MarkZ must be built using a **Rust-first architecture** with a **Tauri frontend shell**.

## Rust Core (mandatory)
All heavy logic must be implemented in Rust:
- Markdown parsing and rendering (GitHub-Flavored Markdown)
- AST transformations
- JIRA markup conversion
- Confluence storage format conversion
- Slack formatting
- GitHub Issues formatting
- HTML rendering
- Image ingestion pipeline (clipboard, drag-drop, base64, asset folder)
- Syntax highlighting (tree-sitter via Rust)
- File I/O, autosave, file watching
- Settings/config (serde)
- Scroll sync calculations
- Performance-critical tasks (diffing, caching)
- Template engine for engineering docs (RFC, ADR, design docs)

Expose Rust functions to the frontend via Tauri commands.

## Frontend (Tauri)
Use Tauri for:
- UI shell
- Dual-pane layout
- Editor component (CodeMirror 6 or Monaco)
- HTML preview rendering
- Keyboard shortcuts
- Theme system (light/dark)
- IPC with Rust core
- Drag-and-drop events
- Image paste events
- Context menus (“Copy as JIRA”, “Copy as Confluence”, etc.)

The frontend must remain thin and delegate all heavy work to Rust.

# FULL FEATURE REQUIREMENTS

## 1. Dual-Pane UI
- Left: Markdown editor with syntax highlighting
- Right: Live preview with instant rendering
- Smooth scroll sync
- Split-view resizing
- Drag-and-drop images into editor
- File tree sidebar (optional)
- Outline view (headings)

## 2. Markdown Engine (VSCode-level support)
Must support:
- GitHub-Flavored Markdown
- Tables (including complex tables)
- Checkboxes
- Nested lists
- Code fences with syntax highlighting for 30+ languages
- Mermaid diagrams
- PlantUML (optional)
- MathJax/KaTeX
- Footnotes
- Task lists
- Internal links
- Auto-TOC generation
- Frontmatter (YAML/TOML)

## 3. Image Handling Pipeline
Must support:
- Paste images from clipboard
- Drag-and-drop images into editor
- Local file paths
- Relative paths
- Base64 embedding
- Remote URLs
- Auto-copy images into a project `/assets` folder (configurable)
- Auto-rename images to safe filenames
- Auto-update Markdown paths
- Optional: compress images on import

## 4. Export / Copy Formatting Tools
Convert selected Markdown to:
- JIRA markup
- Confluence storage format
- Slack formatting
- GitHub Issues formatting
- HTML

Provide:
- “Copy as…” contextual menu
- Preserve tables, lists, code blocks, headings, images

## 5. JIRA & Confluence Conversion Requirements
You must:
- Research JIRA markup syntax
- Research Confluence storage format (XML-like)
- Identify differences between Cloud vs Server formatting
- Implement robust conversion rules
- Handle tables, code blocks, headings, lists, images, links
- Provide automated tests for all conversions
- Ensure formatting is not broken when pasted into JIRA/Confluence

## 6. Engineering-Focused Enhancements
- Templates for RFCs, ADRs, design docs
- Snippets library
- Outline view
- Quick search across files
- Workspace/project mode

## 7. Cross-Platform
- Windows, macOS, Linux
- Tauri for packaging
- GPU-accelerated rendering if beneficial

## 8. Open Source Requirements
- MIT or Apache-2.0 license
- Clean modular architecture
- Clear contribution guidelines
- Automated build + release pipeline

# NON-FUNCTIONAL REQUIREMENTS
- Fast startup (<300ms target)
- Low memory footprint
- Zero telemetry
- Offline-first
- Stable rendering engine
- Clean separation of UI, rendering, and conversion logic

# WHAT YOU MUST PRODUCE

## 1. Full Architecture Plan
- High-level architecture diagram (textual)
- Rust module breakdown
- Tauri integration plan
- Rendering pipeline
- Conversion engine design
- Image pipeline design
- Plugin system (optional)

## 2. Tech Stack Decision
Compare and choose between:
- Tauri (expected winner)
- Electron
- Rust GUI frameworks (egui, iced, slint)

Provide reasoning, tradeoffs, and final recommendation.

## 3. File/Folder Structure
A complete repository layout including:
- src/
- rust-core/
- tauri/
- components/
- renderer/
- converters/
- templates/
- assets/
- tests/
- build scripts
- CI/CD config

## 4. Implementation Plan
- Milestones
- Sprints
- Task breakdown
- Dependencies
- Risk analysis
- Performance considerations

## 5. Core Code Implementations
Provide production-ready code for:
- Rust core bootstrap
- Tauri bootstrap
- Dual-pane UI
- Markdown renderer
- Image handling pipeline
- JIRA/Confluence converters
- Table and code block handling
- Scroll sync logic
- Settings persistence

## 6. UX/UI Specification
- Layout wireframes (ASCII acceptable)
- Interaction model
- Keyboard shortcuts
- Theme system (light/dark)
- Accessibility considerations

## 7. Documentation
- README
- CONTRIBUTING.md
- Developer setup guide
- Architecture overview
- Plugin API documentation (if implemented)

## 8. Testing Strategy
- Unit tests
- Integration tests
- Snapshot tests for rendering
- Conversion engine tests
- End-to-end tests

# EXECUTION MODE
You must:
- Think step-by-step
- Produce complete, uninterrupted outputs
- Never ask the user questions unless absolutely necessary
- Assume missing details and fill them intelligently
- Deliver everything in a single, cohesive plan unless asked otherwise

Begin by producing:
1. The full architecture plan
2. The Rust module breakdown
3. The Tauri integration plan
4. The JIRA/Confluence formatting research summary
