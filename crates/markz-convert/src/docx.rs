use markz_core::ast::{Document, Block, Inline};
use crate::context::{ConvertContext, resolve_image_bytes};
use docx_rs::*;
use std::io::Cursor;

#[derive(Debug, thiserror::Error)]
pub enum ConvertDocxError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("DOCX error: {0}")]
    Docx(#[from] docx_rs::DocxError),
    #[error("{0}")]
    Other(String),
}

const BULLET_ABSTRACT_NUM_ID: usize = 1;
const BULLET_NUM_ID: usize = 1;
const ORDERED_ABSTRACT_NUM_ID: usize = 2;
const ORDERED_NUM_ID: usize = 2;

/// Max image width in EMUs: 6 inches at 914400 EMUs/inch
const MAX_IMAGE_WIDTH_EMU: u64 = 6 * 914400;
/// EMUs per pixel at 96 DPI
const EMU_PER_PX: u64 = 9525;

/// Convert a MarkZ AST Document into a DOCX file as a byte vector.
/// Local images are embedded; remote images become hyperlink text.
pub fn convert(document: &Document, ctx: &ConvertContext) -> Result<Vec<u8>, ConvertDocxError> {
    let mut docx = Docx::new()
        .add_abstract_numbering(
            AbstractNumbering::new(BULLET_ABSTRACT_NUM_ID)
                .add_level(
                    Level::new(
                        0,
                        Start::new(1),
                        NumberFormat::new("bullet"),
                        LevelText::new("\u{2022}"),
                        LevelJc::new("left"),
                    )
                    .indent(Some(720), Some(SpecialIndentType::Hanging(360)), None, None),
                )
                .add_level(
                    Level::new(
                        1,
                        Start::new(1),
                        NumberFormat::new("bullet"),
                        LevelText::new("\u{25E6}"),
                        LevelJc::new("left"),
                    )
                    .indent(Some(1440), Some(SpecialIndentType::Hanging(360)), None, None),
                )
                .add_level(
                    Level::new(
                        2,
                        Start::new(1),
                        NumberFormat::new("bullet"),
                        LevelText::new("\u{25AA}"),
                        LevelJc::new("left"),
                    )
                    .indent(Some(2160), Some(SpecialIndentType::Hanging(360)), None, None),
                ),
        )
        .add_numbering(Numbering::new(BULLET_NUM_ID, BULLET_ABSTRACT_NUM_ID))
        .add_abstract_numbering(
            AbstractNumbering::new(ORDERED_ABSTRACT_NUM_ID)
                .add_level(
                    Level::new(
                        0,
                        Start::new(1),
                        NumberFormat::new("decimal"),
                        LevelText::new("%1."),
                        LevelJc::new("left"),
                    )
                    .indent(Some(720), Some(SpecialIndentType::Hanging(360)), None, None),
                )
                .add_level(
                    Level::new(
                        1,
                        Start::new(1),
                        NumberFormat::new("decimal"),
                        LevelText::new("%1.%2."),
                        LevelJc::new("left"),
                    )
                    .indent(Some(1440), Some(SpecialIndentType::Hanging(360)), None, None),
                )
                .add_level(
                    Level::new(
                        2,
                        Start::new(1),
                        NumberFormat::new("decimal"),
                        LevelText::new("%1.%2.%3."),
                        LevelJc::new("left"),
                    )
                    .indent(Some(2160), Some(SpecialIndentType::Hanging(360)), None, None),
                ),
        )
        .add_numbering(Numbering::new(ORDERED_NUM_ID, ORDERED_ABSTRACT_NUM_ID));

    for block in &document.blocks {
        docx = append_block(docx, block, ctx, 0)?;
    }

    let mut buf = Cursor::new(Vec::new());
    docx.build().pack(&mut buf).map_err(|e| ConvertDocxError::Other(e.to_string()))?;
    Ok(buf.into_inner())
}

/// Compute scaled image dimensions in EMUs, fitting within the page width.
fn scaled_image_size(bytes: &[u8]) -> Option<(u32, u32)> {
    use image::ImageReader;

    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .ok()?;
    let (width_px, height_px) = reader.into_dimensions().ok()?;

    let width_emu = (width_px as u64) * EMU_PER_PX;
    let height_emu = (height_px as u64) * EMU_PER_PX;

    if width_emu > MAX_IMAGE_WIDTH_EMU {
        let scale = MAX_IMAGE_WIDTH_EMU as f64 / width_emu as f64;
        let new_width = (width_emu as f64 * scale) as u32;
        let new_height = (height_emu as f64 * scale) as u32;
        Some((new_width, new_height))
    } else {
        Some((width_emu as u32, height_emu as u32))
    }
}

/// Create a styled image Pic that fits the page.
fn create_pic(bytes: &[u8]) -> Pic {
    if let Some((w, h)) = scaled_image_size(bytes) {
        Pic::new(bytes).size(w, h)
    } else {
        Pic::new(bytes)
    }
}

