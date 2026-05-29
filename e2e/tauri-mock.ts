// Mocks Tauri backend commands for browser-based E2E testing.
// ALL data must be inlined — external references are lost during serialization.

export const MOCK_SETTINGS = {
  theme: "dark",
  editor_font_size: 14,
  editor_font_family: "JetBrains Mono",
  line_height: 1.7,
  word_wrap: true,
  show_line_numbers: true,
  show_minimap: false,
  preview_max_width: 800,
  auto_save: false,
  auto_save_interval_seconds: 30,
  embed_remote_images: false,
  show_outline: true,
  view_mode: "split",
  preview_font_size: 16,
  reduced_motion: false,
  ui_font_size: 14,
  pandoc_path: "",
};

export const MOCK_HTML = `<h1>Welcome to MarkZ</h1>
<blockquote><p><strong>The engineer's Markdown editor.</strong> Built for speed, designed for clarity, and optimized for the tools you already use.</p></blockquote>
<p>MarkZ is a dual-pane Markdown editor that helps you write, preview, and export engineering documents without friction. Whether you're drafting RFCs, documenting APIs, or preparing content for JIRA and Confluence, MarkZ keeps you in flow.</p>
<hr>
<h2>What Makes MarkZ Different</h2>
<table>
<thead><tr><th>Feature</th><th>Description</th></tr></thead>
<tbody>
<tr><td><strong>Live Preview</strong></td><td>See your document render instantly as you type</td></tr>
<tr><td><strong>Export Pipeline</strong></td><td>One-click export to JIRA, Confluence, Slack, GitHub, and DOCX</td></tr>
<tr><td><strong>Image Handling</strong></td><td>Paste from clipboard or drag-and-drop — images are organized automatically</td></tr>
<tr><td><strong>Syntax Highlighting</strong></td><td>30+ languages with tree-sitter accuracy</td></tr>
<tr><td><strong>Math &amp; Diagrams</strong></td><td>KaTeX for equations, Mermaid for flowcharts</td></tr>
<tr><td><strong>Templates</strong></td><td>Built-in RFC, ADR, Bug Report, and more</td></tr>
</tbody>
</table>
<hr>
<h2>Quick Start</h2>
<h3>1. Write Markdown</h3>
<p>MarkZ supports standard CommonMark plus extensions:</p>
<p><strong>Formatting:</strong> <em>italic</em>, <strong>bold</strong>, <code>inline code</code>, <del>strikethrough</del></p>
<ul>
<li>Unordered items</li>
<li class="task-list-item"><p><input type="checkbox" checked="" disabled=""> Completed tasks</p></li>
<li class="task-list-item"><p><input type="checkbox" disabled=""> Pending tasks</p></li>
</ul>
<pre><code class="language-rust">fn main() {
    println!("Hello, MarkZ!");
}
</code></pre>
<h3>2. Preview Your Work</h3>
<p>The right pane renders your document in real time. Toggle between <strong>HTML</strong>, <strong>JIRA</strong>, <strong>Confluence</strong>, <strong>Slack</strong>, and <strong>GitHub</strong> preview modes to see exactly how your content will look in each platform.</p>
<h3>3. Export Cleanly</h3>
<p>MarkZ exports <strong>only what you write</strong> — no watermarks, no "created with" banners, no unwanted metadata. Your content stays yours.</p>
<hr>
<h2>Keyboard Shortcuts</h2>
<table>
<thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
<tbody>
<tr><td><code>Ctrl + S</code></td><td>Save document</td></tr>
<tr><td><code>Ctrl + O</code></td><td>Open file</td></tr>
<tr><td><code>Ctrl + T</code></td><td>New tab</td></tr>
<tr><td><code>Ctrl + W</code></td><td>Close tab</td></tr>
<tr><td><code>Ctrl + B</code></td><td>Toggle outline sidebar</td></tr>
<tr><td><code>Ctrl + =</code></td><td>Zoom in</td></tr>
<tr><td><code>Ctrl + -</code></td><td>Zoom out</td></tr>
<tr><td><code>Ctrl + 0</code></td><td>Reset zoom</td></tr>
</tbody>
</table>
<hr>
<h2>Formatting Reference</h2>
<p>This section exercises every formatting feature MarkZ supports.</p>
<h3>Headings</h3>
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
<h3>Inline Formatting</h3>
<p>Normal text, <strong>bold text</strong>, <em>italic text</em>, <del>strikethrough</del>, and <code>inline code</code>.</p>
<p>Combined: <em><strong>bold italic</strong></em>, <strong><code>bold code</code></strong>, <em><code>italic code</code></em>.</p>
<p><a href="https://example.com">External link to example.com</a></p>
<h3>Code Blocks</h3>
<h4>Rust</h4>
<pre><code class="language-rust">fn main() {
    let message = "Hello, MarkZ!";
    println!("{}", message);
}
</code></pre>
<h4>Python</h4>
<pre><code class="language-python">def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
</code></pre>
<h4>JSON</h4>
<pre><code class="language-json">{
  "name": "MarkZ",
  "version": "0.1.0",
  "features": ["preview", "export", "templates"]
}
</code></pre>
<h3>Blockquotes</h3>
<blockquote><p>Single-level blockquote with <strong>bold</strong> and <code>code</code>.</p></blockquote>
<blockquote><p>Multi-paragraph blockquote.</p><p>Second paragraph with a <a href="https://example.com">link</a>.</p></blockquote>
<blockquote><blockquote><p>Nested blockquote level 2</p><blockquote><p>Nested blockquote level 3</p></blockquote></blockquote></blockquote>
<h3>Lists</h3>
<h4>Unordered</h4>
<ul>
<li>First item</li>
<li>Second item
<ul>
<li>Nested item A</li>
<li>Nested item B
<ul>
<li>Deep nested item</li>
</ul>
</li>
</ul>
</li>
<li>Third item</li>
</ul>
<h4>Ordered</h4>
<ol>
<li>First step</li>
<li>Second step
<ol>
<li>Sub-step A</li>
<li>Sub-step B</li>
</ol>
</li>
<li>Third step</li>
</ol>
<h4>Task List</h4>
<ul>
<li class="task-list-item"><p><input type="checkbox" checked="" disabled=""> Completed task</p></li>
<li class="task-list-item"><p><input type="checkbox" disabled=""> Pending task</p></li>
<li class="task-list-item"><p><input type="checkbox" disabled=""> Another pending task</p>
<ul>
<li class="task-list-item"><p><input type="checkbox" checked="" disabled=""> Sub-task done</p></li>
<li class="task-list-item"><p><input type="checkbox" disabled=""> Sub-task waiting</p></li>
</ul>
</li>
</ul>
<h4>Mixed</h4>
<ol>
<li>Ordered first
<ul>
<li>Unordered nested</li>
<li>Another nested</li>
</ul>
</li>
<li>Ordered second
<ol>
<li>Ordered nested</li>
<li>Another nested</li>
</ol>
</li>
</ol>
<h3>Tables</h3>
<h4>Simple Table</h4>
<table>
<thead><tr><th>Feature</th><th>Status</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Headings</td><td>✅</td><td>All 6 levels</td></tr>
<tr><td>Bold/Italic</td><td>✅</td><td>Combined styles</td></tr>
<tr><td>Code Blocks</td><td>✅</td><td>Syntax highlighting</td></tr>
<tr><td>Tables</td><td>✅</td><td>This one!</td></tr>
<tr><td>Images</td><td>✅</td><td>Local &amp; remote</td></tr>
</tbody>
</table>
<h4>Alignment Table</h4>
<table>
<thead><tr><th>Left</th><th>Center</th><th>Right</th></tr></thead>
<tbody>
<tr><td>L1</td><td>C1</td><td>R1</td></tr>
<tr><td>L2</td><td>C2</td><td>R2</td></tr>
<tr><td>L3</td><td>C3</td><td>R3</td></tr>
</tbody>
</table>
<h3>Horizontal Rules</h3>
<p>Above rule.</p>
<hr>
<p>Below rule with <strong>bold</strong> text.</p>
<hr>
<p>Another rule.</p>
<h3>Special Characters &amp; Escapes</h3>
<ul>
<li>Asterisk: *not italic*</li>
<li>Hash: # not heading</li>
<li>Backtick: \\\" not code</li>
<li>Ampersand: AT&amp;T</li>
<li>Less/Greater: 5 &lt; 10 &gt; 2</li>
<li>Emoji: 🚀 ✅ ❌ 💡</li>
</ul>
<hr>
<h2>Math</h2>
<p>Inline math: <span class="katex">E = mc^2</span> and <span class="katex">F⃗ = ma⃗</span></p>
<p>Block math:</p>
<span class="katex-display">∫_{-∞}^{∞} e^{-x^2} dx = √π</span>
<p>Matrix:</p>
<span class="katex-display">[a b; c d]^{-1} = 1/(ad-bc) [d -b; -c a]</span>
<hr>
<h2>Mermaid Diagram</h2>
<div class="mermaid-diagram">[Mermaid diagram placeholder]</div>
<hr>
<h2>HTML Details (if supported)</h2>
<details><summary>Click to expand</summary><p>Hidden content inside a details block.</p></details>
<hr>
<p><em>Welcome to MarkZ</em></p>`;

