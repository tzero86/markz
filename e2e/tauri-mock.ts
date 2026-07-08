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
  tts_engine: "online",
  tts_voice_id: "",
  tts_rate: 1.0,
  custom_css: "",
  pandoc_path: "",
  enable_spellcheck: true,
  custom_dictionary: [],
  split_direction: "horizontal",
  theme_preset: "default",
  sidebar_width_files: 280,
  sidebar_width_outline: 220,
  sidebar_width_links: 260,
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

type MockTreeNode = { name: string; path: string; rel_path: string; is_dir: boolean; children: MockTreeNode[] };

function makeShallow(nodes: MockTreeNode[]): MockTreeNode[] {
  return nodes.map((n) => ({ ...n, children: n.is_dir ? [] : n.children }));
}

function findNodeByPath(nodes: MockTreeNode[], path: string): MockTreeNode | null {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.is_dir && n.children) {
      const found = findNodeByPath(n.children, path);
      if (found) return found;
    }
  }
  return null;
}

function findNodeAndParent(nodes: MockTreeNode[], path: string): { node: MockTreeNode | null; parent: MockTreeNode[] | null } {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].path === path) return { node: nodes[i], parent: nodes };
    if (nodes[i].is_dir && nodes[i].children) {
      const found = findNodeAndParent(nodes[i].children, path);
      if (found.node) return found;
    }
  }
  return { node: null, parent: null };
}

function relPathFor(root: string, path: string): string {
  const prefix = root.replace(/\\/g, "/") + "/";
  return path.replace(/\\/g, "/").startsWith(prefix) ? path.replace(/\\/g, "/").slice(prefix.length) : path.replace(/\\/g, "/");
}

function renameNodeRecursively(node: MockTreeNode, oldPath: string, newPath: string, root: string) {
  node.path = node.path.replace(oldPath, newPath);
  node.rel_path = relPathFor(root, node.path);
  node.name = node.path.split(/[\\/]/).pop() || node.name;
  if (node.is_dir && node.children) {
    for (const child of node.children) {
      renameNodeRecursively(child, oldPath, newPath, root);
    }
  }
}

function getWorkspaceTree(root: string): MockTreeNode[] {
  const override = localStorage.getItem("__e2e_workspace_files");
  if (override) {
    try {
      return JSON.parse(override);
    } catch {
      /* fall through */
    }
  }
  return [
    {
      name: "docs",
      path: root + "/docs",
      rel_path: "docs",
      is_dir: true,
      children: [
        { name: "readme.md", path: root + "/docs/readme.md", rel_path: "docs/readme.md", is_dir: false, children: [] },
      ],
    },
    { name: "notes.md", path: root + "/notes.md", rel_path: "notes.md", is_dir: false, children: [] },
  ];
}