fn append_block(
    docx: Docx,
    block: &Block,
    ctx: &ConvertContext,
    list_depth: usize,
) -> Result<Docx, ConvertDocxError> {
    match block {
        Block::Heading { level, text } => {
            let style = match level {
                1 => "Heading1",
                2 => "Heading2",
                3 => "Heading3",
                4 => "Heading4",
                5 => "Heading5",
                _ => "Heading6",
            };
            let para = inlines_to_paragraph(Paragraph::new().style(style), text, ctx);
            Ok(docx.add_paragraph(para))
        }
        Block::Paragraph { text } => {
            let para = inlines_to_paragraph(Paragraph::new(), text, ctx);
            Ok(docx.add_paragraph(para))
        }
        Block::CodeBlock { language: _, content } => {
            let run = Run::new()
                .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"))
                .shading(Shading::new().shd_type(ShdType::Clear).fill("F2F2F2"))
                .add_text(content);
            Ok(docx.add_paragraph(Paragraph::new().add_run(run)))
        }
        Block::BlockQuote { blocks } => {
            let mut d = docx;
            for b in blocks {
                match b {
                    Block::Paragraph { text } => {
                        let para = inlines_to_paragraph(
                            Paragraph::new().indent(Some(720), None, None, None),
                            text,
                            ctx,
                        );
                        d = d.add_paragraph(para);
                    }
                    _ => {
                        d = append_block(d, b, ctx, list_depth)?;
                    }
                }
            }
            Ok(d)
        }
        Block::List { ordered, items, .. } => {
            let num_id = if *ordered { ORDERED_NUM_ID } else { BULLET_NUM_ID };
            let mut d = docx;
            for item in items {
                for (j, b) in item.blocks.iter().enumerate() {
                    match b {
                        Block::Paragraph { text } if j == 0 => {
                            let mut para = inlines_to_paragraph(Paragraph::new(), text, ctx);
                            if let Some(checked) = item.task {
                                let prefix = if checked { "[x] " } else { "[ ] " };
                                para = Paragraph::new()
                                    .numbering(NumberingId::new(num_id), IndentLevel::new(list_depth.min(2)))
                                    .add_run(Run::new().add_text(prefix))
                                    .add_run(extract_first_run(&para).unwrap_or(Run::new()));
                            } else {
                                para = para.numbering(NumberingId::new(num_id), IndentLevel::new(list_depth.min(2)));
                            }
                            d = d.add_paragraph(para);
                        }
                        Block::List { .. } => {
                            d = append_block(d, b, ctx, list_depth + 1)?;
                        }
                        _ => {
                            d = append_block(d, b, ctx, list_depth)?;
                        }
                    }
                }
            }
            Ok(d)
        }
        Block::Table { header, rows } => {
            let mut table_rows: Vec<TableRow> = Vec::new();

            let header_cells: Vec<docx_rs::TableCell> = header
                .iter()
                .map(|cell| {
                    inlines_to_paragraph(Paragraph::new(), &cell.text, ctx)
                        .add_run(Run::new().add_text("").bold())
                })
                .map(|para| {
                    docx_rs::TableCell::new()
                        .add_paragraph(para)
                        .shading(Shading::new().shd_type(ShdType::Clear).fill("E8E8E8"))
                })
                .collect();
            table_rows.push(TableRow::new(header_cells));

            for row in rows {
                let cells: Vec<docx_rs::TableCell> = row
                    .iter()
                    .map(|cell| {
                        let para = inlines_to_paragraph(Paragraph::new(), &cell.text, ctx);
                        docx_rs::TableCell::new().add_paragraph(para)
                    })
                    .collect();
                table_rows.push(TableRow::new(cells));
            }

            let borders = TableBorders::new()
                .set(TableBorder::new(TableBorderPosition::Top).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::Bottom).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::Left).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::Right).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::InsideH).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::InsideV).size(4).color("CCCCCC"));

            Ok(docx.add_table(Table::new(table_rows).set_borders(borders)))
        }
        Block::ThematicBreak => {
            Ok(docx.add_paragraph(Paragraph::new().add_run(Run::new().add_break(BreakType::Page))))
        }
        Block::RawHtml(html) => {
            Ok(docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(html))))
        }
    }
}

/// Extract the first run from a paragraph (helper for list item prefix injection).
fn extract_first_run(para: &Paragraph) -> Option<Run> {
    para.children.first().and_then(|child| {
        if let ParagraphChild::Run(run) = child {
            Some((**run).clone())
        } else {
            None
        }
    })
}

/// Convert a slice of Inline elements into a Paragraph with styled runs.
fn inlines_to_paragraph(para: Paragraph, inlines: &[Inline], ctx: &ConvertContext) -> Paragraph {
    let mut paragraph = para;
    for inline in inlines {
        paragraph = append_inline_to_paragraph(paragraph, inline, ctx, false, false, false);
    }
    paragraph
}

