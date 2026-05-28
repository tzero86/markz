//! End-to-end rendering tests: Markdown input → parse → HTML output.
//! These catch preprocessor + parser + renderer integration bugs.

#[cfg(test)]
mod tests {
    use crate::parser::parse;

    fn md_to_html(markdown: &str) -> String {
        let doc = parse(markdown);
        crate::html::render(&doc)
    }

    #[test]
    fn test_powershell_variables_preserved() {
        let input = r#"$legacy = & .\CreateDDlibrary.exe /ND "$root\Inputs\DataDict.dbf""#;
        let html = md_to_html(input);
        assert!(
            !html.contains("math-inline"),
            "PowerShell variables rendered as math: {}", html
        );
        assert!(html.contains("$legacy"), "$legacy missing from output");
        assert!(html.contains("$root"), "$root missing from output");
    }

    #[test]
    fn test_inline_math_renders() {
        let input = "The equation $E = mc^2$ is famous.";
        let html = md_to_html(input);
        assert!(
            html.contains(r#"<span class="math-inline">E = mc^2</span>"#),
            "Inline math not rendered: {}", html
        );
    }

    #[test]
    fn test_block_math_renders() {
        let input = "$$\\int_0^1 f(x) dx$$";
        let html = md_to_html(input);
        assert!(
            html.contains(r#"<div class="math-block">"#),
            "Block math not rendered: {}", html
        );
    }

    #[test]
    fn test_code_inline_preserves_dollars() {
        let input = "Use `$foo = bar` in PowerShell.";
        let html = md_to_html(input);
        assert!(
            !html.contains("math-inline"),
            "Code inline processed as math: {}", html
        );
        assert!(html.contains("<code>$foo = bar</code>"), "Code not preserved: {}", html);
    }

    #[test]
    fn test_heading() {
        let html = md_to_html("# Hello");
        assert_eq!(html.trim(), r#"<h1 id="hello">Hello</h1>"#);
    }

    #[test]
    fn test_bold_italic() {
        let html = md_to_html("**bold** *italic*");
        assert_eq!(html.trim(), "<p><strong>bold</strong> <em>italic</em></p>");
    }

    #[test]
    fn test_strikethrough() {
        let html = md_to_html("~~deleted~~");
        assert!(html.contains("<del>deleted</del>"), "Strikethrough not rendered: {}", html);
    }

    #[test]
    fn test_code_block() {
        let html = md_to_html("```rust\nfn main() {}\n```");
        assert!(html.contains(r#"class="language-rust""#), "Code block lang missing: {}", html);
        assert!(html.contains("fn main() {}"), "Code block content missing: {}", html);
    }

    #[test]
    fn test_unordered_list() {
        let html = md_to_html("- one\n- two");
        assert!(html.starts_with("<ul>"), "Not a ul: {}", html);
        assert!(html.contains("<li><p>one</p></li>"), "{}", html);
        assert!(html.contains("<li><p>two</p></li>"), "{}", html);
    }

    #[test]
    fn test_ordered_list() {
        let html = md_to_html("1. first\n2. second");
        assert!(html.starts_with("<ol start=\"1\">"), "Not a ol: {}", html);
        assert!(html.contains("<li><p>first</p></li>"), "{}", html);
    }

    #[test]
    fn test_task_list() {
        let html = md_to_html("- [x] done\n- [ ] todo");
        assert!(html.contains(r#"type="checkbox" disabled checked"#), "{}", html);
        assert!(html.contains(r#"type="checkbox" disabled> todo"#), "{}", html);
    }

    #[test]
    fn test_link() {
        let html = md_to_html("[text](https://example.com \"title\")");
        assert!(html.contains(r#"href="https://example.com""#), "{}", html);
        assert!(html.contains("title=\"title\""), "{}", html);
    }

    #[test]
    fn test_image() {
        let html = md_to_html("![alt](https://example.com/img.png)");
        assert!(html.contains(r#"src="https://example.com/img.png""#), "{}", html);
        assert!(html.contains(r#"alt="alt""#), "{}", html);
    }

    #[test]
    fn test_table() {
        let html = md_to_html("| a | b |\n|---|---|\n| c | d |");
        assert!(html.contains("<th"), "No table header: {}", html);
        assert!(html.contains("<td"), "No table cell: {}", html);
    }

    #[test]
    fn test_blockquote() {
        let html = md_to_html("> quote");
        assert_eq!(html.trim(), "<blockquote>\n<p>quote</p>\n</blockquote>");
    }

    #[test]
    fn test_horizontal_rule() {
        let html = md_to_html("---");
        assert_eq!(html.trim(), "<hr />");
    }

    #[test]
    fn test_inline_code() {
        let html = md_to_html("use `foo()` here");
        assert!(html.contains("<code>foo()</code>"), "Inline code missing: {}", html);
    }

    #[test]
    fn test_html_escaping() {
        let html = md_to_html("<script>alert(1)</script>");
        // Raw HTML blocks are passed through as-is by pulldown-cmark
        assert!(html.contains("<script>"), "Raw HTML should pass through: {}", html);
    }

    #[test]
    fn test_nested_blockquote() {
        let html = md_to_html("> outer\n> > inner");
        assert!(html.contains("<blockquote>\n<p>inner</p>\n</blockquote>"), "{}", html);
    }

    #[test]
    fn test_mixed_list() {
        let html = md_to_html("- a\n  1. nested\n  2. ordered");
        assert!(html.contains("<ul>"), "{}", html);
        assert!(html.contains("<ol start=\"1\">"), "{}", html);
    }

    #[test]
    fn test_unicode_preserved() {
        let html = md_to_html("# α β γ δ");
        assert!(html.contains("α β γ δ"), "Unicode not preserved: {}", html);
    }
}
