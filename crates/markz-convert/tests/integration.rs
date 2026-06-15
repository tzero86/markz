//! End-to-end converter tests: Markdown input → parse → convert → expected output.
//! These catch integration bugs between the parser and each format converter.

use markz_core::parser::parse;
use markz_convert::context::ConvertContext;

fn md_to_jira(markdown: &str) -> String {
    let doc = parse(markdown);
    markz_convert::jira::convert(&doc, &ConvertContext::default())
}

fn md_to_confluence(markdown: &str) -> String {
    let doc = parse(markdown);
    markz_convert::confluence::convert(&doc, &ConvertContext::default())
}

fn md_to_github(markdown: &str) -> String {
    let doc = parse(markdown);
    markz_convert::github::convert(&doc, &ConvertContext::default())
}

fn md_to_slack(markdown: &str) -> String {
    let doc = parse(markdown);
    markz_convert::slack::convert(&doc, &ConvertContext::default())
}

// ─── JIRA integration tests ─────────────────────────────────────────────

#[test]
fn jira_heading() {
    assert_eq!(md_to_jira("# Hello"), "h1. Hello");
}

#[test]
fn jira_bold_italic_code() {
    assert_eq!(
        md_to_jira("**bold** _italic_ `code`"),
        "*bold* _italic_ {{code}}"
    );
}

#[test]
fn jira_link() {
    assert_eq!(
        md_to_jira("[Google](https://google.com)"),
        "[Google|https://google.com]"
    );
}

#[test]
fn jira_image() {
    assert_eq!(
        md_to_jira("![alt text](https://example.com/img.png)"),
        "!https://example.com/img.png|alt text!"
    );
}

#[test]
fn jira_code_block_with_language() {
    assert_eq!(
        md_to_jira("```rust\nfn main() {}\n```"),
        "{code:rust}\nfn main() {}\n{code}"
    );
}

#[test]
fn jira_code_block_without_language() {
    let result = md_to_jira("```\nplain\n```");
    // Fenced code block without language still has empty language string
    assert!(result.starts_with("{code"), "should start with code macro: {result}");
    assert!(result.contains("plain"), "should contain code content: {result}");
    assert!(result.ends_with("{code}"), "should end with code macro: {result}");
}

#[test]
fn jira_unordered_list() {
    assert_eq!(md_to_jira("- one\n- two"), "* one\n* two");
}

#[test]
fn jira_ordered_list() {
    assert_eq!(md_to_jira("1. one\n2. two"), "# one\n# two");
}

#[test]
fn jira_task_list() {
    assert_eq!(
        md_to_jira("- [x] done\n- [ ] todo"),
        "* [x] done\n* [ ] todo"
    );
}

#[test]
fn jira_nested_list() {
    let result = md_to_jira("- parent\n  - child");
    assert!(result.contains("child"), "nested list should contain child: {result}");
    assert!(result.contains("* parent"), "nested list should contain parent: {result}");
}

#[test]
fn jira_blockquote() {
    assert_eq!(md_to_jira("> quote"), "bq. quote");
}

#[test]
fn jira_blockquote_multiline() {
    let result = md_to_jira("> line1\n>\n> line2");
    assert!(result.contains("bq. line1"), "should have bq line1: {result}");
    assert!(result.contains("bq. line2"), "should have bq line2: {result}");
    // Lines should be separated (either by newline or blank bq line)
    assert!(result.contains('\n'), "should have newline separation: {result}");
}

#[test]
fn jira_table() {
    let result = md_to_jira("| A | B |\n| --- | --- |\n| c | d |");
    assert!(result.contains("||A||B||"), "header should be double-pipe: {result}");
    assert!(result.contains("|c|d|"), "row should be single-pipe: {result}");
}

#[test]
fn jira_horizontal_rule() {
    assert_eq!(md_to_jira("---"), "----");
}

#[test]
fn jira_strikethrough() {
    assert_eq!(md_to_jira("~~deleted~~"), "-deleted-");
}

#[test]
fn jira_complex_document() {
    let md = "# Title\n\nSome text with **bold** and _italic_.\n\n- item 1\n- item 2\n\n```\ncode\n```";
    let result = md_to_jira(md);
    assert!(result.starts_with("h1. Title"), "should start with heading: {result}");
    assert!(result.contains("*bold*"), "should contain bold: {result}");
    assert!(result.contains("_italic_"), "should contain italic: {result}");
    assert!(result.contains("* item 1"), "should contain list: {result}");
    assert!(result.contains("{code}"), "should contain code block: {result}");
}

