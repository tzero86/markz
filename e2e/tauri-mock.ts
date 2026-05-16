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
};

export const MOCK_HTML = `<h1>Welcome to MarkZ</h1>
<p>Start writing your Markdown here...</p>
<h2>Features</h2>
<ul>
<li><strong>Live preview</strong> as you type</li>
<li><strong>Syntax highlighting</strong> for 30+ languages</li>
<li><strong>Image support</strong> via paste or drag-and-drop</li>
<li><strong>Export</strong> to JIRA, Confluence, Slack, GitHub</li>
</ul>`;

export const FORMATTING_TEST_MD = `# Markdown Formatting Test Suite

> This document exercises **every** formatting feature MarkZ supports.

---

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Inline Formatting

Normal text, **bold text**, *italic text*, ~~strikethrough~~, and \`inline code\`.

[External link to example.com](https://example.com)

---

## Code Blocks

\`\`\`rust
fn main() {
    let message = "Hello, MarkZ!";
    println!("{}", message);
}
\`\`\`

---

## Blockquotes

> Single-level blockquote with **bold** and \`code\`.

> Multi-paragraph blockquote.
>
> Second paragraph with a [link](https://example.com).

---

## Lists

### Unordered
- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

### Ordered
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### Task List
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
  - [x] Sub-task done
  - [ ] Sub-task waiting

---

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Headings | ✅ | All 6 levels |
| Bold/Italic | ✅ | Combined styles |
| Code Blocks | ✅ | Syntax highlighting |
| Tables | ✅ | This one! |

---

## Math

Inline math: $E = mc^2$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

---

## Horizontal Rules

Above rule.

---

Below rule with **bold** text.

---

*Generated on 2026-01-01 — MarkZ Formatting Test Suite*`;

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
      if (args?.markdown?.includes("Formatting Test Suite")) {
        // Return HTML that matches what the real renderer would produce
        return Promise.resolve(\`<h1>Markdown Formatting Test Suite</h1>
<blockquote><p>This document exercises <strong>every</strong> formatting feature MarkZ supports.</p></blockquote>
<hr>
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
<hr>
<h2>Inline Formatting</h2>
<p>Normal text, <strong>bold text</strong>, <em>italic text</em>, <del>strikethrough</del>, and <code>inline code</code>.</p>
<p><a href=\\"https://example.com\\">External link to example.com</a></p>
<hr>
<h2>Code Blocks</h2>
<pre><code class=\\"language-rust\\">fn main() {
    let message = \\"Hello, MarkZ!\\";
    println!(\\"{}\\", message);
}
</code></pre>
<hr>
<h2>Blockquotes</h2>
<blockquote><p>Single-level blockquote with <strong>bold</strong> and <code>code</code>.</p></blockquote>
<blockquote><p>Multi-paragraph blockquote.</p><p>Second paragraph with a <a href=\\"https://example.com\\">link</a>.</p></blockquote>
<hr>
<h2>Lists</h2>
<h3>Unordered</h3>
<ul>
<li>First item</li>
<li>Second item
<ul>
<li>Nested item A</li>
<li>Nested item B</li>
</ul>
</li>
<li>Third item</li>
</ul>
<h3>Ordered</h3>
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
<h3>Task List</h3>
<ul>
<li class=\\"task-list-item\\"><input type=\\"checkbox\\" checked=\\"\\" disabled=\\"\\"> Completed task</li>
<li class=\\"task-list-item\\"><input type=\\"checkbox\\" disabled=\\"\\"> Pending task</li>
<li class=\\"task-list-item\\"><input type=\\"checkbox\\" disabled=\\"\\"> Another pending task
<ul>
<li class=\\"task-list-item\\"><input type=\\"checkbox\\" checked=\\"\\" disabled=\\"\\"> Sub-task done</li>
<li class=\\"task-list-item\\"><input type=\\"checkbox\\" disabled=\\"\\"> Sub-task waiting</li>
</ul>
</li>
</ul>
<hr>
<h2>Tables</h2>
<table>
<thead>
<tr><th>Feature</th><th>Status</th><th>Notes</th></tr>
</thead>
<tbody>
<tr><td>Headings</td><td>✅</td><td>All 6 levels</td></tr>
<tr><td>Bold/Italic</td><td>✅</td><td>Combined styles</td></tr>
<tr><td>Code Blocks</td><td>✅</td><td>Syntax highlighting</td></tr>
<tr><td>Tables</td><td>✅</td><td>This one!</td></tr>
</tbody>
</table>
<hr>
<h2>Math</h2>
<p>Inline math: <span class=\\"katex\\">E = mc^2</span></p>
<p>Block math:</p>
<span class=\\"katex-display\\">∫_{-∞}^{∞} e^{-x^2} dx = √π</span>
<hr>
<h2>Horizontal Rules</h2>
<p>Above rule.</p>
<hr>
<p>Below rule with <strong>bold</strong> text.</p>
<hr>
<p><em>Generated on 2026-01-01 — MarkZ Formatting Test Suite</em></p>\`);
      }
      return Promise.resolve(MOCK_HTML);
    },
    convert_to_jira: (args) => "h1. Welcome to MarkZ\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_confluence: (args) => "<h1>Welcome to MarkZ</h1>\\n<p>" + (args?.markdown?.slice(0, 100) || "") + "</p>",
    convert_to_slack: (args) => "*Welcome to MarkZ*\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_github: (args) => args?.markdown || "",
    list_templates: () => [
      { id: "rfc", name: "RFC", category: "Engineering", description: "Request for Comments", builtin: true },
      { id: "adr", name: "ADR", category: "Engineering", description: "Architecture Decision Record", builtin: true },
      { id: "formatting-test", name: "Formatting Test", category: "Test", description: "Comprehensive markdown formatting showcase", builtin: true },
    ],
    get_template: (args) => {
      if (args?.id === "formatting-test") {
        return { id: "formatting-test", name: "Formatting Test", category: "Test", description: "Formatting test", content: FORMATTING_TEST_MD, builtin: true };
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
    open_file_dialog: () => null,
    save_file_dialog: () => null,
    save_document: () => null,
    open_document: (args) => ({ path: args?.path || "/test.md", content: "# Test\\n\\nHello world." }),
    process_pasted_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),
    process_dropped_image: () => ({ relative_path: "images/test.png", absolute_path: "/tmp/images/test.png", filename: "test.png" }),
    export_to_docx: () => null,
  };

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
})();
`;
