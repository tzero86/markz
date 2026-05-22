use crate::ast::*;
use crate::toc;
use std::fmt::Write;

/// Render a Document AST to HTML string.
pub fn render(document: &Document) -> String {
    let mut output = String::new();
    for block in &document.blocks {
        render_block(&mut output, block);
        output.push('\n');
    }
    output
}

fn render_block(output: &mut String, block: &Block) {
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
            let heading_text = toc::extract_text(text);
            let id = toc::slugify(&heading_text);
            output.push('<');
            output.push_str(tag);
            let _ = write!(output, r#" id="{}""#, id);
            output.push('>');
            render_inlines(output, text);
            output.push_str("</");
            output.push_str(tag);
            output.push('>');
        }
        Block::Paragraph { text } => {
            output.push_str("<p>");
            render_inlines(output, text);
            output.push_str("</p>");
        }
        Block::CodeBlock { language, content } => {
            output.push_str("<pre><code");
            if let Some(lang) = language {
                let _ = write!(output, r#" class="language-{lang}""#);
            }
            output.push('>');
            escape_html(output, content);
            output.push_str("</code></pre>");
        }
        Block::BlockQuote { blocks } => {
            output.push_str("<blockquote>\n");
            for b in blocks {
                render_block(output, b);
                output.push('\n');
            }
            output.push_str("</blockquote>");
        }
        Block::List { ordered, start, items } => {
            if *ordered {
                output.push_str("<ol");
                if let Some(s) = start {
                    let _ = write!(output, r#" start="{s}""#);
                }
                output.push_str(">\n");
            } else {
                output.push_str("<ul>\n");
            }
            for item in items {
                if let Some(checked) = item.task {
                    let checked_attr = if checked { " checked" } else { "" };
                    output.push_str("<li class=\"task-list-item\">");
                    // Place checkbox inside the first paragraph so text flows
                    // naturally on the same line; nested lists remain block children.
                    if let Some(Block::Paragraph { text }) = item.blocks.first() {
                        output.push_str("<p><input type=\"checkbox\" disabled");
                        output.push_str(checked_attr);
                        output.push_str("> ");
                        for inline in text {
                            render_inline(output, inline);
                        }
                        output.push_str("</p>");
                        for b in &item.blocks[1..] {
                            render_block(output, b);
                        }
                    } else {
                        output.push_str("<input type=\"checkbox\" disabled");
                        output.push_str(checked_attr);
                        output.push_str("> ");
                        for b in &item.blocks {
                            render_block(output, b);
                        }
                    }
                } else {
                    output.push_str("<li>");
                    for b in &item.blocks {
                        render_block(output, b);
                    }
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
            output.push_str(r#"<table style="border-collapse:collapse;width:100%;border:1px solid #d1d5db;">"#);
            output.push_str("\n<thead>\n<tr>\n");
            for cell in header {
                output.push_str(r#"<th style="border:1px solid #d1d5db;padding:8px 12px;background-color:#f3f4f6;font-weight:600;"#);
                if let Some(align) = &cell.alignment {
                    let align_val = match align {
                        crate::ast::Alignment::Left => "left",
                        crate::ast::Alignment::Center => "center",
                        crate::ast::Alignment::Right => "right",
                    };
                    output.push_str(&format!(r#";text-align:{}"#, align_val));
                }
                output.push_str("\">");
                render_inlines(output, &cell.text);
                output.push_str("</th>\n");
            }
            output.push_str("</tr>\n</thead>\n<tbody>\n");
            for row in rows {
                output.push_str("<tr>\n");
                for cell in row {
                    output.push_str(r#"<td style="border:1px solid #d1d5db;padding:8px 12px;"#);
                    if let Some(align) = &cell.alignment {
                        let align_val = match align {
                            crate::ast::Alignment::Left => "left",
                            crate::ast::Alignment::Center => "center",
                            crate::ast::Alignment::Right => "right",
                        };
                        output.push_str(&format!(r#";text-align:{}"#, align_val));
                    }
                    output.push_str("\">");
                    render_inlines(output, &cell.text);
                    output.push_str("</td>\n");
                }
                output.push_str("</tr>\n");
            }
            output.push_str("</tbody>\n</table>");
        }
        Block::ThematicBreak => {
            output.push_str("<hr />");
        }
        Block::RawHtml(html) => {
            output.push_str(html);
        }
    }
}

fn render_inlines(output: &mut String, inlines: &[Inline]) {
    for inline in inlines {
        render_inline(output, inline);
    }
}

fn render_inline(output: &mut String, inline: &Inline) {
    match inline {
        Inline::Text(text) => escape_html(output, text),
        Inline::Code(code) => {
            output.push_str("<code>");
            escape_html(output, code);
            output.push_str("</code>");
        }
        Inline::Emphasis(inner) => {
            output.push_str("<em>");
            render_inlines(output, inner);
            output.push_str("</em>");
        }
        Inline::Strong(inner) => {
            output.push_str("<strong>");
            render_inlines(output, inner);
            output.push_str("</strong>");
        }
        Inline::Strikethrough(inner) => {
            output.push_str("<del>");
            render_inlines(output, inner);
            output.push_str("</del>");
        }
        Inline::Link { text, url, title } => {
            output.push_str("<a href=\"");
            escape_attr(output, url);
            output.push('"');
            if let Some(t) = title {
                output.push_str(" title=\"");
                escape_attr(output, t);
                output.push('"');
            }
            output.push('>');
            render_inlines(output, text);
            output.push_str("</a>");
        }
        Inline::Image { alt, url, title } => {
            output.push_str("<img src=\"");
            escape_attr(output, url);
            output.push_str("\" alt=\"");
            escape_attr(output, alt);
            output.push('"');
            if let Some(t) = title {
                output.push_str(" title=\"");
                escape_attr(output, t);
                output.push('"');
            }
            output.push_str(" />");
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
    }
}

fn escape_html(output: &mut String, text: &str) {
    for ch in text.chars() {
        match ch {
            '&' => output.push_str("&amp;"),
            '<' => output.push_str("&lt;"),
            '>' => output.push_str("&gt;"),
            '"' => output.push_str("&quot;"),
            _ => output.push(ch),
        }
    }
}

fn escape_attr(output: &mut String, text: &str) {
    for ch in text.chars() {
        match ch {
            '&' => output.push_str("&amp;"),
            '"' => output.push_str("&quot;"),
            '\'' => output.push_str("&#x27;"),
            _ => output.push(ch),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_heading() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Heading {
                level: 1,
                text: vec![Inline::Text("Hello".to_string())],
            }],
        };
        assert_eq!(render(&doc).trim(), r#"<h1 id="hello">Hello</h1>"#);
    }

    #[test]
    fn test_render_heading_with_id() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Heading {
                level: 1,
                text: vec![Inline::Text("Hello World".to_string())],
            }],
        };
        assert_eq!(
            render(&doc).trim(),
            r#"<h1 id="hello-world">Hello World</h1>"#
        );
    }

    #[test]
    fn test_render_paragraph() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Paragraph {
                text: vec![Inline::Text("Hello world".to_string())],
            }],
        };
        assert_eq!(render(&doc).trim(), "<p>Hello world</p>");
    }

    #[test]
    fn test_render_bold_italic() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Paragraph {
                text: vec![
                    Inline::Strong(vec![Inline::Text("bold".to_string())]),
                    Inline::Text(" ".to_string()),
                    Inline::Emphasis(vec![Inline::Text("italic".to_string())]),
                ],
            }],
        };
        assert_eq!(
            render(&doc).trim(),
            "<p><strong>bold</strong> <em>italic</em></p>"
        );
    }

    #[test]
    fn test_render_code_block() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::CodeBlock {
                language: Some("rust".to_string()),
                content: "fn main() {}".to_string(),
            }],
        };
        assert_eq!(
            render(&doc).trim(),
            r#"<pre><code class="language-rust">fn main() {}</code></pre>"#
        );
    }

    #[test]
    fn test_render_list() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::List {
                ordered: false,
                start: None,
                items: vec![
                    ListItem {
                        blocks: vec![Block::Paragraph {
                            text: vec![Inline::Text("one".to_string())],
                        }],
                        task: None,
                    },
                    ListItem {
                        blocks: vec![Block::Paragraph {
                            text: vec![Inline::Text("two".to_string())],
                        }],
                        task: None,
                    },
                ],
            }],
        };
        let rendered = render(&doc);
        let html = rendered.trim();
        assert!(html.starts_with("<ul>"));
        assert!(html.contains("<li><p>one</p></li>"));
        assert!(html.contains("<li><p>two</p></li>"));
        assert!(html.ends_with("</ul>"));
    }

    #[test]
    fn test_render_task_list() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::List {
                ordered: false,
                start: None,
                items: vec![
                    ListItem {
                        blocks: vec![Block::Paragraph {
                            text: vec![Inline::Text("Done".to_string())],
                        }],
                        task: Some(true),
                    },
                    ListItem {
                        blocks: vec![Block::Paragraph {
                            text: vec![Inline::Text("Todo".to_string())],
                        }],
                        task: Some(false),
                    },
                ],
            }],
        };
        let rendered = render(&doc);
        let html = rendered.trim();
        assert!(html.contains(r#"<li class="task-list-item"><p><input type="checkbox" disabled checked> Done</p></li>"#));
        assert!(html.contains(r#"<li class="task-list-item"><p><input type="checkbox" disabled> Todo</p></li>"#));
    }

    #[test]
    fn test_render_link() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Paragraph {
                text: vec![Inline::Link {
                    text: vec![Inline::Text("text".to_string())],
                    url: "https://example.com".to_string(),
                    title: Some("title".to_string()),
                }],
            }],
        };
        assert_eq!(
            render(&doc).trim(),
            r#"<p><a href="https://example.com" title="title">text</a></p>"#
        );
    }

    #[test]
    fn test_render_image() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Paragraph {
                text: vec![Inline::Image {
                    alt: "alt".to_string(),
                    url: "https://example.com/img.png".to_string(),
                    title: Some("title".to_string()),
                }],
            }],
        };
        assert_eq!(
            render(&doc).trim(),
            r#"<p><img src="https://example.com/img.png" alt="alt" title="title" /></p>"#
        );
    }

    #[test]
    fn test_render_table() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Table {
                header: vec![
                    TableCell {
                        text: vec![Inline::Text("a".to_string())],
                        alignment: None,
                    },
                    TableCell {
                        text: vec![Inline::Text("b".to_string())],
                        alignment: None,
                    },
                ],
                rows: vec![vec![
                    TableCell {
                        text: vec![Inline::Text("c".to_string())],
                        alignment: None,
                    },
                    TableCell {
                        text: vec![Inline::Text("d".to_string())],
                        alignment: None,
                    },
                ]],
            }],
        };
        let rendered = render(&doc);
        let html = rendered.trim();
        assert!(html.contains("<th") && html.contains(">a</th>"));
        assert!(html.contains("<td") && html.contains(">c</td>"));
        assert!(html.contains("border-collapse:collapse"));
    }

    #[test]
    fn test_render_blockquote() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::BlockQuote {
                blocks: vec![Block::Paragraph {
                    text: vec![Inline::Text("quote".to_string())],
                }],
            }],
        };
        let rendered = render(&doc);
        let html = rendered.trim();
        assert_eq!(html, "<blockquote>\n<p>quote</p>\n</blockquote>");
    }

    #[test]
    fn test_render_thematic_break() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::ThematicBreak],
        };
        assert_eq!(render(&doc).trim(), "<hr />");
    }

    #[test]
    fn test_escape_html() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![Block::Paragraph {
                text: vec![Inline::Text("<script>".to_string())],
            }],
        };
        assert_eq!(render(&doc).trim(), "<p>&lt;script&gt;</p>");
    }
}