export const FORMATTING_TEST_MD = [
  "# Welcome to MarkZ",
  "",
  "> **The engineer's Markdown editor.** Built for speed, designed for clarity, and optimized for the tools you already use.",
  "",
  "MarkZ is a dual-pane Markdown editor that helps you write, preview, and export engineering documents without friction. Whether you're drafting RFCs, documenting APIs, or preparing content for JIRA and Confluence, MarkZ keeps you in flow.",
  "",
  "---",
  "",
  "## What Makes MarkZ Different",
  "",
  "| Feature | Description |",
  "|---------|-------------|",
  "| **Live Preview** | See your document render instantly as you type |",
  "| **Export Pipeline** | One-click export to JIRA, Confluence, Slack, GitHub, and DOCX |",
  "| **Image Handling** | Paste from clipboard or drag-and-drop — images are organized automatically |",
  "| **Syntax Highlighting** | 30+ languages with tree-sitter accuracy |",
  "| **Math & Diagrams** | KaTeX for equations, Mermaid for flowcharts |",
  "| **Templates** | Built-in RFC, ADR, Bug Report, and more |",
  "",
  "---",
  "",
  "## Quick Start",
  "",
  "### 1. Write Markdown",
  "MarkZ supports standard CommonMark plus extensions:",
  "",
  "**Formatting:** *italic*, **bold**, `inline code`, ~~strikethrough~~",
  "",
  "**Lists:**",
  "- Unordered items",
  "- [x] Completed tasks",
  "- [ ] Pending tasks",
  "",
  "**Code blocks** with syntax highlighting:",
  "```rust",
  'fn main() {',
  '    println!("Hello, MarkZ!");',
  '}',
  "```",
  "",
  "### 2. Preview Your Work",
  "The right pane renders your document in real time. Toggle between **HTML**, **JIRA**, **Confluence**, **Slack**, and **GitHub** preview modes to see exactly how your content will look in each platform.",
  "",
  "### 3. Export Cleanly",
  'MarkZ exports **only what you write** — no watermarks, no "created with" banners, no unwanted metadata. Your content stays yours.',
  "",
  "---",
  "",
  "## Keyboard Shortcuts",
  "",
  "| Shortcut | Action |",
  "|----------|--------|",
  "| `Ctrl + S` | Save document |",
  "| `Ctrl + O` | Open file |",
  "| `Ctrl + T` | New tab |",
  "| `Ctrl + W` | Close tab |",
  "| `Ctrl + B` | Toggle outline sidebar |",
  "| `Ctrl + =` | Zoom in |",
  "| `Ctrl + -` | Zoom out |",
  "| `Ctrl + 0` | Reset zoom |",
  "",
  "---",
  "",
  "## Formatting Reference",
  "",
  "This section exercises every formatting feature MarkZ supports.",
  "",
  "### Headings",
  "# Heading 1",
  "## Heading 2",
  "### Heading 3",
  "#### Heading 4",
  "##### Heading 5",
  "###### Heading 6",
  "",
  "### Inline Formatting",
  "Normal text, **bold text**, *italic text*, ~~strikethrough~~, and `inline code`.",
  "",
  "Combined: ***bold italic***, **`bold code`**, *`italic code`**.",
  "",
  "[External link to example.com](https://example.com)",
  "",
  "### Code Blocks",
  "",
  "#### Rust",
  "```rust",
  'fn main() {',
  '    let message = "Hello, MarkZ!";',
  '    println!("{}", message);',
  '}',
  "```",
  "",
  "#### Python",
  "```python",
  "def fibonacci(n):",
  "    a, b = 0, 1",
  "    for _ in range(n):",
  "        yield a",
  "        a, b = b, a + b",
  "",
  "print(list(fibonacci(10)))",
  "```",
  "",
  "#### JSON",
  "```json",
  '{',
  '  "name": "MarkZ",',
  '  "version": "0.1.0",',
  '  "features": ["preview", "export", "templates"]',
  '}',
  "```",
  "",
  "### Blockquotes",
  "> Single-level blockquote with **bold** and `code`.",
  "",
  "> Multi-paragraph blockquote.",
  ">",
  "> Second paragraph with a [link](https://example.com).",
  "",
  "> > Nested blockquote level 2",
  "> >",
  "> > > Nested blockquote level 3",
  "",
  "### Lists",
  "",
  "#### Unordered",
  "- First item",
  "- Second item",
  "  - Nested item A",
  "  - Nested item B",
  "    - Deep nested item",
  "- Third item",
  "",
  "#### Ordered",
  "1. First step",
  "2. Second step",
  "   1. Sub-step A",
  "   2. Sub-step B",
  "3. Third step",
  "",
  "#### Task List",
  "- [x] Completed task",
  "- [ ] Pending task",
  "- [ ] Another pending task",
  "  - [x] Sub-task done",
  "  - [ ] Sub-task waiting",
  "",
  "#### Mixed",
  "1. Ordered first",
  "   - Unordered nested",
  "   - Another nested",
  "2. Ordered second",
  "   1. Ordered nested",
  "   2. Another nested",
  "",
  "### Tables",
  "",
  "#### Simple Table",
  "| Feature | Status | Notes |",
  "|---------|--------|-------|",
  "| Headings | ✅ | All 6 levels |",
  "| Bold/Italic | ✅ | Combined styles |",
  "| Code Blocks | ✅ | Syntax highlighting |",
  "| Tables | ✅ | This one! |",
  "| Images | ✅ | Local & remote |",
  "",
  "#### Alignment Table",
  "| Left | Center | Right |",
  "|:-----|:------:|------:|",
  "| L1   | C1     | R1    |",
  "| L2   | C2     | R2    |",
  "| L3   | C3     | R3    |",
  "",
  "### Horizontal Rules",
  "Above rule.",
  "",
  "---",
  "",
  "Below rule with **bold** text.",
  "",
  "***",
  "",
  "Another rule.",
  "",
  "### Images",
  "",
  "#### Remote Images",
  "MarkZ renders remote images directly in the preview. These samples use free placeholder photos:",
  "",
  "![Remote landscape photo](https://picsum.photos/seed/markz1/600/300)",
  "",
  "![Remote portrait photo](https://picsum.photos/seed/markz2/300/400)",
  "",
  "![Remote square photo](https://picsum.photos/seed/markz3/400/400)",
  "",
  "> 💡 **Tip:** Toggle *Settings → Embed remote images* to download these into exports.",
  "",
  "### Special Characters & Escapes",
  "- Asterisk: \\*not italic\\*",
  "- Hash: \\# not heading",
  "- Backtick: \\`not code\\`",
  "- Ampersand: AT&T",
  "- Less/Greater: 5 < 10 > 2",
  "- Emoji: 🚀 ✅ ❌ 💡",
  "",
  "---",
  "",
  "## Math",
  "",
  "Inline math: $E = mc^2$ and $\\vec{F} = m\\vec{a}$",
  "",
  "Block math:",
  "$$",
  "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
  "$$",
  "",
  "Matrix:",
  "$$",
  "\\begin{bmatrix}",
  "a & b \\\\",
  "c & d",
  "\\end{bmatrix}^{-1}",
  "=",
  "\\frac{1}{ad-bc}",
  "\\begin{bmatrix}",
  "d & -b \\\\",
  "-c & a",
  "\\end{bmatrix}",
  "$$",
  "",
  "---",
  "",
  "## Mermaid Diagram",
  "",
  "```mermaid",
  "graph TD",
  "    A[Markdown Editor] --> B[Parser]",
  "    B --> C[AST]",
  "    C --> D[HTML Renderer]",
  "    C --> E[DOCX Converter]",
  "    C --> F[JIRA Converter]",
  "    D --> G[Preview Pane]",
  "    E --> H[File Export]",
  "    F --> I[Clipboard]",
  "```",
  "",
  "---",
  "",
  "## HTML Details (if supported)",
  "",
  "<details>",
  "<summary>Click to expand</summary>",
  "",
  "Hidden content inside a details block.",
  "",
  "</details>",
  "",
  "---",
  "",
  "*Welcome to MarkZ — 2026-01-01*",
].join("\n");

