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

export const tauriMockScriptString = `
(function() {
  const MOCK_SETTINGS = ${JSON.stringify(MOCK_SETTINGS)};
  const MOCK_HTML = ${JSON.stringify(MOCK_HTML)};

  const responses = {
    get_settings: () => MOCK_SETTINGS,
    update_settings: () => null,
    get_version: () => "0.1.12",
    render_preview: () => MOCK_HTML,
    convert_to_jira: (args) => "h1. Welcome to MarkZ\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_confluence: (args) => "<h1>Welcome to MarkZ</h1>\\n<p>" + (args?.markdown?.slice(0, 100) || "") + "</p>",
    convert_to_slack: (args) => "*Welcome to MarkZ*\\n\\n" + (args?.markdown?.slice(0, 100) || ""),
    convert_to_github: (args) => args?.markdown || "",
    list_templates: () => [
      { id: "rfc", name: "RFC", category: "Engineering", description: "Request for Comments", builtin: true },
      { id: "adr", name: "ADR", category: "Engineering", description: "Architecture Decision Record", builtin: true },
    ],
    get_template: (args) =>
      args?.id === "rfc"
        ? { id: "rfc", name: "RFC", category: "Engineering", description: "RFC template", content: "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n", builtin: true }
        : null,
    save_template: () => null,
    delete_template: () => null,
    apply_template: (args) =>
      args?.id === "rfc"
        ? "# RFC: Title\\n\\n## Summary\\n\\n## Motivation\\n"
        : "",
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
