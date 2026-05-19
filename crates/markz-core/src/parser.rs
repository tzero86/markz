use crate::ast::*;
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};

/// Preprocess math expressions before Markdown parsing.
pub fn preprocess_math(text: &str) -> String {
    let mut result = String::new();
    let mut lines = text.lines().peekable();
    let mut first = true;

    while let Some(line) = lines.next() {
        if !first {
            result.push('\n');
        }
        first = false;

        let trimmed_start = line.trim_start();
        if trimmed_start.starts_with("$$") {
            // Single-line block?
            if let Some(end_pos) = trimmed_start[2..].find("$$") {
                let after = &trimmed_start[2 + end_pos + 2..];
                if after.trim().is_empty() {
                    let content = &trimmed_start[2..2 + end_pos];
                    result.push_str(&format!(r#"<div class="math-block">{}</div>"#, content));
                    continue;
                }
            }

            // Multi-line block
            let mut block_content = String::new();
            let mut first_content_line = true;
            while let Some(block_line) = lines.next() {
                let block_trimmed = block_line.trim_start();
                if block_trimmed.starts_with("$$") && block_trimmed[2..].trim().is_empty() {
                    break;
                }
                if !first_content_line {
                    block_content.push('\n');
                }
                first_content_line = false;
                block_content.push_str(block_line);
            }
            result.push_str(&format!(r#"<div class="math-block">{}</div>"#, block_content));
            continue;
        }

        result.push_str(&process_inline_math(line));
    }

    if text.ends_with('\n') && !result.ends_with('\n') {
        result.push('\n');
    }

    result
}

fn process_inline_math(line: &str) -> String {
    let mut result = String::new();
    let chars: Vec<(usize, char)> = line.char_indices().collect();
    let mut i = 0;

    while i < chars.len() {
        let (_, ch) = chars[i];
        if ch == '$' {
            // Skip double dollars - should be block math, but if not, treat as literal
            if i + 1 < chars.len() && chars[i + 1].1 == '$' {
                result.push_str("$$");
                i += 2;
                continue;
            }

            // Check no space after opening $
            if i + 1 < chars.len() && chars[i + 1].1 == ' ' {
                result.push('$');
                i += 1;
                continue;
            }

            let start = i + 1;
            let mut j = start;
            let mut found_close = false;

            while j < chars.len() {
                if chars[j].1 == '$' {
                    // Check no space before closing $
                    if j > start && chars[j - 1].1 == ' ' {
                        j += 1;
                        continue;
                    }
                    found_close = true;
                    break;
                }
                j += 1;
            }

            if found_close {
                let content_start = chars[start].0;
                let content_end = chars[j].0;
                let content = &line[content_start..content_end];
                if !content.is_empty() {
                    result.push_str(&format!(r#"<span class="math-inline">{}</span>"#, content));
                    i = j + 1;
                    continue;
                }
            }

            result.push('$');
            i += 1;
        } else {
            result.push(ch);
            i += 1;
        }
    }

    result
}

/// Parse Markdown text into a MarkZ Document AST.
pub fn parse(markdown: &str) -> Document {
    let processed = preprocess_math(markdown);
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_TASKLISTS);
    opts.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(&processed, opts);
    let mut blocks_stack: Vec<Vec<Block>> = vec![Vec::new()];
    let mut inline_stack: Vec<Vec<Inline>> = vec![Vec::new()];
    let mut block_stack: Vec<Block> = Vec::new();
    let mut list_stack: Vec<(bool, Option<u64>, Vec<ListItem>)> = Vec::new();
    let mut in_html_block = false;
    let mut table_alignments: Vec<Option<Alignment>> = Vec::new();
    let mut table_header: Vec<TableCell> = Vec::new();
    let mut table_rows: Vec<Vec<TableCell>> = Vec::new();
    let mut current_table_row: Vec<TableCell> = Vec::new();
    let mut in_table_head = false;
    let mut in_code_block = false;
    let mut code_language: Option<String> = None;
    let mut code_content = String::new();
    let mut link_stack: Vec<(String, Option<String>)> = Vec::new();
    let mut image_stack: Vec<(String, Option<String>)> = Vec::new();
    let mut task_stack: Vec<Option<bool>> = Vec::new();

    fn push_block(blocks_stack: &mut Vec<Vec<Block>>, block: Block) {
        if let Some(top) = blocks_stack.last_mut() {
            top.push(block);
        }
    }

    for event in parser {
        match event {
            Event::Start(tag) => match tag {
                Tag::Paragraph => {}
                Tag::Heading { level, .. } => {
                    inline_stack.push(Vec::new());
                    block_stack.push(Block::Heading {
                        level: level as u8,
                        text: Vec::new(),
                    });
                }
                Tag::CodeBlock(lang) => {
                    in_code_block = true;
                    code_language = match lang {
                        pulldown_cmark::CodeBlockKind::Fenced(lang_str) => {
                            Some(lang_str.to_string())
                        }
                        pulldown_cmark::CodeBlockKind::Indented => None,
                    };
                    code_content.clear();
                }
                Tag::BlockQuote(_) => {
                    blocks_stack.push(Vec::new());
                }
                Tag::List(start) => {
                    list_stack.push((start.is_some(), start, Vec::new()));
                }
                Tag::Item => {
                    blocks_stack.push(Vec::new());
                    inline_stack.push(Vec::new());
                    task_stack.push(None);
                }
                Tag::Emphasis => {
                    inline_stack.push(Vec::new());
                }
                Tag::Strong => {
                    inline_stack.push(Vec::new());
                }
                Tag::Strikethrough => {
                    inline_stack.push(Vec::new());
                }
                Tag::Link {
                    dest_url, title, ..
                } => {
                    inline_stack.push(Vec::new());
                    let title_opt = if title.is_empty() { None } else { Some(title.to_string()) };
                    link_stack.push((dest_url.to_string(), title_opt));
                }
                Tag::Image {
                    dest_url, title, ..
                } => {
                    inline_stack.push(Vec::new());
                    let title_opt = if title.is_empty() { None } else { Some(title.to_string()) };
                    image_stack.push((dest_url.to_string(), title_opt));
                }
                Tag::HtmlBlock => {
                    in_html_block = true;
                }
                Tag::Table(alignments) => {
                    in_table_head = true;
                    table_header.clear();
                    table_rows.clear();
                    table_alignments =
                        alignments.into_iter().map(alignment_from_pulldown).collect();
                    current_table_row.clear();
                }
                Tag::TableHead => {
                    in_table_head = true;
                }
                Tag::TableRow => {
                    current_table_row.clear();
                }
                Tag::TableCell => {
                    inline_stack.push(Vec::new());
                }
                _ => {}
            },
            Event::End(tag_end) => match tag_end {
                TagEnd::Heading(_) => {
                    let text = inline_stack.pop().unwrap_or_default();
                    if let Some(Block::Heading { level, .. }) = block_stack.pop() {
                        push_block(&mut blocks_stack, Block::Heading { level, text });
                    }
                }
                TagEnd::Paragraph => {
                    let text = inline_stack.pop().unwrap_or_default();
                    if !text.is_empty() {
                        push_block(&mut blocks_stack, Block::Paragraph { text });
                    }
                    inline_stack.push(Vec::new());
                }
                TagEnd::CodeBlock => {
                    in_code_block = false;
                    push_block(
                        &mut blocks_stack,
                        Block::CodeBlock {
                            language: code_language.take(),
                            content: std::mem::take(&mut code_content),
                        },
                    );
                }
                TagEnd::BlockQuote(_) => {
                    let inner = blocks_stack.pop().unwrap_or_default();
                    push_block(&mut blocks_stack, Block::BlockQuote { blocks: inner });
                }
                TagEnd::List(_) => {
                    if let Some((ordered, start, items)) = list_stack.pop() {
                        push_block(
                            &mut blocks_stack,
                            Block::List {
                                ordered,
                                start,
                                items,
                            },
                        );
                    }
                }
                TagEnd::Item => {
                    let mut item_blocks = blocks_stack.pop().unwrap_or_default();
                    let text = inline_stack.pop().unwrap_or_default();
                    if !text.is_empty() {
                        item_blocks.insert(0, Block::Paragraph { text });
                    }
                    let task = task_stack.pop().unwrap_or(None);
                    if let Some((_, _, ref mut items)) = list_stack.last_mut() {
                        items.push(ListItem {
                            blocks: item_blocks,
                            task,
                        });
                    }
                }
                TagEnd::Emphasis => {
                    let inner = inline_stack.pop().unwrap_or_default();
                    if let Some(top) = inline_stack.last_mut() {
                        top.push(Inline::Emphasis(inner));
                    }
                }
                TagEnd::Strong => {
                    let inner = inline_stack.pop().unwrap_or_default();
                    if let Some(top) = inline_stack.last_mut() {
                        top.push(Inline::Strong(inner));
                    }
                }
                TagEnd::Strikethrough => {
                    let inner = inline_stack.pop().unwrap_or_default();
                    if let Some(top) = inline_stack.last_mut() {
                        top.push(Inline::Strikethrough(inner));
                    }
                }
                TagEnd::Link => {
                    let text = inline_stack.pop().unwrap_or_default();
                    if let Some((url, title)) = link_stack.pop() {
                        if let Some(top) = inline_stack.last_mut() {
                            top.push(Inline::Link { text, url, title });
                        }
                    }
                }
                TagEnd::Image => {
                    let alt = inline_stack.pop().unwrap_or_default();
                    if let Some((url, title)) = image_stack.pop() {
                        if let Some(top) = inline_stack.last_mut() {
                            let alt_text = alt
                                .into_iter()
                                .map(|i| match i {
                                    Inline::Text(t) => t,
                                    _ => String::new(),
                                })
                                .collect::<Vec<_>>()
                                .join("");
                            top.push(Inline::Image {
                                alt: alt_text,
                                url,
                                title,
                            });
                        }
                    }
                }
                TagEnd::Table => {
                    push_block(
                        &mut blocks_stack,
                        Block::Table {
                            header: std::mem::take(&mut table_header),
                            rows: std::mem::take(&mut table_rows),
                        },
                    );
                }
                TagEnd::TableHead => {
                    in_table_head = false;
                    if !current_table_row.is_empty() {
                        table_header = std::mem::take(&mut current_table_row);
                    }
                }
                TagEnd::TableRow => {
                    if in_table_head {
                        table_header = std::mem::take(&mut current_table_row);
                    } else {
                        table_rows.push(std::mem::take(&mut current_table_row));
                    }
                }
                TagEnd::TableCell => {
                    let text = inline_stack.pop().unwrap_or_default();
                    let alignment = table_alignments
                        .get(current_table_row.len())
                        .cloned()
                        .flatten();
                    current_table_row.push(TableCell { text, alignment });
                }
                TagEnd::HtmlBlock => {
                    in_html_block = false;
                }
                _ => {}
            },
            Event::Text(text) => {
                if in_code_block {
                    code_content.push_str(&text);
                } else if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::Text(text.into_string()));
                }
            }
            Event::Code(code) => {
                if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::Code(code.into_string()));
                }
            }
            Event::Html(html) => {
                if in_html_block {
                    push_block(&mut blocks_stack, Block::RawHtml(html.into_string()));
                } else if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::Html(html.into_string()));
                } else {
                    push_block(&mut blocks_stack, Block::RawHtml(html.into_string()));
                }
            }
            Event::InlineHtml(html) => {
                if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::Html(html.into_string()));
                }
            }
            Event::SoftBreak => {
                if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::SoftBreak);
                }
            }
            Event::HardBreak => {
                if let Some(top) = inline_stack.last_mut() {
                    top.push(Inline::HardBreak);
                }
            }
            Event::Rule => {
                push_block(&mut blocks_stack, Block::ThematicBreak);
            }
            Event::TaskListMarker(checked) => {
                if let Some(top) = task_stack.last_mut() {
                    *top = Some(checked);
                }
            }
            _ => {}
        }
    }

    Document {
        frontmatter: None,
        blocks: blocks_stack.pop().unwrap_or_default(),
    }
}

