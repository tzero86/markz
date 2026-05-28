use markz_core::ast::*;
use crate::context::{ConvertContext, resolve_image_url};

struct RenderContext {
    at_line_start: bool,
}

pub fn convert(document: &Document, ctx: &ConvertContext) -> String {
    let mut output = String::new();
    for (i, block) in document.blocks.iter().enumerate() {
        render_block(&mut output, block, 0, ctx);
        if i < document.blocks.len() - 1 {
            output.push_str("\n\n");
        }
    }
    output
}

fn render_block(output: &mut String, block: &Block, depth: usize, ctx: &ConvertContext) {
    match block {
        Block::Heading { level, text } => {
            output.push_str(&format!("h{}. ", level));
            let mut rctx = RenderContext { at_line_start: false };
            render_inlines(output, text, &mut rctx, ctx);
        }
        Block::Paragraph { text } => {
            let mut rctx = RenderContext { at_line_start: true };
            render_inlines(output, text, &mut rctx, ctx);
        }
        Block::CodeBlock { language, content } => {
            if let Some(lang) = language {
                output.push_str(&format!("{{code:{}}}", lang));
            } else {
                output.push_str("{code}");
            }
            output.push('\n');
            output.push_str(content);
            if !content.ends_with('\n') {
                output.push('\n');
            }
            output.push_str("{code}");
        }
        Block::BlockQuote { blocks } => {
            for (i, b) in blocks.iter().enumerate() {
                if i > 0 {
                    output.push('\n');
                }
                let mut bq_output = String::new();
                render_block(&mut bq_output, b, depth, ctx);
                for line in bq_output.trim().lines() {
                    output.push_str("bq. ");
                    output.push_str(line);
                    output.push('\n');
                }
                if output.ends_with('\n') {
                    output.pop();
                }
            }
        }
        Block::List { ordered, start: _, items } => {
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    output.push('\n');
                }
                let prefix = if *ordered {
                    format!("{} ", "#".repeat(depth + 1))
                } else {
                    format!("{} ", "*".repeat(depth + 1))
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
                            let mut rctx = RenderContext { at_line_start: false };
                            render_inlines(output, text, &mut rctx, ctx);
                        }
                        Block::List { .. } => {
                            render_block(output, b, depth + 1, ctx);
                        }
                        _ => {
                            let indent = " ".repeat(prefix.len());
                            let mut sub = String::new();
                            render_block(&mut sub, b, depth + 1, ctx);
                            let lines: Vec<_> = sub.trim().lines().collect();
                            for (k, line) in lines.iter().enumerate() {
                                if k > 0 {
                                    output.push('\n');
                                }
                                if j == 0 {
                                    output.push_str(&prefix);
                                } else {
                                    output.push_str(&indent);
                                }
                                output.push_str(line);
                            }
                        }
                    }
                }
            }
        }
        Block::Table { header, rows } => {
            for cell in header {
                output.push_str("||");
                let mut rctx = RenderContext { at_line_start: false };
                render_inlines(output, &cell.text, &mut rctx, ctx);
            }
            output.push_str("||");
            output.push('\n');
            for row in rows {
                for cell in row {
                    output.push('|');
                    let mut rctx = RenderContext { at_line_start: false };
                    render_inlines(output, &cell.text, &mut rctx, ctx);
                }
                output.push('|');
                output.push('\n');
            }
            if output.ends_with('\n') {
                output.pop();
            }
        }
        Block::ThematicBreak => {
            output.push_str("----");
        }
        Block::RawHtml(html) => {
            output.push_str(html);
        }
        Block::FootnoteDefinition { blocks, .. } => {
            for b in blocks {
                render_block(output, b, depth, ctx);
            }
        }
    }
}

fn render_inlines(output: &mut String, inlines: &[Inline], rctx: &mut RenderContext, ctx: &ConvertContext) {
    for inline in inlines {
        render_inline(output, inline, rctx, ctx);
    }
}