export const tauriMockScriptString = `
(function() {
  const MOCK_SETTINGS = ${JSON.stringify(MOCK_SETTINGS)};
  const MOCK_HTML = ${JSON.stringify(MOCK_HTML)};
  const FORMATTING_TEST_MD = ${JSON.stringify(FORMATTING_TEST_MD)};

  const responses = {
    get_settings: () => MOCK_SETTINGS,
    update_settings: () => null,
    get_version: () => "0.1.12",
    render_preview: (args) => {
      // Always return comprehensive HTML for both default and template content
      return Promise.resolve(MOCK_HTML);
    },
    convert_to_jira: (args) => "h1. Welcome to MarkZ\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_confluence: (args) => "<h1>Welcome to MarkZ</h1>\\n<p>" + (args?.markdown?.slice(0, 100) || "") + "</p>",
    convert_to_slack: (args) => "*Welcome to MarkZ*\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_github: (args) => args?.markdown || "",
    list_templates: () => [
      { id: "rfc", name: "RFC", category: "Engineering", description: "Request for Comments", builtin: true },
      { id: "adr", name: "ADR", category: "Engineering", description: "Architecture Decision Record", builtin: true },
      { id: "formatting-test", name: "Getting Started", category: "Test", description: "Welcome showcase and comprehensive formatting reference for MarkZ", builtin: true },
    ],
    get_template: (args) => {
      if (args?.id === "formatting-test") {
        return { id: "formatting-test", name: "Getting Started", category: "Test", description: "Welcome showcase and comprehensive formatting reference for MarkZ", content: FORMATTING_TEST_MD, builtin: true };
      }
      if (args?.id === "rfc") {
        return { id: "rfc", name: "RFC", category: "Engineering", description: "RFC template", content: "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n", builtin: true };
      }
      return null;
    },
    save_template: () => null,
    delete_template: () => null,
    apply_template: (args) => {
      if (args?.id === "formatting-test") return FORMATTING_TEST_MD;
      if (args?.id === "rfc") return "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n";
      return "";
    },
    log_frontend: () => null,
    generate_toc: () => [],
    open_file_dialog: () => {
      const override = localStorage.getItem("__e2e_open_file_result");
      if (override) return { path: override };
      return null;
    },
    save_file_dialog: (args) => {
      const exts = args?.filterExtensions || [];
      if (exts.includes("docx")) return "/tmp/test-export.docx";
      if (exts.includes("pdf")) return "/tmp/test-export.pdf";
      if (exts.includes("html")) return "/tmp/test-export.html";
      if (exts.includes("epub")) return "/tmp/test-export.epub";
      return null;
    },
    save_document: () => null,
    open_document: (args) => {
      const rejectPaths = JSON.parse(localStorage.getItem("__e2e_reject_paths") || "[]");
      if (rejectPaths.includes(args?.path)) {
        return Promise.reject(new Error("File not found"));
      }
      return { path: args?.path || "/test.md", content: "# Test\\n\\nHello world." };
    },
    process_pasted_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),
    process_dropped_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),
    git_status: (args) => {
      const path = args?.docPath || "";
      if (!path || path.includes("no-git")) {
        return { is_repo: false, is_modified: false, branch: null, ahead_behind: null };
      }
      return {
        is_repo: true,
        is_modified: path.includes("modified"),
        branch: "main",
        ahead_behind: path.includes("ahead") ? "2 ahead, 0 behind" : null,
      };
    },
    git_diff: (args) => {
      const path = args?.docPath || "";
      if (!path || path.includes("no-git")) return "";
      if (!path.includes("modified")) return "";
      return "diff --git a/test.md b/test.md\\n" +
        "index 1234..5678 100644\\n" +
        "--- a/test.md\\n" +
        "+++ b/test.md\\n" +
        "@@ -1,2 +1,3 @@\\n" +
        " # Test\\n" +
        "-Hello world.\\n" +
        "+Hello modified world.\\n" +
        "+New line.\\n";
    },
    open_folder_dialog: () => {
      const override = localStorage.getItem("__e2e_open_folder_result");
      console.log("[MOCK] open_folder_dialog called, override:", override);
      if (override) return override;
      return null;
    },
    list_workspace_files: (args) => {
      const root = args?.root || "";
      if (!root) return [];
      const override = localStorage.getItem("__e2e_workspace_files");
      if (override) {
        try { return JSON.parse(override); } catch { /* fall through */ }
      }
      return [
        { name: "docs", path: root + "/docs", rel_path: "docs", is_dir: true, children: [
          { name: "readme.md", path: root + "/docs/readme.md", rel_path: "docs/readme.md", is_dir: false, children: [] },
        ]},
        { name: "notes.md", path: root + "/notes.md", rel_path: "notes.md", is_dir: false, children: [] },
      ];
    },
      const root = args?.root || "";
      const query = (args?.query || "").toLowerCase();
      if (!root || !query) return [];
      return [
        { path: root + "/notes.md", rel_path: "notes.md", line_number: 1, context: "Hello " + query + " world" },
      ];
    },
    read_file_text: (args) => {
      return "# Test file\\n\\nHello world.";
    },
    pandoc_available: () => true,
    export_via_pandoc: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_export_pandoc_calls", JSON.stringify(calls));
      return null;
    },
    export_to_docx: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_export_docx_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_export_docx_calls", JSON.stringify(calls));
      return null;
    },
    save_session: (args) => {
      localStorage.setItem("markz-session", JSON.stringify({
        tabs: args?.tabs || [],
        activeTabPath: args?.active_tab_path || null,
        workspacePath: args?.workspace_path || null,
      }));
      return null;
    },
    load_session: () => {
      const raw = localStorage.getItem("markz-session");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return {
          tabs: (parsed.tabs || []).map((t) => ({
            content: t.content || "",
            path: t.path || null,
            title: t.title || "Untitled",
            is_dirty: t.isDirty ?? t.is_dirty ?? false,
          })),
          active_tab_path: parsed.activeTabPath ?? parsed.active_tab_path ?? null,
          workspace_path: parsed.workspacePath ?? parsed.workspace_path ?? null,
        };
      } catch {
        return null;
      }
    clear_session_disk: () => {
      localStorage.removeItem("markz-session");
      return null;
    },
    watch_workspace: () => null,
    unwatch_workspace: () => null,
    "plugin:app|version": () => "0.1.12",
  };
  // Mock dialog plugin commands used by @tauri-apps/plugin-dialog
  responses["plugin:dialog|confirm"] = () => true;
  responses["plugin:dialog|open"] = () => null;
  responses["plugin:dialog|save"] = () => null;
  window.__TAURI_INTERNALS__ = {
    invoke: function(cmd, args) {
      const handler = responses[cmd];
      if (!handler) {
        console.warn("[E2E Mock] Unhandled command:", cmd, args);
        return Promise.resolve(null);
      }
      return Promise.resolve(handler(args));
    },
    convertFileSrc: function(path) { return path; },
  };
  // Mock navigator.clipboard for copy operations in test environment
  if (!navigator.clipboard) {
    navigator.clipboard = {};
  }
  navigator.clipboard.writeText = function(text) {
    return Promise.resolve();
  };
})();
`