export function injectTauriMock() {
  const eventListeners: Record<string, Array<{ id: number; callbackId: number }>> = {};
  let nextEventId = 1;
  const callbackRegistry: Record<number, (event: { payload: unknown }) => void> = {};
  let nextCallbackId = 1;

  const responses: Record<string, (args?: unknown) => unknown> = {
    get_settings: () => MOCK_SETTINGS,
    update_settings: () => null,
    get_version: () => "0.1.12",
    take_pending_open: () => {
      const override = localStorage.getItem("__e2e_pending_open");
      localStorage.removeItem("__e2e_pending_open");
      if (override) {
        try {
          return JSON.parse(override);
        } catch {
          /* fall through */
        }
      }
      return [];
    },
    "plugin:event|listen": (args) => {
      const event = (args as { event?: string })?.event || "";
      const callbackId = (args as { handler?: number })?.handler ?? 0;
      const id = nextEventId++;
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push({ id, callbackId });
      return id;
    },
    "plugin:event|unlisten": (args) => {
      const event = (args as { event?: string })?.event || "";
      const eventId = (args as { eventId?: number })?.eventId;
      const list = eventListeners[event];
      if (list) {
        eventListeners[event] = list.filter((l) => l.id !== eventId);
      }
      return null;
    },
    render_preview: () => Promise.resolve(MOCK_HTML),
    render_slides: (args) => {
      const override = localStorage.getItem("__e2e_slides_override");
      if (override) {
        try {
          return JSON.parse(override);
        } catch {
          /* fall through */
        }
      }
      const md = (args as { markdown?: string })?.markdown || "";
      const title = md.match(/^#\s+(.+)$/m)?.[1] || "Presentation";
      return Promise.resolve({
        title,
        author: null,
        theme: "default",
        slides: [
          { kind: "title", title, content: "<p>Welcome</p>", level: 1, index: 0 },
          { kind: "content", title: "Slide 2", content: "<p>Content here</p>", level: 2, index: 1 },
        ],
      });
    },
    convert_to_jira: (args) =>
      "h1. Welcome to MarkZ\n\n" +
      ((args as { markdown?: string })?.markdown?.slice(0, 100) || ""),
    convert_to_confluence: (args) =>
      "<h1>Welcome to MarkZ</h1>\n<p>" +
      ((args as { markdown?: string })?.markdown?.slice(0, 100) || "") +
      "</p>",
    convert_to_slack: (args) =>
      "*Welcome to MarkZ*\n\n" +
      ((args as { markdown?: string })?.markdown?.slice(0, 100) || ""),
    convert_to_github: (args) => (args as { markdown?: string })?.markdown || "",
    list_templates: () => [
      { id: "rfc", name: "RFC", category: "Engineering", description: "Request for Comments", builtin: true },
      { id: "adr", name: "ADR", category: "Engineering", description: "Architecture Decision Record", builtin: true },
      { id: "formatting-test", name: "Getting Started", category: "Test", description: "Welcome showcase and comprehensive formatting reference for MarkZ", builtin: true },
    ],
    get_template: (args) => {
      if ((args as { id?: string })?.id === "formatting-test") {
        return {
          id: "formatting-test",
          name: "Getting Started",
          category: "Test",
          description: "Welcome showcase and comprehensive formatting reference for MarkZ",
          content: FORMATTING_TEST_MD,
          builtin: true,
        };
      }
      if ((args as { id?: string })?.id === "rfc") {
        return {
          id: "rfc",
          name: "RFC",
          category: "Engineering",
          description: "RFC template",
          content: "# RFC: Title\n\n## Summary\n\n## Motivation\n",
          builtin: true,
        };
      }
      return null;
    },
    save_template: () => null,
    delete_template: () => null,
    apply_template: (args) => {
      if ((args as { id?: string })?.id === "formatting-test") return FORMATTING_TEST_MD;
      if ((args as { id?: string })?.id === "rfc") return "# RFC: Title\n\n## Summary\n\n## Motivation\n";
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
      const override = localStorage.getItem("__e2e_save_file_result");
      if (override) return override;
      const exts = (args as { filterExtensions?: string[] })?.filterExtensions || [];
      if (exts.includes("docx")) return "/tmp/test-export.docx";
      if (exts.includes("pdf")) return "/tmp/test-export.pdf";
      if (exts.includes("html")) return "/tmp/test-export.html";
      if (exts.includes("epub")) return "/tmp/test-export.epub";
      if (exts.includes("md") || exts.includes("markdown") || exts.includes("txt")) return "/tmp/untitled.md";
      return null;
    },
    save_document: () => null,
    read_file_text: (args) => {
      const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");
      const path = (args as { path?: string })?.path || "/test.md";
      return fileOverrides[path] || "# Test\n\nHello world.";
    },
    open_document: (args) => {
      const rejectPaths = JSON.parse(localStorage.getItem("__e2e_reject_paths") || "[]");
      if (rejectPaths.includes((args as { path?: string })?.path)) {
        return Promise.reject(new Error("File not found"));
      }
      const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");
      const path = (args as { path?: string })?.path || "/test.md";
      const content = fileOverrides[path] || "# Test\n\nHello world.";
      return { path, content };
    },
    save_image: () => ({
      relative_path: "images/test.png",
      absolute_path: "/tmp/images/test.png",
      filename: "test.png",
    }),
    git_status: (args) => {
      const path = (args as { docPath?: string })?.docPath || "";
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
      const path = (args as { docPath?: string })?.docPath || "";
      if (!path || path.includes("no-git")) return "";
      if (!path.includes("modified")) return "";
      return (
        "diff --git a/test.md b/test.md\n" +
        "index 1234..5678 100644\n" +
        "--- a/test.md\n" +
        "+++ b/test.md\n" +
        "@@ -1,2 +1,3 @@\n" +
        " # Test\n" +
        "-Hello world.\n" +
        "+Hello modified world.\n" +
        "+New line.\n"
      );
    },
    open_folder_dialog: () => {
      const override = localStorage.getItem("__e2e_open_folder_result");
      if (override) return override;
      return null;
    },
    list_workspace_files: (args) => {
      const root = (args as { root?: string })?.root || "";
      if (!root) return [];
      return getWorkspaceTree(root);
    },
    list_workspace_files_shallow: (args) => {
      const root = (args as { root?: string })?.root || "";
      if (!root) return [];
      return makeShallow(getWorkspaceTree(root));
    },
    list_dir_children: (args) => {
      const path = (args as { path?: string })?.path || "";
      const root = (args as { root?: string })?.root || "";
      if (!path || !root) return [];
      const node = findNodeByPath(getWorkspaceTree(root), path);
      return node && node.is_dir ? makeShallow(node.children) : [];
    },
    create_workspace_file: (args) => {
      const path = (args as { path?: string })?.path || "";
      const root = path.substring(0, path.lastIndexOf("/"));
      const tree = getWorkspaceTree(root);
      const parentPath = path.substring(0, path.lastIndexOf("/"));
      const parent = parentPath === root ? tree : findNodeByPath(tree, parentPath);
      const target = parent && parent.is_dir ? parent.children : tree;
      const name = path.split("/").pop() || "untitled.md";
      target.push({ name, path, rel_path: relPathFor(root, path), is_dir: false, children: [] });
      localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));
      const calls = JSON.parse(localStorage.getItem("__e2e_create_file_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_create_file_calls", JSON.stringify(calls));
      return path;
    },
    create_workspace_folder: (args) => {
      const path = (args as { path?: string })?.path || "";
      const root = path.substring(0, path.lastIndexOf("/"));
      const tree = getWorkspaceTree(root);
      const parentPath = path.substring(0, path.lastIndexOf("/"));
      const parent = parentPath === root ? tree : findNodeByPath(tree, parentPath);
      const target = parent && parent.is_dir ? parent.children : tree;
      const name = path.split("/").pop() || "New Folder";
      target.push({ name, path, rel_path: relPathFor(root, path), is_dir: true, children: [] });
      localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));
      const calls = JSON.parse(localStorage.getItem("__e2e_create_folder_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_create_folder_calls", JSON.stringify(calls));
      return path;
    },
    rename_workspace_entry: (args) => {
      const oldPath = (args as { oldPath?: string })?.oldPath || "";
      const newName = (args as { newName?: string })?.newName || "";
      const root = oldPath.substring(0, oldPath.lastIndexOf("/"));
      const tree = getWorkspaceTree(root);
      const found = findNodeAndParent(tree, oldPath);
      if (!found.node) return oldPath;
      const newPath = oldPath.substring(0, oldPath.lastIndexOf("/") + 1) + newName;
      renameNodeRecursively(found.node, oldPath, newPath, root);
      localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));
      const calls = JSON.parse(localStorage.getItem("__e2e_rename_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_rename_calls", JSON.stringify(calls));
      return newPath;
    },
    delete_workspace_entry: (args) => {
      const path = (args as { path?: string })?.path || "";
      const root = path.substring(0, path.lastIndexOf("/"));
      const tree = getWorkspaceTree(root);
      const found = findNodeAndParent(tree, path);
      if (found.parent && found.node) {
        const idx = found.parent.findIndex((n) => n.path === path);
        if (idx !== -1) found.parent.splice(idx, 1);
      }
      localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));
      const calls = JSON.parse(localStorage.getItem("__e2e_delete_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_delete_calls", JSON.stringify(calls));
      return null;
    },
    search_workspace: (args) => {
      const root = (args as { root?: string })?.root || "";
      const query = ((args as { query?: string })?.query || "").toLowerCase();
      if (!root || !query) return [];
      return [
        { path: root + "/notes.md", rel_path: "notes.md", line_number: 1, context: "Hello " + query + " world" },
      ];
    },
    pandoc_available: () => {
      const override = localStorage.getItem("__e2e_pandoc_available");
      return override !== "false";
    },
    export_via_pandoc: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_export_pandoc_calls", JSON.stringify(calls));
      return null;
    },
    copy_via_pandoc: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_copy_pandoc_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_copy_pandoc_calls", JSON.stringify(calls));
      return `<p>Pandoc HTML copy output for ${(args as { format?: string })?.format ?? "unknown"}</p>\n` +
        "<h1>Welcome to MarkZ</h1>\n<p>" +
        ((args as { markdown?: string })?.markdown?.slice(0, 100) || "") +
        "</p>";
    },
    export_to_docx: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_export_docx_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_export_docx_calls", JSON.stringify(calls));
      return null;
    },
    save_session: (args) => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: (args as { tabs?: unknown[] })?.tabs || [],
          activeTabPath: (args as { active_tab_path?: string })?.active_tab_path || null,
          workspacePath: (args as { workspace_path?: string })?.workspace_path || null,
        })
      );
      return null;
    },
    load_session: () => {
      const raw = localStorage.getItem("markz-session");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return {
          tabs: (parsed.tabs || []).map(
            (t: { content?: string; path?: string | null; title?: string; isDirty?: boolean; is_dirty?: boolean; pinned?: boolean }) => ({
              content: t.content || "",
              path: t.path || null,
              title: t.title || "Untitled",
              is_dirty: t.isDirty ?? t.is_dirty ?? false,
              pinned: t.pinned ?? false,
            })
          ),
          active_tab_path: parsed.activeTabPath ?? parsed.active_tab_path ?? null,
          workspace_path: parsed.workspacePath ?? parsed.workspace_path ?? null,
        };
      } catch {
        return null;
      }
    },
    clear_session_disk: () => {
      localStorage.removeItem("markz-session");
      return null;
    },
    watch_workspace: () => null,
    unwatch_workspace: () => null,
    watch_open_files: () => null,
    unwatch_open_files: () => null,
    "plugin:app|version": () => "0.1.12",
  };

  responses["plugin:dialog|confirm"] = () => true;
  responses["plugin:dialog|message"] = () => "Ok";
  responses["plugin:dialog|open"] = () => null;
  responses["plugin:dialog|save"] = () => null;

  (window as unknown as { __TAURI_INTERNALS__?: { invoke: unknown; convertFileSrc: unknown } }).__TAURI_INTERNALS__ = {
    invoke: function (cmd: string, args?: unknown) {
      const handler = responses[cmd];
      if (!handler) {
        console.warn("[E2E Mock] Unhandled command:", cmd, args);
        return Promise.resolve(null);
      }
      return Promise.resolve(handler(args));
    },
    convertFileSrc: function (path: string) {
      return path;
    },
    transformCallback: function (callback: (event: { payload: unknown }) => void, _once?: boolean) {
      const id = nextCallbackId++;
      callbackRegistry[id] = callback;
      return id;
    },
  };

  (window as unknown as { __markz_emit_event?: (event: string, payload: unknown) => void }).__markz_emit_event = function (event: string, payload: unknown) {
    const listeners = eventListeners[event];
    if (listeners) {
      listeners.forEach((l) => {
        const handler = callbackRegistry[l.callbackId];
        if (handler) {
          try {
            handler({ payload });
          } catch (e) {
            console.error("[E2E Mock] Event handler error:", e);
          }
        }
      });
    }
  };
  if (!navigator.clipboard) {
    (navigator as unknown as { clipboard?: unknown }).clipboard = {};
  }
  (navigator.clipboard as { writeText?: (text: string) => Promise<void>; write?: (items: ClipboardItems) => Promise<void> }).writeText = function (text: string) {
    localStorage.setItem("__e2e_clipboard_text", text);
    return Promise.resolve();
  };
  (navigator.clipboard as { writeText?: (text: string) => Promise<void>; write?: (items: ClipboardItems) => Promise<void> }).write = function (items: ClipboardItems) {
    const types: string[] = [];
    for (const item of Array.from(items)) {
      for (const type of item.types) {
        types.push(type);
        item.getType(type).then((blob) => {
          blob.text().then((t) => {
            localStorage.setItem(`__e2e_clipboard_${type}`, t);
          });
        });
      }
    }
    localStorage.setItem("__e2e_clipboard_write_types", JSON.stringify(types));
    return Promise.resolve();
  };
}

