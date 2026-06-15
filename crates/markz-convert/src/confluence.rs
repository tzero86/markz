use markz_core::ast::*;
use crate::context::{ConvertContext, resolve_image_url};

pub fn convert(document: &Document, ctx: &ConvertContext) -> String {
    let mut output = String::new();
    output.push_str("<ac:rich-text-body>\n");
    for block in &document.blocks {
        render_block(&mut output, block, ctx);
        output.push('\n');
    }
    output.push_str("</ac:rich-text-body>");
    output
}

fn render_block(output: &mut String, block: &Block, ctx: &ConvertContext) {
    match block {
        Block::Heading { level, text } => {
            let tag = match level {
                1 => "h1",
                2 => "h2",
                3 => "h3",
                4 => "h4",
                5 => "h5",
                _ => "h6",
            };
            output.push('<');
            output.push_str(tag);
            output.push('>');
            render_inlines(output, text, ctx);
            output.push_str("</");
            output.push_str(tag);
            output.push('>');
        }
        Block::Paragraph { text } => {
            output.push_str("<p>");
            render_inlines(output, text, ctx);
            output.push_str("</p>");
        }
        Block::CodeBlock { language, content } => {
            output.push_str(r#"<ac:structured-macro ac:name="code" ac:schema-version="1">"#);
            if let Some(lang) = language {
                output.push_str(&format!(
                    r#"<ac:parameter ac:name="language">{}</ac:parameter>"#,
                    escape_xml(lang)
                ));
            }
            output.push_str("<ac:rich-text-body><pre><code>");
            output.push_str(&escape_xml(content));
            output.push_str("</code></pre></ac:rich-text-body>");
            output.push_str("</ac:structured-macro>");
        }
        Block::BlockQuote { blocks } => {
            output.push_str("<blockquote>\n");
            for b in blocks {
                render_block(output, b, ctx);
                output.push('\n');
            }
            output.push_str("</blockquote>");
        }
        Block::List { ordered, start, items } => {
            if *ordered {
                output.push_str("<ol");
                if let Some(s) = start {
                    output.push_str(&format!(r#" start="{}""#, s));
                }
                output.push_str(">\n");
            } else {
                output.push_str("<ul>\n");
            }
            for item in items {
                output.push_str("<li>");
                if let Some(done) = item.task {
                    output.push_str(if done { "[x] " } else { "[ ] " });
                }
                for b in &item.blocks {
                    render_block(output, b, ctx);
                }
                output.push_str("</li>\n");
            }
            if *ordered {
                output.push_str("</ol>");
            } else {
                output.push_str("</ul>");
            }
        }
        Block::Table { header, rows } => {
            output.push_str("<table><tbody>\n<tr>\n");
            for cell in header {
                output.push_str("<th");
                if let Some(ref align) = cell.alignment {
                    output.push_str(" style=\"text-align: ");
                    output.push_str(match align {
                        Alignment::Left => "left",
                        Alignment::Center => "center",
                        Alignment::Right => "right",
                    });
                    output.push('"');
                }
                output.push('>');
                render_inlines(output, &cell.text, ctx);
                output.push_str("</th>\n");
            }
            output.push_str("</tr>\n");
            for row in rows {
                output.push_str("<tr>\n");
                for cell in row {
                    output.push_str("<td");
                    if let Some(ref align) = cell.alignment {
                        output.push_str(" style=\"text-align: ");
                        output.push_str(match align {
                            Alignment::Left => "left",
                            Alignment::Center => "center",
                            Alignment::Right => "right",
                        });
                        output.push('"');
                    }
                    output.push('>');
                    render_inlines(output, &cell.text, ctx);
                    output.push_str("</td>\n");
                }
                output.push_str("</tr>\n");
            }
            output.push_str("</tbody></table>");
        }
        Block::ThematicBreak => {
            output.push_str("<hr />");
        }
        Block::RawHtml(html) => {
            output.push_str(html);
        }
        Block::FootnoteDefinition { label, blocks } => {
            output.push_str("<sup id=\"fn-");
            output.push_str(&escape_xml_attr(label));
            output.push_str("\">");
            for b in blocks {
                render_block(output, b, ctx);
            }
            output.push_str("</sup>");
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
            output.push_str(&escape_xml(text));
        }
        Inline::Code(code) => {
            output.push_str("<code>");
            output.push_str(&escape_xml(code));
            output.push_str("</code>");
        }
        Inline::Emphasis(inner) => {
            output.push_str("<em>");
            render_inlines(output, inner, ctx);
            output.push_str("</em>");
        }
        Inline::Strong(inner) => {
            output.push_str("<strong>");
            render_inlines(output, inner, ctx);
            output.push_str("</strong>");
        }
        Inline::Strikethrough(inner) => {
            output.push_str("<del>");
            render_inlines(output, inner, ctx);
            output.push_str("</del>");
        }
        Inline::Link { text, url, title } => {
            output.push_str("<a href=\"");
            output.push_str(&escape_xml_attr(url));
            output.push('"');
            if let Some(t) = title {
                output.push_str(" title=\"");
                output.push_str(&escape_xml_attr(t));
                output.push('"');
            }
            output.push('>');
            render_inlines(output, text, ctx);
            output.push_str("</a>");
        }
        Inline::Image { alt: _, url, title: _ } => {
            output.push_str(r#"<ac:image><ri:url ri:value=""#);
            output.push_str(&escape_xml_attr(&resolve_image_url(url, ctx)));
            output.push_str(r#"" /></ac:image>"#);
        }
        Inline::HardBreak => {
            output.push_str("<br />");
        }
        Inline::SoftBreak => {
            output.push('\n');
        }
        Inline::Html(html) => {
            output.push_str(html);
        }
        Inline::WikiLink { target, display } => {
            output.push_str("<a href=\"");
            output.push_str(target);
            output.push_str(".md\">");
            output.push_str(display);
            output.push_str("</a>");
        }
        Inline::FootnoteReference { label } => {
            output.push_str("<sup>");
            output.push_str(label);
            output.push_str("</sup>");
        }
    }
}

fn escape_xml(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn escape_xml_attr(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doc_with_blocks(blocks: Vec<Block>) -> Document {
        Document { frontmatter: None, blocks }
    }

    #[test]
    fn test_heading() {
        let ctx = ConvertContext::default();
        let doc = doc_with_blocks(vec![Block::Heading { level: 1, text: vec![Inline::Text("Hello".to_string())] }]);
        assert!(convert(&doc, &ctx).contains("<h1>Hello</h1>"));
    }

    #[test]
    fn test_paragraph_with_formatting() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![
                Inline::Strong(vec![Inline::Text("bold".to_string())]),
                Inline::Emphasis(vec![Inline::Text("italic".to_string())]),
                Inline::Code("code".to_string()),
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("<strong>bold</strong>"));
        assert!(result.contains("<em>italic</em>"));
        assert!(result.contains("<code>code</code>"));
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: Some("rust".to_string()), content: "fn main() {}".to_string() }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains(r#"ac:name="code""#));
        assert!(result.contains(r#"<ac:parameter ac:name="language">rust</ac:parameter>"#));
        assert!(result.contains("fn main() {}"));
    }

    #[test]
    fn test_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("item".to_string())] }], task: None }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("<ul>"));
        assert!(result.contains("<li>"));
        assert!(result.contains("<p>item</p>"));
        assert!(result.contains("</li>"));
        assert!(result.contains("</ul>"));
    }

    #[test]
    fn test_table() {
        let doc = doc_with_blocks(vec![Block::Table {
            header: vec![TableCell { text: vec![Inline::Text("A".to_string())], alignment: None }],
            rows: vec![vec![TableCell { text: vec![Inline::Text("b".to_string())], alignment: None }]],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("<th>A</th>"));
        assert!(result.contains("<td>b</td>"));
    }

    #[test]
    fn test_link() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Link { text: vec![Inline::Text("link".to_string())], url: "https://example.com".to_string(), title: Some("title".to_string()) }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains(r#"<a href="https://example.com" title="title">link</a>"#));
    }

    #[test]
    fn test_strikethrough() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Strikethrough(vec![Inline::Text("gone".to_string())])],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).contains("<del>gone</del>"));
    }

    #[test]
    fn test_nested_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![ListItem {
                blocks: vec![
                    Block::Paragraph { text: vec![Inline::Text("outer".to_string())] },
                    Block::List {
                        ordered: false, start: None,
                        items: vec![ListItem {
                            blocks: vec![Block::Paragraph { text: vec![Inline::Text("inner".to_string())] }],
                            task: None,
                        }],
                    },
                ],
                task: None,
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        let li_start = result.find("<li>").expect("should have <li>");
        let li_end = result.find("</li>").expect("should have </li>");
        let li_content = &result[li_start..li_end];
        assert!(li_content.contains("<ul>"), "nested <ul> should be inside <li>: {}", li_content);
        assert!(li_content.contains("<p>inner</p>"), "inner paragraph should be inside nested list");
    }

    #[test]
    fn test_task_list() {
        let doc = doc_with_blocks(vec![Block::List {
            ordered: false, start: None,
            items: vec![
                ListItem {
                    blocks: vec![Block::Paragraph { text: vec![Inline::Text("done".to_string())] }],
                    task: Some(true),
                },
                ListItem {
                    blocks: vec![Block::Paragraph { text: vec![Inline::Text("pending".to_string())] }],
                    task: Some(false),
                },
            ],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("[x]"), "completed task should have [x] marker");
        assert!(result.contains("[ ]"), "pending task should have [ ] marker");
    }

    #[test]
    fn test_table_with_alignment() {
        let doc = doc_with_blocks(vec![Block::Table {
            header: vec![
                TableCell { text: vec![Inline::Text("Left".to_string())], alignment: Some(Alignment::Left) },
                TableCell { text: vec![Inline::Text("Center".to_string())], alignment: Some(Alignment::Center) },
                TableCell { text: vec![Inline::Text("Right".to_string())], alignment: Some(Alignment::Right) },
            ],
            rows: vec![],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains(r#"style="text-align: left"#));
        assert!(result.contains(r#"style="text-align: center"#));
        assert!(result.contains(r#"style="text-align: right"#));
    }

    #[test]
    fn test_footnote_definition() {
        let doc = doc_with_blocks(vec![Block::FootnoteDefinition {
            label: "1".to_string(),
            blocks: vec![Block::Paragraph { text: vec![Inline::Text("A footnote.".to_string())] }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains(r#"<sup id="fn-1">"#), "footnote should have <sup> with id");
        assert!(result.contains("</sup>"), "footnote should close <sup>");
        assert!(result.contains("<p>A footnote.</p>"), "footnote content should be inside <sup>");
    }

    #[test]
    fn test_deeply_nested_blocks() {
        let doc = doc_with_blocks(vec![Block::BlockQuote {
            blocks: vec![Block::List {
                ordered: false, start: None,
                items: vec![ListItem {
                    blocks: vec![
                        Block::Paragraph { text: vec![Inline::Text("nested paragraph".to_string())] },
                    ],
                    task: None,
                }],
            }],
        }]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.contains("<blockquote>"));
        assert!(result.contains("</blockquote>"));
        assert!(result.contains("<ul>"));
        assert!(result.contains("<li>"));
        assert!(result.contains("<p>nested paragraph</p>"));
        // Verify nesting order
        let bq_start = result.find("<blockquote>").unwrap();
        let ul_pos = result[bq_start..].find("<ul>").unwrap() + bq_start;
        let li_pos = result[ul_pos..].find("<li>").unwrap() + ul_pos;
        let p_pos = result[li_pos..].find("<p>nested paragraph</p>").unwrap() + li_pos;
        let ul_end = result[p_pos..].find("</ul>").unwrap() + p_pos;
        let bq_end = result[ul_end..].find("</blockquote>").unwrap() + ul_end;
        assert!(bq_start < ul_pos && ul_pos < li_pos && li_pos < p_pos && ul_end < bq_end,
            "block elements should be properly nested");
    }
}