fn apply_style(run: Run, bold: bool, italic: bool, strike: bool) -> Run {
    let mut r = run;
    if bold { r = r.bold(); }
    if italic { r = r.italic(); }
    if strike { r = r.strike(); }
    r
}

fn append_inline_to_paragraph(
    para: Paragraph,
    inline: &Inline,
    ctx: &ConvertContext,
    bold: bool,
    italic: bool,
    strike: bool,
) -> Paragraph {
    match inline {
        Inline::Text(text) => {
            para.add_run(apply_style(Run::new().add_text(text), bold, italic, strike))
        }
        Inline::Code(code) => {
            para.add_run(
                Run::new()
                    .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"))
                    .shading(Shading::new().shd_type(ShdType::Clear).fill("F2F2F2"))
                    .add_text(code),
            )
        }
        Inline::Emphasis(inner) => {
            let mut p = para;
            for i in inner {
                p = append_inline_to_paragraph(p, i, ctx, bold, true, strike);
            }
            p
        }
        Inline::Strong(inner) => {
            let mut p = para;
            for i in inner {
                p = append_inline_to_paragraph(p, i, ctx, true, italic, strike);
            }
            p
        }
        Inline::Strikethrough(inner) => {
            let mut p = para;
            for i in inner {
                p = append_inline_to_paragraph(p, i, ctx, bold, italic, true);
            }
            p
        }
        Inline::Link { text, url, .. } => {
            let link_text = extract_plain_text(text);
            let hyperlink = Hyperlink::new(url, HyperlinkType::External)
                .add_run(apply_style(Run::new().add_text(link_text).color("0563C1").underline("single"), bold, italic, strike));
            para.add_hyperlink(hyperlink)
        }
        Inline::Image { alt, url, .. } => {
            if let Some(bytes) = resolve_image_bytes(url, ctx) {
                if !bytes.is_empty() {
                    let pic = create_pic(&bytes);
                    return para.add_run(apply_style(Run::new().add_image(pic), bold, italic, strike));
                }
            }
            para.add_run(apply_style(Run::new().add_text(format!("[{}]", alt)), bold, italic, strike))
        }
        Inline::HardBreak | Inline::SoftBreak => {
            para.add_run(apply_style(Run::new().add_break(BreakType::TextWrapping), bold, italic, strike))
        }
        Inline::Html(html) => {
            para.add_run(apply_style(Run::new().add_text(html), bold, italic, strike))
        }
    }
}

fn extract_plain_text(inlines: &[Inline]) -> String {
    let mut result = String::new();
    for inline in inlines {
        match inline {
            Inline::Text(text) => result.push_str(text),
            Inline::Code(code) => result.push_str(code),
            Inline::Emphasis(inner) | Inline::Strong(inner) | Inline::Strikethrough(inner) => {
                result.push_str(&extract_plain_text(inner));
            }
            Inline::Link { text, .. } => result.push_str(&extract_plain_text(text)),
            Inline::Image { alt, .. } => result.push_str(alt),
            Inline::HardBreak | Inline::SoftBreak => result.push(' '),
            Inline::Html(html) => result.push_str(html),
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use markz_core::ast::{Block, Inline, ListItem, TableCell as AstTableCell};
    #[allow(unused_imports)]

    fn doc_with_blocks(blocks: Vec<Block>) -> Document {
        Document {
            frontmatter: None,
            blocks,
        }
    }

    #[test]
    fn test_heading_and_paragraph() {
        let doc = doc_with_blocks(vec![
            Block::Heading { level: 1, text: vec![Inline::Text("Title".to_string())] },
            Block::Paragraph { text: vec![Inline::Text("Hello world".to_string())] },
        ]);
        let ctx = ConvertContext::default();
        let result = convert(&doc, &ctx);
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(!bytes.is_empty());
    }

    #[test]
    fn test_bold_italic_code() {
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
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_strikethrough() {
        let doc = doc_with_blocks(vec![Block::Paragraph {
            text: vec![
                Inline::Strikethrough(vec![Inline::Text("deleted".to_string())]),
            ],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_list_and_table() {
        let doc = doc_with_blocks(vec![
            Block::List {
                ordered: false, start: None,
                items: vec![ListItem { blocks: vec![Block::Paragraph { text: vec![Inline::Text("item".to_string())] }], task: None }],
            },
            Block::Table {
                header: vec![AstTableCell { text: vec![Inline::Text("A".to_string())], alignment: None }],
                rows: vec![vec![AstTableCell { text: vec![Inline::Text("b".to_string())], alignment: None }]],
            },
        ]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock { language: Some("rust".to_string()), content: "fn main() {}".to_string() }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }
}