/** Self-contained function for page.addInitScript().
 *  Inlines all data so serialization via Function.prototype.toString() works.
 */
export const tauriMockInitFunc = new Function(
  'const MOCK_SETTINGS = ' + JSON.stringify(MOCK_SETTINGS) + ';\n' +
  'const MOCK_HTML = ' + JSON.stringify(MOCK_HTML) + ';\n' +
  'const FORMATTING_TEST_MD = ' + JSON.stringify(FORMATTING_TEST_MD) + ';\n' +
  '\n' +
  'const eventListeners = {};\n' +
  'let nextEventId = 1;\n' +
  'const callbackRegistry = {};\n' +
  'let nextCallbackId = 1;\n' +
  'function makeShallow(nodes) { return nodes.map((n) => ({ ...n, children: n.is_dir ? [] : n.children })); }\n' +
  'function findNodeByPath(nodes, path) { for (const n of nodes) { if (n.path === path) return n; if (n.is_dir && n.children) { const found = findNodeByPath(n.children, path); if (found) return found; } } return null; }\n' +
  'function findNodeAndParent(nodes, path) { for (let i = 0; i < nodes.length; i++) { if (nodes[i].path === path) return { node: nodes[i], parent: nodes }; if (nodes[i].is_dir && nodes[i].children) { const found = findNodeAndParent(nodes[i].children, path); if (found.node) return found; } } return { node: null, parent: null }; }\n' +
  'function relPathFor(root, path) { var prefix = root.replace(/\\\\/g, "/") + "/"; var normalized = path.replace(/\\\\/g, "/"); return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized; }\n' +
  'function renameNodeRecursively(node, oldPath, newPath, root) { node.path = node.path.replace(oldPath, newPath); node.rel_path = relPathFor(root, node.path); node.name = node.path.split(/[\\\\/]/).pop() || node.name; if (node.is_dir && node.children) { for (var i = 0; i < node.children.length; i++) { renameNodeRecursively(node.children[i], oldPath, newPath, root); } } }\n' +
  'function getWorkspaceTree(root) {\n' +
  '  const override = localStorage.getItem("__e2e_workspace_files");\n' +
  '  if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }\n' +
  '  return [\n' +
  '    { name: "docs", path: root + "/docs", rel_path: "docs", is_dir: true, children: [\n' +
  '      { name: "readme.md", path: root + "/docs/readme.md", rel_path: "docs/readme.md", is_dir: false, children: [] },\n' +
  '    ]},\n' +
  '    { name: "notes.md", path: root + "/notes.md", rel_path: "notes.md", is_dir: false, children: [] },\n' +
  '  ];\n' +
  '}\n' +
  'const responses = {\n' +
  '  get_settings: () => MOCK_SETTINGS,\n' +
  '  update_settings: () => null,\n' +
  '  get_version: () => "0.1.12",\n' +
  '  take_pending_open: () => {\n' +
  '    const override = localStorage.getItem("__e2e_pending_open");\n' +
  '    localStorage.removeItem("__e2e_pending_open");\n' +
  '    if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }\n' +
  '    return [];\n' +
  '  },\n' +
  '  "plugin:event|listen": (args) => {\n' +
  '    const event = args?.event || "";\n' +
  '    const callbackId = args?.handler || 0;\n' +
  '    const id = nextEventId++;\n' +
  '    if (!eventListeners[event]) eventListeners[event] = [];\n' +
  '    eventListeners[event].push({ id: id, callbackId: callbackId });\n' +
  '    return id;\n' +
  '  },\n' +
  '  "plugin:event|unlisten": (args) => {\n' +
  '    const event = args?.event || "";\n' +
  '    const eventId = args?.eventId;\n' +
  '    const list = eventListeners[event];\n' +
  '    if (list) { eventListeners[event] = list.filter((l) => l.id !== eventId); }\n' +
  '    return null;\n' +
  '  },\n' +
  '  render_preview: () => Promise.resolve(MOCK_HTML),\n' +
  '  render_slides: (args) => {\n' +
  '    const override = localStorage.getItem("__e2e_slides_override");\n' +
  '    if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }\n' +
  '    const md = args?.markdown || "";\n' +
  '    const title = md.match(/^#\\s+(.+)$/m)?.[1] || "Presentation";\n' +
  '    return Promise.resolve({\n' +
  '      title: title,\n' +
  '      author: null,\n' +
  '      theme: "default",\n' +
  '      slides: [\n' +
  '        { kind: "title", title: title, content: "<p>Welcome</p>", level: 1, index: 0 },\n' +
  '        { kind: "content", title: "Slide 2", content: "<p>Content here</p>", level: 2, index: 1 },\n' +
  '      ],\n' +
  '    });\n' +
  '  },\n' +
  '  convert_to_jira: (args) => "h1. Welcome to MarkZ\\n\\n" + (args?.markdown?.slice(0, 100) || ""),\n' +
  '  convert_to_confluence: (args) => "<h1>Welcome to MarkZ</h1>\\n<p>" + (args?.markdown?.slice(0, 100) || "") + "</p>",\n' +
  '  convert_to_slack: (args) => "*Welcome to MarkZ*\\n\\n" + (args?.markdown?.slice(0, 100) || ""),\n' +
  '  convert_to_github: (args) => args?.markdown || "",\n' +
  '  list_templates: () => [\n' +
  '    { id: "rfc", name: "RFC", category: "Engineering", description: "Request for Comments", builtin: true },\n' +
  '    { id: "adr", name: "ADR", category: "Engineering", description: "Architecture Decision Record", builtin: true },\n' +
  '    { id: "formatting-test", name: "Getting Started", category: "Test", description: "Welcome showcase and comprehensive formatting reference for MarkZ", builtin: true },\n' +
  '  ],\n' +
  '  get_template: (args) => {\n' +
  '    if (args?.id === "formatting-test") {\n' +
  '      return { id: "formatting-test", name: "Getting Started", category: "Test", description: "Welcome showcase and comprehensive formatting reference for MarkZ", content: FORMATTING_TEST_MD, builtin: true };\n' +
  '    }\n' +
  '    if (args?.id === "rfc") {\n' +
  '      return { id: "rfc", name: "RFC", category: "Engineering", description: "RFC template", content: "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n", builtin: true };\n' +
  '    }\n' +
  '    return null;\n' +
  '  },\n' +
  '  save_template: () => null,\n' +
  '  delete_template: () => null,\n' +
  '  apply_template: (args) => {\n' +
  '    if (args?.id === "formatting-test") return FORMATTING_TEST_MD;\n' +
  '    if (args?.id === "rfc") return "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n";\n' +
  '    return "";\n' +
  '  },\n' +
  '  log_frontend: () => null,\n' +
  '  generate_toc: () => [],\n' +
  '  open_file_dialog: () => {\n' +
  '    const override = localStorage.getItem("__e2e_open_file_result");\n' +
  '    if (override) return { path: override };\n' +
  '    return null;\n' +
  '  },\n' +
  '  save_file_dialog: (args) => {\n' +
  '    const override = localStorage.getItem("__e2e_save_file_result");\n' +
  '    if (override) return override;\n' +
  '    const exts = args?.filterExtensions || [];\n' +
  '    if (exts.includes("docx")) return "/tmp/test-export.docx";\n' +
  '    if (exts.includes("pdf")) return "/tmp/test-export.pdf";\n' +
  '    if (exts.includes("html")) return "/tmp/test-export.html";\n' +
  '    if (exts.includes("epub")) return "/tmp/test-export.epub";\n' +
  '    if (exts.includes("md") || exts.includes("markdown") || exts.includes("txt")) return "/tmp/untitled.md";\n' +
  '    return null;\n' +
  '  },\n' +
  '  save_document: () => null,\n' +
  '  read_file_text: (args) => {\n' +
  '    const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");\n' +
  '    const path = args?.path || "/test.md";\n' +
  '    return fileOverrides[path] || "# Test\\n\\nHello world.";\n' +
  '  },\n' +
  '  open_document: (args) => {\n' +
  '    const rejectPaths = JSON.parse(localStorage.getItem("__e2e_reject_paths") || "[]");\n' +
  '    if (rejectPaths.includes(args?.path)) {\n' +
  '      return Promise.reject(new Error("File not found"));\n' +
  '    }\n' +
  '    const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");\n' +
  '    const path = args?.path || "/test.md";\n' +
  '    const content = fileOverrides[path] || "# Test\\n\\nHello world.";\n' +
  '    return { path, content };\n' +
  '  },\n' +
  '  save_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),\n' +
  '  git_status: (args) => {\n' +
  '    const path = args?.docPath || "";\n' +
  '    if (!path || path.includes("no-git")) {\n' +
  '      return { is_repo: false, is_modified: false, branch: null, ahead_behind: null };\n' +
  '    }\n' +
  '    return {\n' +
  '      is_repo: true,\n' +
  '      is_modified: path.includes("modified"),\n' +
  '      branch: "main",\n' +
  '      ahead_behind: path.includes("ahead") ? "2 ahead, 0 behind" : null,\n' +
  '    };\n' +
  '  },\n' +
  '  git_diff: (args) => {\n' +
  '    const path = args?.docPath || "";\n' +
  '    if (!path || path.includes("no-git")) return "";\n' +
  '    if (!path.includes("modified")) return "";\n' +
  '    return "diff --git a/test.md b/test.md\\n" +\n' +
  '      "index 1234..5678 100644\\n" +\n' +
  '      "--- a/test.md\\n" +\n' +
  '      "+++ b/test.md\\n" +\n' +
  '      "@@ -1,2 +1,3 @@\\n" +\n' +
  '      " # Test\\n" +\n' +
  '      "-Hello world.\\n" +\n' +
  '      "+Hello modified world.\\n" +\n' +
  '      "+New line.\\n";\n' +
  '  },\n' +
  '  open_folder_dialog: () => {\n' +
  '    const override = localStorage.getItem("__e2e_open_folder_result");\n' +
  '    if (override) return override;\n' +
  '    return null;\n' +
  '  },\n' +
  '  list_workspace_files: (args) => {\n' +
  '    const root = args?.root || "";\n' +
  '    if (!root) return [];\n' +
  '    return getWorkspaceTree(root);\n' +
  '  },\n' +
  '  list_workspace_files_shallow: (args) => {\n' +
  '    const root = args?.root || "";\n' +
  '    if (!root) return [];\n' +
  '    return makeShallow(getWorkspaceTree(root));\n' +
  '  },\n' +
  '  list_dir_children: (args) => {\n' +
  '    const path = args?.path || "";\n' +
  '    const root = args?.root || "";\n' +
  '    if (!path || !root) return [];\n' +
  '    const node = findNodeByPath(getWorkspaceTree(root), path);\n' +
  '    return node && node.is_dir ? makeShallow(node.children) : [];\n' +
  '  },\n' +
  '  create_workspace_file: (args) => {\n' +
  '    var path = args?.path || "";\n' +
  '    var root = path.substring(0, path.lastIndexOf("/"));\n' +
  '    var tree = getWorkspaceTree(root);\n' +
  '    var parentPath = path.substring(0, path.lastIndexOf("/"));\n' +
  '    var parent = parentPath === root ? tree : findNodeByPath(tree, parentPath);\n' +
  '    var target = parent && parent.is_dir ? parent.children : tree;\n' +
  '    var name = path.split("/").pop() || "untitled.md";\n' +
  '    target.push({ name: name, path: path, rel_path: relPathFor(root, path), is_dir: false, children: [] });\n' +
  '    localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));\n' +
  '    return path;\n' +
  '  },\n' +
  '  create_workspace_folder: (args) => {\n' +
  '    var path = args?.path || "";\n' +
  '    var root = path.substring(0, path.lastIndexOf("/"));\n' +
  '    var tree = getWorkspaceTree(root);\n' +
  '    var parentPath = path.substring(0, path.lastIndexOf("/"));\n' +
  '    var parent = parentPath === root ? tree : findNodeByPath(tree, parentPath);\n' +
  '    var target = parent && parent.is_dir ? parent.children : tree;\n' +
  '    var name = path.split("/").pop() || "New Folder";\n' +
  '    target.push({ name: name, path: path, rel_path: relPathFor(root, path), is_dir: true, children: [] });\n' +
  '    localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));\n' +
  '    return path;\n' +
  '  },\n' +
  '  rename_workspace_entry: (args) => {\n' +
  '    var oldPath = args?.oldPath || "";\n' +
  '    var newName = args?.newName || "";\n' +
  '    var root = oldPath.substring(0, oldPath.lastIndexOf("/"));\n' +
  '    var tree = getWorkspaceTree(root);\n' +
  '    var found = findNodeAndParent(tree, oldPath);\n' +
  '    if (!found.node) return oldPath;\n' +
  '    var newPath = oldPath.substring(0, oldPath.lastIndexOf("/") + 1) + newName;\n' +
  '    renameNodeRecursively(found.node, oldPath, newPath, root);\n' +
  '    localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));\n' +
  '    return newPath;\n' +
  '  },\n' +
  '  delete_workspace_entry: (args) => {\n' +
  '    var path = args?.path || "";\n' +
  '    var root = path.substring(0, path.lastIndexOf("/"));\n' +
  '    var tree = getWorkspaceTree(root);\n' +
  '    var found = findNodeAndParent(tree, path);\n' +
  '    if (found.parent && found.node) {\n' +
  '      var idx = found.parent.findIndex(function(n) { return n.path === path; });\n' +
  '      if (idx !== -1) found.parent.splice(idx, 1);\n' +
  '    }\n' +
  '    localStorage.setItem("__e2e_workspace_files", JSON.stringify(tree));\n' +
  '    return null;\n' +
  '  },\n' +
'  search_workspace: (args) => {\n' +
  '    const root = args?.root || "";\n' +
  '    const query = (args?.query || "").toLowerCase();\n' +
  '    if (!root || !query) return [];\n' +
  '    return [\n' +
  '      { path: root + "/notes.md", rel_path: "notes.md", line_number: 1, context: "Hello " + query + " world" },\n' +
  '    ];\n' +
  '  },\n' +
  '  pandoc_available: () => {\n' +
  '    const override = localStorage.getItem("__e2e_pandoc_available");\n' +
  '    return override !== "false";\n' +
  '  },\n' +
  '  export_via_pandoc: (args) => {\n' +
  '    const calls = JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]");\n' +
  '    calls.push(args);\n' +
  '    localStorage.setItem("__e2e_export_pandoc_calls", JSON.stringify(calls));\n' +
  '    return null;\n' +
  '  },\n' +
  '  copy_via_pandoc: (args) => {\n' +
  '    const calls = JSON.parse(localStorage.getItem("__e2e_copy_pandoc_calls") || "[]");\n' +
  '    calls.push(args);\n' +
  '    localStorage.setItem("__e2e_copy_pandoc_calls", JSON.stringify(calls));\n' +
  '    return "<p>Pandoc HTML copy output for " + (args?.format || "unknown") + "</p>\\\\n" +\n' +
  '      "<h1>Welcome to MarkZ</h1>\\\\n<p>" +\n' +
  '      (args?.markdown?.slice(0, 100) || "") +\n' +
  '      "</p>";\n' +
  '  },\n' +
  '  export_to_docx: (args) => {\n' +
  '    const calls = JSON.parse(localStorage.getItem("__e2e_export_docx_calls") || "[]");\n' +
  '    calls.push(args);\n' +
  '    localStorage.setItem("__e2e_export_docx_calls", JSON.stringify(calls));\n' +
  '    return null;\n' +
  '  },\n' +
  '  save_session: (args) => {\n' +
  '    localStorage.setItem("markz-session", JSON.stringify({\n' +
  '      tabs: args?.tabs || [],\n' +
  '      activeTabPath: args?.active_tab_path || null,\n' +
  '      workspacePath: args?.workspace_path || null,\n' +
  '    }));\n' +
  '    return null;\n' +
  '  },\n' +
  '  load_session: () => {\n' +
  '    const raw = localStorage.getItem("markz-session");\n' +
  '    if (!raw) return null;\n' +
  '    try {\n' +
  '      const parsed = JSON.parse(raw);\n' +
  '      return {\n' +
  '        tabs: (parsed.tabs || []).map((t) => ({\n' +
  '          content: t.content || "",\n' +
  '          path: t.path || null,\n' +
  '          title: t.title || "Untitled",\n' +
  '          is_dirty: t.isDirty ?? t.is_dirty ?? false,\n' +
  '          pinned: t.pinned ?? false,\n' +
  '        })),\n' +
  '        active_tab_path: parsed.activeTabPath ?? parsed.active_tab_path ?? null,\n' +
  '        workspace_path: parsed.workspacePath ?? parsed.workspace_path ?? null,\n' +
  '      };\n' +
  '    } catch {\n' +
  '      return null;\n' +
  '    }\n' +
  '  },\n' +
  '  clear_session_disk: () => {\n' +
  '    localStorage.removeItem("markz-session");\n' +
  '    return null;\n' +
  '  },\n' +
  '  watch_workspace: () => null,\n' +
  '  unwatch_workspace: () => null,\n' +
  '  watch_open_files: () => null,\n' +
  '  unwatch_open_files: () => null,\n' +
  '  "plugin:app|version": () => "0.1.12",\n' +
  '};\n' +
  '\n' +
  'responses["plugin:dialog|confirm"] = () => true;\n' +
  'responses["plugin:dialog|message"] = () => "Ok";\n' +
  'responses["plugin:dialog|open"] = () => null;\n' +
  'responses["plugin:dialog|save"] = () => null;\n' +
  '\n' +
  'window.__TAURI_INTERNALS__ = {\n' +
  '  invoke: function(cmd, args) {\n' +
  '    const handler = responses[cmd];\n' +
  '    if (!handler) {\n' +
  '      console.warn("[E2E Mock] Unhandled command:", cmd, args);\n' +
  '      return Promise.resolve(null);\n' +
  '    }\n' +
  '    return Promise.resolve(handler(args));\n' +
  '  },\n' +
  '  convertFileSrc: function(path) { return path; },\n' +
  '  transformCallback: function(callback, _once) {\n' +
  '    var id = nextCallbackId++;\n' +
  '    callbackRegistry[id] = callback;\n' +
  '    return id;\n' +
  '  },\n' +
  '};\n' +
  '\n' +
  'window.__markz_emit_event = function(event, payload) {\n' +
  '  var listeners = eventListeners[event];\n' +
  '  if (listeners) {\n' +
  '    listeners.forEach(function(l) {\n' +
  '      var handler = callbackRegistry[l.callbackId];\n' +
  '      if (handler) {\n' +
  '        try { handler({ payload: payload }); } catch (e) { console.error("[E2E Mock] Event handler error:", e); }\n' +
  '      }\n' +
  '    });\n' +
  '  }\n' +
  '};\n' +
  'if (!navigator.clipboard) {\n' +
  '  navigator.clipboard = {};\n' +
  '}\n' +
  'navigator.clipboard.writeText = function(text) {\n' +
  '  localStorage.setItem("__e2e_clipboard_text", text);\n' +
  '  return Promise.resolve();\n' +
  '};\n' +
  'navigator.clipboard.write = function(items) {\n' +
  '  var types = [];\n' +
  '  for (var i = 0; i < items.length; i++) {\n' +
  '    var item = items[i];\n' +
  '    for (var j = 0; j < item.types.length; j++) {\n' +
  '      var type = item.types[j];\n' +
  '      types.push(type);\n' +
  '      item.getType(type).then(function(blob) {\n' +
  '        blob.text().then(function(t) {\n' +
  '          localStorage.setItem("__e2e_clipboard_" + type, t);\n' +
  '        });\n' +
  '      });\n' +
  '    }\n' +
  '  }\n' +
  '  localStorage.setItem("__e2e_clipboard_write_types", JSON.stringify(types));\n' +
  '  return Promise.resolve();\n' +
  '};\n'
);