// ─── Confluence integration tests ────────────────────────────────────────

#[test]
fn confluence_heading() {
    let result = md_to_confluence("# Hello");
    assert_eq!(result, "<ac:rich-text-body>\n<h1>Hello</h1>\n</ac:rich-text-body>");
}

#[test]
fn confluence_bold_italic_code() {
    let result = md_to_confluence("**bold** _italic_ `code`");
    assert!(result.contains("<strong>bold</strong>"), "bold: {result}");
    assert!(result.contains("<em>italic</em>"), "italic: {result}");
    assert!(result.contains("<code>code</code>"), "code: {result}");
}

#[test]
fn confluence_link() {
    let result = md_to_confluence("[Google](https://google.com)");
    assert!(result.contains(r#"<a href="https://google.com">Google</a>"#), "link: {result}");
}

#[test]
fn confluence_image() {
    let result = md_to_confluence("![alt](https://example.com/img.png)");
    assert!(result.contains("<ac:image>"), "should use ac:image macro: {result}");
    assert!(result.contains("ri:url"), "should have ri:url: {result}");
}

#[test]
fn confluence_code_block() {
    let result = md_to_confluence("```rust\nfn main() {}\n```");
    assert!(result.contains(r#"ac:name="code""#), "code macro: {result}");
    assert!(result.contains("rust"), "language param: {result}");
    assert!(result.contains("fn main()"), "code content: {result}");
}

#[test]
fn confluence_unordered_list() {
    let result = md_to_confluence("- one\n- two");
    assert!(result.contains("<ul>"), "ul: {result}");
    // List item content is wrapped in <p> by the paragraph block renderer
    assert!(result.contains("<li>"), "li tag: {result}");
    assert!(result.contains("one"), "one content: {result}");
    assert!(result.contains("two"), "two content: {result}");
}

#[test]
fn confluence_ordered_list() {
    let result = md_to_confluence("1. one\n2. two");
    assert!(result.contains("<ol"), "ol tag: {result}");
    assert!(result.contains("one"), "one content: {result}");
}

#[test]
fn confluence_blockquote() {
    let result = md_to_confluence("> quote");
    assert!(result.contains("<blockquote>"), "blockquote: {result}");
    assert!(result.contains("quote"), "content: {result}");
}

#[test]
fn confluence_table() {
    let result = md_to_confluence("| A | B |\n| --- | --- |\n| c | d |");
    assert!(result.contains("<table>"), "table: {result}");
    assert!(result.contains("<th>A</th>"), "th: {result}");
    assert!(result.contains("<td>c</td>"), "td: {result}");
}

#[test]
fn confluence_horizontal_rule() {
    let result = md_to_confluence("---");
    assert!(result.contains("<hr />"), "hr: {result}");
}

#[test]
fn confluence_strikethrough() {
    let result = md_to_confluence("~~deleted~~");
    assert!(result.contains("<del>deleted</del>"), "del: {result}");
}

#[test]
fn confluence_nested_list() {
    let result = md_to_confluence("- parent\n  - child");
    assert!(result.contains("child"), "nested child should appear: {result}");
    // Should have nested ul inside li
    assert!(result.contains("<ul>"), "should have nested ul: {result}");
}

#[test]
fn confluence_task_list() {
    let result = md_to_confluence("- [x] done\n- [ ] todo");
    assert!(result.contains("done"), "done item: {result}");
    assert!(result.contains("todo"), "todo item: {result}");
}

// ─── GitHub integration tests ───────────────────────────────────────────

#[test]
fn github_heading() {
    assert_eq!(md_to_github("# Hello"), "# Hello");
}

#[test]
fn github_bold_italic_code() {
    // GitHub flavor converts both _ and * to * for emphasis
    let result = md_to_github("**bold** _italic_ `code`");
    assert!(result.contains("**bold**"), "bold: {result}");
    assert!(result.contains("italic"), "italic: {result}");
    assert!(result.contains("`code`"), "code: {result}");
}

#[test]
fn github_link() {
    assert_eq!(
        md_to_github("[Google](https://google.com)"),
        "[Google](https://google.com)"
    );
}

#[test]
fn github_link_with_title() {
    let result = md_to_github("[Google](https://google.com \"Search\")");
    assert!(result.contains(r#" "Search""#), "title: {result}");
}

#[test]
fn github_code_block() {
    assert_eq!(
        md_to_github("```rust\nfn main() {}\n```"),
        "```rust\nfn main() {}\n```"
    );
}

#[test]
fn github_unordered_list() {
    assert_eq!(md_to_github("- one\n- two"), "- one\n- two");
}

#[test]
fn github_nested_unordered_list() {
    let result = md_to_github("- parent\n  - child");
    assert!(result.contains("parent"), "should contain parent: {result}");
    assert!(result.contains("child"), "should contain nested child: {result}");
    assert!(result.contains("- child") || result.contains("  - child"), "child should be list item: {result}");
}

#[test]
fn github_nested_ordered_list() {
    let result = md_to_github("1. parent\n   1. child");
    assert!(result.contains("parent"), "should contain parent: {result}");
    assert!(result.contains("child"), "should contain nested child: {result}");
}



#[test]
fn github_table() {
    let result = md_to_github("| A | B |\n| --- | --- |\n| c | d |");
    assert!(result.contains("|A|B|"), "header: {result}");
    assert!(result.contains("| --- | --- |"), "separator: {result}");
    assert!(result.contains("|c|d|"), "row: {result}");
}

#[test]
fn github_strikethrough() {
    assert_eq!(md_to_github("~~deleted~~"), "~~deleted~~");
}

#[test]
fn github_blockquote() {
    assert_eq!(md_to_github("> quote"), "> quote");
}

// ─── Slack integration tests ────────────────────────────────────────────

#[test]
fn slack_heading_becomes_bold() {
    let result = md_to_slack("# Hello");
    assert_eq!(result, "*Hello*");
}

#[test]
fn slack_bold_italic() {
    assert_eq!(md_to_slack("**bold** _italic_"), "*bold* _italic_");
}

#[test]
fn slack_code() {
    assert_eq!(md_to_slack("`code`"), "`code`");
}

#[test]
fn slack_link() {
    let result = md_to_slack("[Google](https://google.com)");
    assert_eq!(result, "<https://google.com|Google>");
}

#[test]
fn slack_image() {
    let result = md_to_slack("![alt](https://example.com/img.png)");
    assert_eq!(result, "<https://example.com/img.png|alt>");
}

#[test]
fn slack_code_block() {
    assert_eq!(
        md_to_slack("```rust\nfn main() {}\n```"),
        "```rust\nfn main() {}\n```"
    );
}

#[test]
fn slack_strikethrough() {
    assert_eq!(md_to_slack("~~deleted~~"), "~deleted~");
}

#[test]
fn slack_unordered_list() {
    assert_eq!(md_to_slack("- one\n- two"), "\u{2022} one\n\u{2022} two");
}

#[test]
fn slack_table_becomes_code_block() {
    let result = md_to_slack("| A | B |\n| --- | --- |\n| c | d |");
    assert!(result.starts_with("```"), "table should be in code block: {result}");
    assert!(result.ends_with("```"), "table should end code block: {result}");
}

// ─── Cross-format edge cases ─────────────────────────────────────────────

#[test]
fn empty_input() {
    assert_eq!(md_to_jira(""), "");
    assert_eq!(md_to_github(""), "");
    assert_eq!(md_to_slack(""), "");
    // Confluence wraps in rich-text-body even for empty
    let cf = md_to_confluence("");
    assert!(cf.contains("<ac:rich-text-body>"), "cf empty: {cf}");
}

#[test]
fn only_whitespace() {
    let result = md_to_jira("   \n  ");
    assert_eq!(result, "");
}

#[test]
fn image_with_title_preserved() {
    let md = r#"![alt text](https://example.com/img.png "Image Title")"#;
    let result = md_to_jira(md);
    assert!(result.contains("alt text"), "alt text: {result}");
}

#[test]
fn multiple_block_types_separated() {
    let md = "# Title\n\nParagraph one.\n\nParagraph two.\n\n---";
    let result = md_to_jira(md);
    let sections: Vec<&str> = result.split("\n\n").collect();
    assert!(sections.len() >= 4, "should have sections separated by blank lines: {sections:?}");
}

#[test]
fn deeply_nested_list() {
    let md = "- a\n  - b\n    - c";
    let result = md_to_jira(md);
    assert!(result.contains("a"), "level 1: {result}");
    assert!(result.contains("b"), "level 2: {result}");
    assert!(result.contains("c"), "level 3: {result}");
}
