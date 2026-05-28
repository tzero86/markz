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
        Block::Heading { level: _, text } => {
            output.push('*');
            render_inlines(output, text, ctx);
            output.push('*');
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
        Block::List { ordered, start: _, items } => {
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    output.push('\n');
                }
                let prefix = if *ordered {
                    format!("{}. ", i + 1)
                } else {
                    "• ".to_string()
                };
                for b in &item.blocks {
                    match b {
                        Block::Paragraph { text } => {
                            output.push_str(&prefix);
                            if let Some(true) = item.task {
                                output.push_str("[x] ");
                            } else if let Some(false) = item.task {
                                output.push_str("[ ] ");
                            }
                            render_inlines(output, text, ctx);
                        }
                        _ => {
                            render_block(output, b, ctx);
                        }
                    }
                }
            }
        }
        Block::Table { header, rows } => {
            output.push_str("```\n");
            let mut lines: Vec<String> = Vec::new();
            let header_line: Vec<String> = header
                .iter()
                .map(|c| {
                    let mut s = String::new();
                    render_inlines(&mut s, &c.text, ctx);
                    s
                })
                .collect();
            lines.push(header_line.join(" | "));
            lines.push(
                header
                    .iter()
                    .map(|_| "---".to_string())
                    .collect::<Vec<_>>()
                    .join(" | "),
            );
            for row in rows {
                let row_line: Vec<String> = row
                    .iter()
                    .map(|c| {
                        let mut s = String::new();
                        render_inlines(&mut s, &c.text, ctx);
                        s
                    })
                    .collect();
                lines.push(row_line.join(" | "));
            }
            output.push_str(&lines.join("\n"));
            output.push_str("\n```");
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
            output.push('_');
            render_inlines(output, inner, ctx);
            output.push('_');
        }
        Inline::Strong(inner) => {
            output.push('*');
            render_inlines(output, inner, ctx);
            output.push('*');
        }
        Inline::Strikethrough(inner) => {
            output.push('~');
            render_inlines(output, inner, ctx);
            output.push('~');
        }
        Inline::Link { text, url, .. } => {
            output.push('<');
            output.push_str(url);
            output.push('|');
            render_inlines(output, text, ctx);
            output.push('>');
        }
        Inline::Image { alt, url, .. } => {
            output.push('<');
            output.push_str(&resolve_image_url(url, ctx));
            output.push('|');
            output.push_str(alt);
            output.push('>');
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
            output.push('<');
            output.push_str(display);
            output.push_str("|");
            output.push_str(target);
            output.push_str(".md>");
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
    fn test_heading_becomes_bold() {
        let doc = doc_with_blocks(vec![Block::Heading { level: 1, text: vec![Inline::Text("Title".to_string())] }]);
        let ctx = ConvertContext::default();
        assert_eq!(convert(&doc, &ctx), "*Title*");
    }

    #[test]
    fn test_paragraph_formatting() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![
                Inline::Strong(vec![Inline::Text("bold".to_string())]),
                Inline::Text(" ".to_string()),
                Inline::Emphasis(vec![Inline::Text("italic".to_string())]),
                Inline::Text(" ".to_string()),
                Inline::Code("code".to_string()),
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "*bold* _italic_ `code`");
    }

    #[test]
    fn test_link() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Link { text: vec![Inline::Text("text".to_string())], url: "https://example.com".to_string(), title: None }],
        }]);
        let ctx = ConvertContext::default();
        assert_eq!(convert(&doc, &ctx), "<https://example.com|text>");
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: Some("rust".to_string()), content: "fn main() {}".to_string() }]);
        let ctx = ConvertContext::default();
        assert_eq!(convert(&doc, &ctx), "```rust\nfn main() {}\n```");
    }

    #[test]
    fn test_table_as_code_block() {
        let doc = doc_with_blocks(vec![Block::Table {
            header: vec![
                TableCell { text: vec![Inline::Text("A".to_string())], alignment: None },
                TableCell { text: vec![Inline::Text("B".to_string())], alignment: None },
            ],
            rows: vec![vec![
                TableCell { text: vec![Inline::Text("1".to_string())], alignment: None },
                TableCell { text: vec![Inline::Text("2".to_string())], alignment: None },
            ]],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.starts_with("```"));
        assert!(result.contains("A | B"));
        assert!(result.contains("1 | 2"));
    }

    #[test]
    fn test_strikethrough() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Strikethrough(vec![Inline::Text("strike".to_string())])],
        }]);
        let ctx = ConvertContext::default();
        assert_eq!(convert(&doc, &ctx), "~strike~");
    }

    #[test]
    fn test_task_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("done".to_string())] }], task: Some(true) }],
        }]);
        let ctx = ConvertContext::default();
        assert_eq!(convert(&doc, &ctx), "• [x] done");
    }
}