export const tauriMockScriptString = `
(function() {
  const MOCK_SETTINGS = ${JSON.stringify(MOCK_SETTINGS)};
  const MOCK_HTML = ${JSON.stringify(MOCK_HTML)};
  const FORMATTING_TEST_MD = ${JSON.stringify(FORMATTING_TEST_MD)};

  const eventListeners = {};
  let nextEventId = 1;
  const callbackRegistry = {};
  let nextCallbackId = 1;

  function makeShallow(nodes) { return nodes.map((n) => ({ ...n, children: n.is_dir ? [] : n.children })); }
  function findNodeByPath(nodes, path) { for (const n of nodes) { if (n.path === path) return n; if (n.is_dir && n.children) { const found = findNodeByPath(n.children, path); if (found) return found; } } return null; }
  function getWorkspaceTree(root) {
    const override = localStorage.getItem("__e2e_workspace_files");
    if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }
    return [
      { name: "docs", path: root + "/docs", rel_path: "docs", is_dir: true, children: [
        { name: "readme.md", path: root + "/docs/readme.md", rel_path: "docs/readme.md", is_dir: false, children: [] },
      ]},
      { name: "notes.md", path: root + "/notes.md", rel_path: "notes.md", is_dir: false, children: [] },
    ];
  }

  const responses = {
    get_settings: () => MOCK_SETTINGS,
    update_settings: () => null,
    get_version: () => "0.1.12",
    take_pending_open: () => {
      const override = localStorage.getItem("__e2e_pending_open");
      localStorage.removeItem("__e2e_pending_open");
      if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }
      return [];
    },
    "plugin:event|listen": (args) => {
      const event = args?.event || "";
      const callbackId = args?.handler || 0;
      const id = nextEventId++;
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push({ id, callbackId });
      return id;
    },
    "plugin:event|unlisten": (args) => {
      const event = args?.event || "";
      const eventId = args?.eventId;
      const list = eventListeners[event];
      if (list) { eventListeners[event] = list.filter((l) => l.id !== eventId); }
      return null;
    },
    render_preview: (args) => {
      // Return comprehensive mock HTML regardless of content so test assertions work
      return Promise.resolve(MOCK_HTML);
    },
    render_slides: (args) => {
      const override = localStorage.getItem("__e2e_slides_override");
      if (override) { try { return JSON.parse(override); } catch { /* fall through */ } }
      const md = args?.markdown || "";
      const title = md.match(/^#\s+(.+)$/m)?.[1] || "Presentation";
      return Promise.resolve({
        title: title,
        author: null,
        theme: "default",
        slides: [
          { kind: "title", title: title, content: "<p>Welcome</p>", level: 1, index: 0 },
          { kind: "content", title: "Slide 2", content: "<p>Content here</p>", level: 2, index: 1 },
        ],
      });
    },
    convert_to_jira: (args) => "h1. Welcome to MarkZ\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_confluence: (args) => "\u003ch1\u003eWelcome to MarkZ\u003c/h1\u003e\\n\u003cp\u003e" + (args?.markdown?.slice(0, 100) || "") + "\u003c/p\u003e",
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
      const override = localStorage.getItem("__e2e_save_file_result");
      if (override) return override;
      const exts = args?.filterExtensions || [];
      if (exts.includes("docx")) return "/tmp/test-export.docx";
      if (exts.includes("pdf")) return "/tmp/test-export.pdf";
      if (exts.includes("html")) return "/tmp/test-export.html";
      if (exts.includes("epub")) return "/tmp/test-export.epub";
      if (exts.includes("md") || exts.includes("markdown") || exts.includes("txt")) return "/tmp/untitled.md";
      return null;
    },
    save_document: () => null,
    open_document: (args) => {
      const rejectPaths = JSON.parse(localStorage.getItem("__e2e_reject_paths") || "[]");
      if (rejectPaths.includes(args?.path)) {
        return Promise.reject(new Error("File not found"));
      }
      const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");
      const path = args?.path || "/test.md";
      const content = fileOverrides[path] || "# Test\n\nHello world.";
      return { path, content };
    },
    save_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),
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
      return getWorkspaceTree(root);
    },
    list_workspace_files_shallow: (args) => {
      const root = args?.root || "";
      if (!root) return [];
      return makeShallow(getWorkspaceTree(root));
    },
    list_dir_children: (args) => {
      const path = args?.path || "";
      const root = args?.root || "";
      if (!path || !root) return [];
      const node = findNodeByPath(getWorkspaceTree(root), path);
      return node && node.is_dir ? makeShallow(node.children) : [];
    },
    search_workspace: (args) => {
      const root = args?.root || "";
      const query = (args?.query || "").toLowerCase();
      if (!root || !query) return [];
      return [
        { path: root + "/notes.md", rel_path: "notes.md", line_number: 1, context: "Hello " + query + " world" },
      ];
    },
    pandoc_available: () => {
      const override = localStorage.getItem("__e2e_pandoc_available");
      return override !== "false";
    },
    export_via_pandoc: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_export_pandoc_calls", JSON.stringify(calls));
      return null;
    },
    copy_via_pandoc: (args) => {
      const calls = JSON.parse(localStorage.getItem("__e2e_copy_pandoc_calls") || "[]");
      calls.push(args);
      localStorage.setItem("__e2e_copy_pandoc_calls", JSON.stringify(calls));
      return "<p>Pandoc HTML copy output for " + (args?.format || "unknown") + "</p>\\n" +
        "<h1>Welcome to MarkZ</h1>\\n<p>" +
        (args?.markdown?.slice(0, 100) || "") +
        "</p>";
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
            pinned: t.pinned ?? false,
          })),
          active_tab_path: parsed.activeTabPath ?? parsed.active_tab_path ?? null,
          workspace_path: parsed.workspacePath ?? parsed.workspace_path ?? null,
        };
      } catch {
        return null;
      }
    },
    clear_session_disk: () => {
      localStorage.removeItem("markz-session");
      return null;
    },
    watch_workspace: () => null,
    unwatch_workspace: () => null,
    watch_open_files: () => null,
    unwatch_open_files: () => null,
    "plugin:app|version": () => "0.1.12",
  };
  // Mock dialog plugin commands used by @tauri-apps/plugin-dialog
  responses["plugin:dialog|confirm"] = () => true;
  responses["plugin:dialog|message"] = () => "Ok";
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

  window.__TAURI_INTERNALS__.transformCallback = function(callback, _once) {
    var id = nextCallbackId++;
    callbackRegistry[id] = callback;
    return id;
  };

  window.__markz_emit_event = function(event, payload) {
    var listeners = eventListeners[event];
    if (listeners) {
      listeners.forEach(function(l) {
        var handler = callbackRegistry[l.callbackId];
        if (handler) {
          try { handler({ payload: payload }); } catch (e) { console.error("[E2E Mock] Event handler error:", e); }
        }
      });
    }
  };
  // Mock navigator.clipboard for copy operations in test environment
  if (!navigator.clipboard) {
    navigator.clipboard = {};
  }
  navigator.clipboard.writeText = function(text) {
    localStorage.setItem("__e2e_clipboard_text", text);
    return Promise.resolve();
  };
  navigator.clipboard.write = function(items) {
    var types = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      for (var j = 0; j < item.types.length; j++) {
        var type = item.types[j];
        types.push(type);
        item.getType(type).then(function(blob) {
          blob.text().then(function(t) {
            localStorage.setItem("__e2e_clipboard_" + type, t);
          });
        });
      }
    }
    localStorage.setItem("__e2e_clipboard_write_types", JSON.stringify(types));
    return Promise.resolve();
  };
})();
`