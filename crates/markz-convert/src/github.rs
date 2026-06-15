use markz_core::ast::*;
use crate::context::{ConvertContext, resolve_image_url};

pub fn convert(document: &Document, ctx: &ConvertContext) -> String {
    let mut output = String::new();
    for (i, block) in document.blocks.iter().enumerate() {
        render_block(&mut output, block, ctx);
        if i < document.blocks.len() - 1 {
            output.push_str("\n\n");
        }
    }
    output
}

fn render_block(output: &mut String, block: &Block, ctx: &ConvertContext) {
    match block {
        Block::Heading { level, text } => {
            for _ in 0..*level {
                output.push('#');
            }
            output.push(' ');
            render_inlines(output, text, ctx);
        }
        Block::Paragraph { text } => {
            render_inlines(output, text, ctx);
        }
        Block::CodeBlock { language, content } => {
            output.push_str("```");
            if let Some(lang) = language {
                output.push_str(lang);
            }
            output.push('\n');
            output.push_str(content);
            if !content.ends_with('\n') {
                output.push('\n');
            }
            output.push_str("```");
        }
        Block::BlockQuote { blocks } => {
            for b in blocks {
                let mut sub = String::new();
                render_block(&mut sub, b, ctx);
                for line in sub.trim().lines() {
                    output.push_str("> ");
                    output.push_str(line);
                    output.push('\n');
                }
            }
            if output.ends_with('\n') {
                output.pop();
            }
        }
        Block::List { ordered, start, items } => {
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    output.push('\n');
                }
                let prefix = if *ordered {
                    format!("{}. ", start.unwrap_or(1) + i as u64)
                } else {
                    "- ".to_string()
                };
                for (j, b) in item.blocks.iter().enumerate() {
                    if j > 0 {
                        output.push('\n');
                    }
                    match b {
                        Block::Paragraph { text } if j == 0 => {
                            output.push_str(&prefix);
                            if let Some(true) = item.task {
                                output.push_str("[x] ");
                            } else if let Some(false) = item.task {
                                output.push_str("[ ] ");
                            }
                            render_inlines(output, text, ctx);
                        }
                        Block::List { .. } => {
                            let indent = " ".repeat(prefix.len());
                            let mut sub = String::new();
                            render_block(&mut sub, b, ctx);
                            for line in sub.trim().lines() {
                                output.push('\n');
                                output.push_str(&indent);
                                output.push_str(line);
                            }
                        }
                        _ => {
                            let indent = " ".repeat(prefix.len());
                            let mut sub = String::new();
                            render_block(&mut sub, b, ctx);
                            for line in sub.trim().lines() {
                                output.push('\n');
                                output.push_str(&indent);
                                output.push_str(line);
                            }
                        }
                    }
                }
            }
        }
        Block::Table { header, rows } => {
            output.push('|');
            for cell in header {
                render_inlines(output, &cell.text, ctx);
                output.push('|');
            }
            output.push('\n');
            output.push('|');
            for _ in header {
                output.push_str(" --- |");
            }
            output.push('\n');
            for row in rows {
                output.push('|');
                for cell in row {
                    render_inlines(output, &cell.text, ctx);
                    output.push('|');
                }
                output.push('\n');
            }
            if output.ends_with('\n') {
                output.pop();
            }
        }
        Block::ThematicBreak => {
            output.push_str("---");
        }
        Block::RawHtml(html) => {
            output.push_str(html);
        }
        Block::FootnoteDefinition { blocks, .. } => {
            for b in blocks {
                render_block(output, b, ctx);
            }
        }
    }
}

fn render_inlines(output: &mut String, inlines: &[Inline], ctx: &ConvertContext) {
    for inline in inlines {
        render_inline(output, inline, ctx);
    }
}