fn alignment_from_pulldown(a: pulldown_cmark::Alignment) -> Option<Alignment> {
    match a {
        pulldown_cmark::Alignment::Left => Some(Alignment::Left),
        pulldown_cmark::Alignment::Center => Some(Alignment::Center),
        pulldown_cmark::Alignment::Right => Some(Alignment::Right),
        pulldown_cmark::Alignment::None => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_heading() {
        let doc = parse("# Hello");
        assert_eq!(doc.blocks.len(), 1);
        assert!(matches!(doc.blocks[0], Block::Heading { level: 1, .. }));
    }

    #[test]
    fn test_parse_paragraph() {
        let doc = parse("Hello world");
        assert_eq!(doc.blocks.len(), 1);
        assert!(matches!(doc.blocks[0], Block::Paragraph { .. }));
    }

    #[test]
    fn test_parse_bold_italic() {
        let doc = parse("**bold** *italic*");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::Paragraph { text } = &doc.blocks[0] {
            assert!(matches!(&text[0], Inline::Strong(..)));
            assert!(matches!(&text[1], Inline::Text(..)));
            assert!(matches!(&text[2], Inline::Emphasis(..)));
        } else {
            panic!("expected paragraph");
        }
    }

    #[test]
    fn test_parse_code_block() {
        let doc = parse("```rust\nfn main() {}\n```");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::CodeBlock { language, content } = &doc.blocks[0] {
            assert_eq!(language.as_deref(), Some("rust"));
            assert_eq!(content.trim(), "fn main() {}");
        } else {
            panic!("expected code block");
        }
    }

    #[test]
    fn test_parse_list() {
        let doc = parse("- one\n- two");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::List {
            ordered: false,
            items,
            ..
        } = &doc.blocks[0]
        {
            assert_eq!(items.len(), 2);
        } else {
            panic!("expected unordered list");
        }
    }

    #[test]
    fn test_parse_link() {
        let doc = parse("[text](https://example.com \"title\")");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::Paragraph { text } = &doc.blocks[0] {
            if let Inline::Link { url, title, .. } = &text[0] {
                assert_eq!(url, "https://example.com");
                assert_eq!(title.as_deref(), Some("title"));
            } else {
                panic!("expected link, got {:?}", text[0]);
            }
        } else {
            panic!("expected paragraph");
        }
    }

    #[test]
    fn test_parse_image() {
        let doc = parse("![alt](https://example.com/img.png \"title\")");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::Paragraph { text } = &doc.blocks[0] {
            if let Inline::Image { alt, url, title } = &text[0] {
                assert_eq!(alt, "alt");
                assert_eq!(url, "https://example.com/img.png");
                assert_eq!(title.as_deref(), Some("title"));
            } else {
                panic!("expected image, got {:?}", text[0]);
            }
        } else {
            panic!("expected paragraph");
        }
    }

    #[test]
    fn test_parse_table() {
        let doc = parse("| a | b |\n|---|---|\n| c | d |");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::Table { header, rows } = &doc.blocks[0] {
            assert_eq!(header.len(), 2);
            assert_eq!(rows.len(), 1);
            assert_eq!(rows[0].len(), 2);
        } else {
            panic!("expected table");
        }
    }

    #[test]
    fn test_parse_blockquote() {
        let doc = parse("> quote");
        assert_eq!(doc.blocks.len(), 1);
        assert!(matches!(doc.blocks[0], Block::BlockQuote { .. }));
        if let Block::BlockQuote { blocks } = &doc.blocks[0] {
            assert_eq!(blocks.len(), 1);
            assert!(matches!(blocks[0], Block::Paragraph { .. }));
        }
    }

    #[test]
    fn test_parse_task_list() {
        let doc = parse("- [x] done\n- [ ] todo");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::List { items, .. } = &doc.blocks[0] {
            assert_eq!(items[0].task, Some(true));
            assert_eq!(items[1].task, Some(false));
        } else {
            panic!("expected list");
        }
    }

    #[test]
    fn test_parse_tight_list_multiple_items() {
        let doc = parse("- one\n- two\n- three");
        assert_eq!(doc.blocks.len(), 1);
        if let Block::List { items, .. } = &doc.blocks[0] {
            assert_eq!(items.len(), 3);
            for (i, expected) in ["one", "two", "three"].iter().enumerate() {
                assert_eq!(
                    items[i].blocks[0],
                    Block::Paragraph {
                        text: vec![Inline::Text(expected.to_string())],
                    }
                );
            }
        } else {
            panic!("expected list");
        }
    }

    #[test]
    fn test_preprocess_math_block_single_line() {
        let result = preprocess_math("$$x = 1$$");
        assert_eq!(result, r#"<div class="math-block">x = 1</div>"#);
    }

    #[test]
    fn test_preprocess_math_block_multiline() {
        let input = "$$\nx = 1\ny = 2\n$$";
        let result = preprocess_math(input);
        assert_eq!(result, r#"<div class="math-block">x = 1
y = 2</div>"#);
    }

    #[test]
    fn test_preprocess_math_inline() {
        let result = preprocess_math("The value is $x = 1$ here");
        assert_eq!(
            result,
            r#"The value is <span class="math-inline">x = 1</span> here"#
        );
    }

    #[test]
    fn test_preprocess_math_inline_ignores_space_after_open() {
        let result = preprocess_math("$ x = 1$");
        assert_eq!(result, "$ x = 1$");
    }

    #[test]
    fn test_preprocess_math_inline_ignores_space_before_close() {
        let result = preprocess_math("$x = 1 $");
        assert_eq!(result, "$x = 1 $");
    }

    #[test]
    fn test_preprocess_math_no_false_positive_price() {
        let result = preprocess_math("The price is $5.");
        assert_eq!(result, "The price is $5.");
    }

    #[test]
    fn test_preprocess_math_preserves_emojis() {
        let result = preprocess_math("Rocket 🚀 and math $x = 1$ together");
        assert!(result.contains("🚀"), "emoji should be preserved: {}", result);
        assert!(result.contains(r#"<span class="math-inline">x = 1</span>"#));
    }

    #[test]
    fn test_preprocess_math_preserves_unicode() {
        let result = preprocess_math("Café résumé naïve $α + β$");
        assert!(result.contains("Café résumé naïve"), "unicode text should be preserved: {}", result);
        assert!(result.contains(r#"<span class="math-inline">α + β</span>"#));
    }

    #[test]
    fn test_parse_math_block_html_output() {
        let input = "$$\nE = mc^2\n$$";
        let doc = parse(input);
        let html = crate::html::render(&doc);
        assert!(html.contains(r#"<div class="math-block">E = mc^2</div>"#));
        // Must be a block-level RawHtml, not wrapped in a paragraph
        assert!(!html.contains("<p><div class=\"math-block\">"));
    }

    #[test]
    fn test_parse_html_details_block() {
        let input = "<details>\n<summary>Click</summary>\nHidden\n</details>";
        let doc = parse(input);
        let html = crate::html::render(&doc);
        assert!(html.contains("<details>"));
        assert!(html.contains("</details>"));
        // Must be block-level, not wrapped in <p>
        assert!(!html.contains("<p><details>"));
    }

    #[test]
    fn test_parse_math_block_ast_is_raw_html() {
        let input = "$$\nE = mc^2\n$$";
        let doc = parse(input);
        assert_eq!(doc.blocks.len(), 1);
        assert!(matches!(&doc.blocks[0], Block::RawHtml(html) if html.contains("math-block")));
    }

    #[test]
    fn test_parse_details_block_ast_is_raw_html() {
        let input = "<details>\n<summary>Click</summary>\nHidden\n</details>";
        let doc = parse(input);
        // pulldown-cmark emits each line of an HTML block as a separate Event::Html,
        // so we get one Block::RawHtml per line.
        assert_eq!(doc.blocks.len(), 4);
        for block in &doc.blocks {
            assert!(matches!(block, Block::RawHtml(..)));
        }
        let combined: String = doc.blocks.iter().map(|b| match b {
            Block::RawHtml(h) => h.as_str(),
            _ => "",
        }).collect();
        assert!(combined.contains("<details>"));
        assert!(combined.contains("</details>"));
    }

    #[test]
    fn test_parse_nested_list_preserves_parent_text() {
        let input = "- parent\n  - child\n  - another child";
        let doc = parse(input);
        let html = crate::html::render(&doc);
        // Parent text must appear before the nested <ul>
        assert!(html.contains("<li><p>parent</p><ul>"), "parent text missing: {}", html);
        assert!(html.contains("<li><p>child</p></li>"));
        assert!(html.contains("<li><p>another child</p></li>"));
    }

    #[test]
    fn test_parse_nested_task_list_preserves_parent_checkbox() {
        let input = "- [x] parent\n  - [ ] child\n  - normal nested";
        let doc = parse(input);
        let html = crate::html::render(&doc);
        // Parent must keep its checked checkbox
        assert!(
            html.contains(r#"<li class="task-list-item"><p><input type="checkbox" disabled checked> parent</p>"#),
            "parent task checkbox missing: {}", html
        );
        // Child must have its unchecked checkbox
        assert!(
            html.contains(r#"<li class="task-list-item"><p><input type="checkbox" disabled> child</p>"#),
            "child task checkbox missing: {}", html
        );
        // Normal nested item must not have a checkbox
        assert!(
            html.contains("<li><p>normal nested</p></li>"),
            "normal nested item broken: {}", html
        );
    }
}