fn render_inline(output: &mut String, inline: &Inline, rctx: &mut RenderContext, ctx: &ConvertContext) {
    match inline {
        Inline::Text(text) => {
            output.push_str(text);
            rctx.at_line_start = false;
        }
        Inline::Code(code) => {
            output.push_str("{{");
            output.push_str(code);
            output.push_str("}}");
            rctx.at_line_start = false;
        }
        Inline::Emphasis(inner) => {
            output.push('_');
            render_inlines(output, inner, rctx, ctx);
            output.push('_');
            rctx.at_line_start = false;
        }
        Inline::Strong(inner) => {
            output.push('*');
            render_inlines(output, inner, rctx, ctx);
            output.push('*');
            rctx.at_line_start = false;
        }
        Inline::Strikethrough(inner) => {
            output.push('-');
            render_inlines(output, inner, rctx, ctx);
            output.push('-');
            rctx.at_line_start = false;
        }
        Inline::Link { text, url, .. } => {
            output.push('[');
            render_inlines(output, text, rctx, ctx);
            output.push('|');
            output.push_str(url);
            output.push(']');
            rctx.at_line_start = false;
        }
        Inline::Image { alt, url, .. } => {
            output.push('!');
            output.push_str(&resolve_image_url(url, ctx));
            if !alt.is_empty() {
                output.push('|');
                output.push_str(alt);
            }
            output.push('!');
            rctx.at_line_start = false;
        }
        Inline::HardBreak => {
            output.push('\n');
            rctx.at_line_start = true;
        }
        Inline::SoftBreak => {
            output.push('\n');
            rctx.at_line_start = true;
        }
        Inline::Html(html) => {
            output.push_str(html);
            rctx.at_line_start = false;
        }
        Inline::WikiLink { target, display } => {
            output.push('[');
            output.push_str(display);
            output.push_str("|");
            output.push_str(target);
            output.push_str(".md]");
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
        Document {
            frontmatter: None,
            blocks,
        }
    }

    #[test]
    fn test_headings() {
        let ctx = ConvertContext::default();
        let doc = doc_with_blocks(vec![
            Block::Heading { level: 1, text: vec![Inline::Text("H1".to_string())] },
            Block::Heading { level: 2, text: vec![Inline::Text("H2".to_string())] },
            Block::Heading { level: 3, text: vec![Inline::Text("H3".to_string())] },
            Block::Heading { level: 4, text: vec![Inline::Text("H4".to_string())] },
            Block::Heading { level: 5, text: vec![Inline::Text("H5".to_string())] },
            Block::Heading { level: 6, text: vec![Inline::Text("H6".to_string())] },
        ]);
        let result = convert(&doc, &ctx);
        assert_eq!(result, "h1. H1\n\nh2. H2\n\nh3. H3\n\nh4. H4\n\nh5. H5\n\nh6. H6");
    }

    #[test]
    fn test_paragraph_with_formatting() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![
                Inline::Strong(vec![Inline::Text("bold".to_string())]),
                Inline::Text(" ".to_string()),
                Inline::Emphasis(vec![Inline::Text("italic".to_string())]),
                Inline::Text(" ".to_string()),
                Inline::Code("code".to_string()),
                Inline::Text(" ".to_string()),
                Inline::Link { text: vec![Inline::Text("link".to_string())], url: "https://example.com".to_string(), title: None },
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "*bold* _italic_ {{code}} [link|https://example.com]");
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: Some("rust".to_string()), content: "fn main() {}".to_string() }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "{code:rust}\nfn main() {}\n{code}");
    }

    #[test]
    fn test_code_block_no_lang() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: None, content: "plain".to_string() }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "{code}\nplain\n{code}");
    }

    #[test]
    fn test_unordered_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("one".to_string())] }], task: None },
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("two".to_string())] }], task: None },
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "* one\n* two");
    }

    #[test]
    fn test_ordered_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: true, start: Some(1),
            items: vec![
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("one".to_string())] }], task: None },
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("two".to_string())] }], task: None },
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "# one\n# two");
    }

    #[test]
    fn test_task_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("done".to_string())] }], task: Some(true) },
                ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("todo".to_string())] }], task: Some(false) },
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "* [x] done\n* [ ] todo");
    }

    #[test]
    fn test_nested_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("parent".to_string())] },
                    Block::List { ordered: false, start: None, items: vec![ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("child".to_string())] }], task: None }] },
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "* parent\n** child");
    }

    #[test]
    fn test_blockquote() {
        let doc = doc_with_blocks(vec![Block::BlockQuote { blocks: vec![Block::Paragraph { text: vec![Inline::Text("quote".to_string())] }] }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "bq. quote");
    }

    #[test]
    fn test_table() {
        let doc = doc_with_blocks(vec![Block::Table {
            header: vec![
                TableCell { text: vec![Inline::Text("A".to_string())], alignment: None },
                TableCell { text: vec![Inline::Text("B".to_string())], alignment: None },
            ],
            rows: vec![vec![
                TableCell { text: vec![Inline::Text("c".to_string())], alignment: None },
                TableCell { text: vec![Inline::Text("d".to_string())], alignment: None },
            ]],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "||A||B||\n|c|d|");
    }

    #[test]
    fn test_image() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Image { alt: "alt".to_string(), url: "https://example.com/img.png".to_string(), title: None }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "!https://example.com/img.png|alt!");
    }

    #[test]
    fn test_strikethrough() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Strikethrough(vec![Inline::Text("strike".to_string())])],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "-strike-");
    }

    #[test]
    fn test_thematic_break() {
        let doc = doc_with_blocks(vec![Block::ThematicBreak]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert_eq!(result, "----");
    }
}