fn render_inline(output: &mut String, inline: &Inline, ctx: &ConvertContext) {
    match inline {
        Inline::Text(text) => {
            output.push_str(text);
        }
        Inline::Code(code) => {
            output.push('`');
            output.push_str(code);
            output.push('`');
        }
        Inline::Emphasis(inner) => {
            output.push('*');
            render_inlines(output, inner, ctx);
            output.push('*');
        }
        Inline::Strong(inner) => {
            output.push_str("**");
            render_inlines(output, inner, ctx);
            output.push_str("**");
        }
        Inline::Strikethrough(inner) => {
            output.push_str("~~");
            render_inlines(output, inner, ctx);
            output.push_str("~~");
        }
        Inline::Link { text, url, title } => {
            output.push('[');
            render_inlines(output, text, ctx);
            output.push(']');
            output.push('(');
            output.push_str(url);
            if let Some(t) = title {
                output.push_str(" \"");
                output.push_str(t);
                output.push('"');
            }
            output.push(')');
        }
        Inline::Image { alt, url, title } => {
            output.push_str("![");
            output.push_str(alt);
            output.push_str("](");
            output.push_str(&resolve_image_url(url, ctx));
            if let Some(t) = title {
                output.push_str(" \"");
                output.push_str(t);
                output.push('"');
            }
            output.push(')');
        }
        Inline::HardBreak => {
            output.push('\n');
        }
        Inline::SoftBreak => {
            output.push(' ');
        }
        Inline::Html(html) => {
            output.push_str(html);
        }
        Inline::WikiLink { target, display } => {
            output.push('[');
            output.push_str(display);
            output.push_str("](");
            output.push_str(target);
            output.push_str(".md)");
        }
        Inline::FootnoteReference { label } => {
            output.push_str("[^");
            output.push_str(label);
            output.push(']');
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doc_with_blocks(blocks: Vec<Block>) -> Document {
        Document { frontmatter: None, blocks }
    }

    #[test]
    fn test_heading() {
        let doc = doc_with_blocks(vec![Block::Heading { level: 2, text: vec![Inline::Text("Section".to_string())] }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("## Section"));
    }

    #[test]
    fn test_no_export_branding() {
        let doc = doc_with_blocks(vec![Block::Paragraph { text: vec![Inline::Text("Hello world".to_string())] }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(!result.contains("Generated by MarkZ"));
        assert!(!result.contains("<!--"));
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn test_paragraph_formatting() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![
                Inline::Strong(vec![Inline::Text("bold".to_string())]),
                Inline::Emphasis(vec![Inline::Text("italic".to_string())]),
                Inline::Code("code".to_string()),
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("**bold**"));
        assert!(result.contains("*italic*"));
        assert!(result.contains("`code`"));
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: Some("rust".to_string()), content: "fn main() {}".to_string() }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("```rust\nfn main() {}\n```"));
    }

    #[test]
    fn test_link_with_title() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Link { text: vec![Inline::Text("link".to_string())], url: "https://example.com".to_string(), title: Some("title".to_string()) }],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("[link](https://example.com \"title\")"));
    }

    #[test]
    fn test_table() {
        let doc = doc_with_blocks(vec![Block::Table {
            header: vec![TableCell { text: vec![Inline::Text("A".to_string())], alignment: None }],
            rows: vec![vec![TableCell { text: vec![Inline::Text("b".to_string())], alignment: None }]],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("|A|"));
        assert!(result.contains("|b|"));
    }

    #[test]
    fn test_task_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("done".to_string())] }], task: Some(true) }],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("- [x] done"));
    }

    #[test]
    fn test_strikethrough() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Strikethrough(vec![Inline::Text("old".to_string())])],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("~~old~~"));
    }

    #[test]
    fn test_nested_unordered_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("parent".to_string())] },
                    Block::List { ordered: false, start: None, items: vec![
                        ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("child".to_string())] }], task: None },
                    ]},
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        // Indent should be 2 spaces for "- " prefix (length 2)
        assert_eq!(result, "- parent\n\n  - child");
    }

    #[test]
    fn test_nested_ordered_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: true, start: Some(1),
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("parent".to_string())] },
                    Block::List { ordered: true, start: Some(1), items: vec![
                        ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("child".to_string())] }], task: None },
                    ]},
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        // Indent should be 3 spaces for "1. " prefix (length 3)
        assert_eq!(result, "1. parent\n\n   1. child");
    }

    #[test]
    fn test_nested_mixed_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("item".to_string())] },
                    Block::List { ordered: true, start: Some(1), items: vec![
                        ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("sub".to_string())] }], task: None },
                    ]},
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("- item"), "parent: {result}");
        assert!(result.contains("sub"), "child: {result}");
    }

    #[test]
    fn test_list_with_code_block() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("item".to_string())] },
                    Block::CodeBlock { language: Some("js".to_string()), content: "let x = 1;".to_string() },
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("- item"), "list item: {result}");
        assert!(result.contains("let x = 1"), "code block: {result}");
    }

    #[test]
    fn test_complex_document() {
        let doc = doc_with_blocks(vec![
            Block::Heading { level: 1, text: vec![Inline::Text("Title".to_string())] },
            Block::Paragraph { text: vec![Inline::Text("Intro".to_string())] },
            Block::List { ordered: false, start: None, items: vec![
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("a".to_string())] }], task: None },
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("b".to_string())] }], task: None },
            ]},
            Block::CodeBlock { language: None, content: "code".to_string() },
            Block::ThematicBreak,
        ]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("# Title"), "heading: {result}");
        assert!(result.contains("Intro"), "para: {result}");
        assert!(result.contains("- a"), "list: {result}");
        assert!(result.contains("```"), "code: {result}");
        assert!(result.contains("---"), "hr: {result}");
    }
}
