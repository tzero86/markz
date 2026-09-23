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

// --- Style builders --------------------------------------------------------

fn normal_style() -> Style {
    Style::new("Normal", StyleType::Paragraph)
        .name("Normal")
        .size(22)
        .fonts(
            RunFonts::new()
                .ascii("Calibri")
                .hi_ansi("Calibri")
                .east_asia("Calibri")
                .cs("Times New Roman"),
        )
        .line_spacing(
            LineSpacing::new()
                .after(120)
                .line(276)
                .line_rule(LineSpacingType::Auto),
        )
}

fn heading_style(level: usize, size: usize, before: u32, after: u32) -> Style {
    let id = format!("Heading{}", level);
    let color = if level <= 3 { "2B579A" } else { "1F1F1F" };
    let mut s = Style::new(&id, StyleType::Paragraph)
        .name(&id)
        .size(size)
        .bold()
        .color(color)
        .outline_lvl(level - 1)
        .line_spacing(
            LineSpacing::new()
                .before(before)
                .after(after)
                .line(276)
                .line_rule(LineSpacingType::Auto),
        );
    if level == 6 {
        s = s.italic();
    }
    s
}

fn code_block_style() -> Style {
    let mut s = Style::new("CodeBlock", StyleType::Paragraph)
        .name("Code Block")
        .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"))
        .line_spacing(
            LineSpacing::new()
                .before(120)
                .after(120)
                .line(240)
                .line_rule(LineSpacingType::Auto),
        );
    s.paragraph_property = s.paragraph_property.shading(
        Shading::new().shd_type(ShdType::Clear).fill("F5F5F5"),
    );
    s
}

fn blockquote_style() -> Style {
    let mut s = Style::new("BlockQuote", StyleType::Paragraph)
        .name("Block Quote")
        .indent(Some(720), None, None, None)
        .line_spacing(
            LineSpacing::new()
                .before(60)
                .after(60)
                .line(276)
                .line_rule(LineSpacingType::Auto),
        );
    s.paragraph_property = s.paragraph_property.shading(
        Shading::new().shd_type(ShdType::Clear).fill("FAFAFA"),
    );
    s.paragraph_property = s.paragraph_property.set_borders(
        ParagraphBorders::new().set(
            ParagraphBorder::new(ParagraphBorderPosition::Left)
                .size(12)
                .space(4)
                .color("E0E0E0"),
        ),
    );
    s
}

fn table_header_style() -> Style {
    Style::new("TableHeader", StyleType::Paragraph)
        .name("Table Header")
        .bold()
}

// --- Main converter --------------------------------------------------------

/// Convert a MarkZ AST Document into a DOCX file as a byte vector.
///
/// Local images inside the document directory are embedded; remote images and images that cannot
/// be read or decoded fall back to their alt text. Returns the packed bytes together with one
/// warning line per image reference that was not embedded.
pub fn convert(
    document: &Document,
    ctx: &ConvertContext,
) -> Result<(Vec<u8>, Vec<String>), ConvertDocxError> {
    let mut docx = Docx::new()
        .page_margin(
            PageMargin::new()
                .top(1440)
                .right(1440)
                .bottom(1440)
                .left(1440)
                .header(720)
                .footer(720),
        )
        .add_style(normal_style())
        .add_style(heading_style(1, 48, 240, 120))
        .add_style(heading_style(2, 40, 200, 100))
        .add_style(heading_style(3, 32, 160, 80))
        .add_style(heading_style(4, 28, 120, 60))
        .add_style(heading_style(5, 24, 100, 60))
        .add_style(heading_style(6, 22, 80, 40))
        .add_style(code_block_style())
        .add_style(blockquote_style())
        .add_style(table_header_style())
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

    let mut warnings = Vec::new();
    for block in &document.blocks {
        docx = append_block(docx, block, ctx, 0, &mut warnings)?;
    }

    let mut buf = Cursor::new(Vec::new());
    docx.build()
        .pack(&mut buf)
        .map_err(|e| ConvertDocxError::Other(e.to_string()))?;
    Ok((buf.into_inner(), warnings))
}

// --- Image helpers ---------------------------------------------------------

/// Scale image pixel dimensions to EMUs, fitting within the page width.
fn scaled_image_size(width_px: u32, height_px: u32) -> (u32, u32) {
    let width_emu = (width_px as u64) * EMU_PER_PX;
    let height_emu = (height_px as u64) * EMU_PER_PX;

    if width_emu > MAX_IMAGE_WIDTH_EMU {
        let scale = MAX_IMAGE_WIDTH_EMU as f64 / width_emu as f64;
        (
            (width_emu as f64 * scale) as u32,
            (height_emu as f64 * scale) as u32,
        )
    } else {
        (width_emu as u32, height_emu as u32)
    }
}

/// Reason recorded when the `image` crate cannot decode local or downloaded bytes.
const UNSUPPORTED_IMAGE: &str = "unsupported image format";

/// Decode `bytes` and build a page-fitted [`Pic`], or return the reason it cannot be embedded.
///
/// docx-rs's `Pic::new` panics when the `image` crate cannot decode the bytes (SVG, WebP, …), so
/// the decode happens here and the pixels are re-encoded as PNG for `Pic::new_with_dimensions`.
fn render_pic(bytes: &[u8]) -> Result<Pic, &'static str> {
    use image::{GenericImageView, ImageFormat, ImageReader};

    let image = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|_| UNSUPPORTED_IMAGE)?
        .decode()
        .map_err(|_| UNSUPPORTED_IMAGE)?;
    let (width_px, height_px) = image.dimensions();

    let mut png = Cursor::new(Vec::new());
    image
        .write_to(&mut png, ImageFormat::Png)
        .map_err(|_| "could not be re-encoded as PNG")?;

    // `new_with_dimensions` sizes from pixels; override with the page-fitted EMU dimensions.
    let (width_emu, height_emu) = scaled_image_size(width_px, height_px);
    Ok(Pic::new_with_dimensions(png.into_inner(), width_px, height_px).size(width_emu, height_emu))
}

// --- Block appenders -------------------------------------------------------

fn append_block(
    docx: Docx,
    block: &Block,
    ctx: &ConvertContext,
    list_depth: usize,
    warnings: &mut Vec<String>,
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
            let para = inlines_to_paragraph(Paragraph::new().style(style), text, ctx, warnings);
            Ok(docx.add_paragraph(para))
        }
        Block::Paragraph { text } => {
            let para = inlines_to_paragraph(
                Paragraph::new()
                    .style("Normal")
                    .line_spacing(LineSpacing::new().after(120)),
                text,
                ctx,
                warnings,
            );
            Ok(docx.add_paragraph(para))
        }
        Block::CodeBlock { language: _, content } => {
            let run = Run::new()
                .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"))
                .add_text(content);
            Ok(docx.add_paragraph(Paragraph::new().style("CodeBlock").add_run(run)))
        }
        Block::BlockQuote { blocks } => {
            let mut d = docx;
            for b in blocks {
                match b {
                    Block::Paragraph { text } => {
                        let para =
                            inlines_to_paragraph(Paragraph::new().style("BlockQuote"), text, ctx, warnings);
                        d = d.add_paragraph(para);
                    }
                    _ => {
                        d = append_block(d, b, ctx, list_depth, warnings)?;
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
                            let mut para =
                                inlines_to_paragraph(Paragraph::new(), text, ctx, warnings);
                            if let Some(checked) = item.task {
                                let prefix = if checked { "[x] " } else { "[ ] " };
                                para = Paragraph::new()
                                    .numbering(
                                        NumberingId::new(num_id),
                                        IndentLevel::new(list_depth.min(2)),
                                    )
                                    .add_run(Run::new().add_text(prefix))
                                    .add_run(extract_first_run(&para).unwrap_or(Run::new()));
                            } else {
                                para = para.numbering(
                                    NumberingId::new(num_id),
                                    IndentLevel::new(list_depth.min(2)),
                                );
                            }
                            d = d.add_paragraph(para);
                        }
                        Block::List { .. } => {
                            d = append_block(d, b, ctx, list_depth + 1, warnings)?;
                        }
                        _ => {
                            d = append_block(d, b, ctx, list_depth, warnings)?;
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
                    inlines_to_paragraph(
                        Paragraph::new().style("TableHeader"),
                        &cell.text,
                        ctx,
                        warnings,
                    )
                })
                .map(|para| {
                    docx_rs::TableCell::new()
                        .vertical_align(VAlignType::Center)
                        .add_paragraph(para)
                        .shading(Shading::new().shd_type(ShdType::Clear).fill("E8E8E8"))
                })
                .collect();
            table_rows.push(TableRow::new(header_cells));

            for row in rows {
                let cells: Vec<docx_rs::TableCell> = row
                    .iter()
                    .map(|cell| {
                        let para = inlines_to_paragraph(Paragraph::new(), &cell.text, ctx, warnings);
                        docx_rs::TableCell::new()
                            .vertical_align(VAlignType::Center)
                            .add_paragraph(para)
                    })
                    .collect();
                table_rows.push(TableRow::new(cells));
            }

            let borders = TableBorders::new()
                .set(TableBorder::new(TableBorderPosition::Top).size(6).color("AAAAAA"))
                .set(TableBorder::new(TableBorderPosition::Bottom).size(6).color("AAAAAA"))
                .set(TableBorder::new(TableBorderPosition::Left).size(6).color("AAAAAA"))
                .set(TableBorder::new(TableBorderPosition::Right).size(6).color("AAAAAA"))
                .set(TableBorder::new(TableBorderPosition::InsideH).size(4).color("CCCCCC"))
                .set(TableBorder::new(TableBorderPosition::InsideV).size(4).color("CCCCCC"));

            Ok(docx.add_table(Table::new(table_rows).set_borders(borders)))
        }
        Block::ThematicBreak => {
            let mut hr = Paragraph::new();
            hr.property = hr.property.set_borders(
                ParagraphBorders::with_empty().set(
                    ParagraphBorder::new(ParagraphBorderPosition::Bottom)
                        .size(12)
                        .space(1)
                        .color("999999"),
                ),
            );
            hr = hr.add_run(Run::new().add_text("\u{00A0}"));
            Ok(docx.add_paragraph(hr))
        }
        Block::RawHtml(html) => {
            let text = strip_html_tags(html);
            Ok(docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(text))))
        }
        Block::FootnoteDefinition { blocks, .. } => {
            let mut d = docx;
            for b in blocks {
                d = append_block(d, b, ctx, list_depth, warnings)?;
            }
            Ok(d)
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
fn inlines_to_paragraph(
    para: Paragraph,
    inlines: &[Inline],
    ctx: &ConvertContext,
    warnings: &mut Vec<String>,
) -> Paragraph {
    let mut paragraph = para;
    for inline in inlines {
        paragraph =
            append_inline_to_paragraph(paragraph, inline, ctx, false, false, false, warnings);
    }
    paragraph
}

fn apply_style(run: Run, bold: bool, italic: bool, strike: bool) -> Run {
    let mut r = run;
    if bold {
        r = r.bold();
    }
    if italic {
        r = r.italic();
    }
    if strike {
        r = r.strike();
    }
    r
}

fn append_inline_to_paragraph(
    para: Paragraph,
    inline: &Inline,
    ctx: &ConvertContext,
    bold: bool,
    italic: bool,
    strike: bool,
    warnings: &mut Vec<String>,
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
                p = append_inline_to_paragraph(p, i, ctx, bold, true, strike, warnings);
            }
            p
        }
        Inline::Strong(inner) => {
            let mut p = para;
            for i in inner {
                p = append_inline_to_paragraph(p, i, ctx, true, italic, strike, warnings);
            }
            p
        }
        Inline::Strikethrough(inner) => {
            let mut p = para;
            for i in inner {
                p = append_inline_to_paragraph(p, i, ctx, bold, italic, true, warnings);
            }
            p
        }
        Inline::Link { text, url, .. } => {
            let link_text = extract_plain_text(text);
            let hyperlink = Hyperlink::new(url, HyperlinkType::External).add_run(
                apply_style(
                    Run::new()
                        .add_text(link_text)
                        .color("0563C1")
                        .underline("single"),
                    bold,
                    italic,
                    strike,
                ),
            );
            para.add_hyperlink(hyperlink)
        }
        Inline::Image { alt, url, .. } => {
            match resolve_image_bytes(url, ctx) {
                Ok(bytes) => match render_pic(&bytes) {
                    Ok(pic) => {
                        return para.add_run(apply_style(
                            Run::new().add_image(pic),
                            bold,
                            italic,
                            strike,
                        ));
                    }
                    Err(reason) => warnings.push(format!("{}: {}", url, reason)),
                },
                Err(err) => warnings.push(format!("{}: {}", url, err)),
            }
            para.add_run(apply_style(
                Run::new().add_text(format!("[{}]", alt)),
                bold,
                italic,
                strike,
            ))
        }
        Inline::HardBreak | Inline::SoftBreak => {
            para.add_run(apply_style(
                Run::new().add_break(BreakType::TextWrapping),
                bold,
                italic,
                strike,
            ))
        }
        Inline::Html(html) => {
            para.add_run(apply_style(Run::new().add_text(html), bold, italic, strike))
        }
        Inline::WikiLink { target, display } => {
            para.add_run(apply_style(Run::new().add_text(format!("{} ({})", display, target)), bold, italic, strike))
        }
        Inline::FootnoteReference { label } => {
            para.add_run(apply_style(Run::new().add_text(format!("[^{}]", label)), bold, italic, strike))
        }
    }
}

fn strip_html_tags(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    for ch in html.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(ch);
        }
    }
    result
}

fn extract_plain_text(inlines: &[Inline]) -> String {
    let mut result = String::new();
    for inline in inlines {
        match inline {
            Inline::Text(text) => result.push_str(text),
            Inline::Code(code) => result.push_str(code),
            Inline::Emphasis(inner)
            | Inline::Strong(inner)
            | Inline::Strikethrough(inner) => {
                result.push_str(&extract_plain_text(inner));
            }
            Inline::Link { text, .. } => result.push_str(&extract_plain_text(text)),
            Inline::Image { alt, .. } => result.push_str(alt),
            Inline::HardBreak | Inline::SoftBreak => result.push(' '),
            Inline::Html(html) => result.push_str(html),
            Inline::WikiLink { display, .. } => result.push_str(display),
            Inline::FootnoteReference { label } => result.push_str(&format!("[^{}]", label)),
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::test_util::{png_bytes, TempDir};
    use markz_core::ast::{Block, Inline, ListItem, TableCell as AstTableCell};
    #[allow(unused_imports)]

    fn doc_with_blocks(blocks: Vec<Block>) -> Document {
        Document {
            frontmatter: None,
            blocks,
        }
    }

    fn image_doc(alt: &str, url: &str) -> Document {
        doc_with_blocks(vec![Block::Paragraph {
            text: vec![Inline::Image {
                alt: alt.to_string(),
                url: url.to_string(),
                title: None,
            }],
        }])
    }

    /// The DOCX zip stores entry names uncompressed, so this detects an embedded picture.
    fn has_media(bytes: &[u8]) -> bool {
        bytes.windows(11).any(|w| w == b"word/media/")
    }

    #[test]
    fn test_heading_and_paragraph() {
        let doc = doc_with_blocks(vec![
            Block::Heading {
                level: 1,
                text: vec![Inline::Text("Title".to_string())],
            },
            Block::Paragraph {
                text: vec![Inline::Text("Hello world".to_string())],
            },
        ]);
        let ctx = ConvertContext::default();
        let (bytes, warnings) = convert(&doc, &ctx).expect("clean export");
        assert!(!bytes.is_empty());
        assert!(warnings.is_empty());
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
            text: vec![Inline::Strikethrough(vec![Inline::Text(
                "deleted".to_string(),
            )])],
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_list_and_table() {
        let doc = doc_with_blocks(vec![
            Block::List {
                ordered: false,
                start: None,
                items: vec![ListItem {
                    blocks: vec![Block::Paragraph {
                        text: vec![Inline::Text("item".to_string())],
                    }],
                    task: None,
                }],
            },
            Block::Table {
                header: vec![AstTableCell {
                    text: vec![Inline::Text("A".to_string())],
                    alignment: None,
                }],
                rows: vec![vec![AstTableCell {
                    text: vec![Inline::Text("b".to_string())],
                    alignment: None,
                }]],
            },
        ]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_code_block() {
        let doc = doc_with_blocks(vec![Block::CodeBlock {
            language: Some("rust".to_string()),
            content: "fn main() {}".to_string(),
        }]);
        let ctx = ConvertContext::default();
        assert!(convert(&doc, &ctx).is_ok());
    }

    #[test]
    fn test_thematic_break_not_page_break() {
        let doc = doc_with_blocks(vec![
            Block::Paragraph {
                text: vec![Inline::Text("Before".to_string())],
            },
            Block::ThematicBreak,
            Block::Paragraph {
                text: vec![Inline::Text("After".to_string())],
            },
        ]);
        let ctx = ConvertContext::default();
        let (bytes, _) = convert(&doc, &ctx).expect("clean export");
        assert!(!bytes.is_empty());
    }

    #[test]
    fn test_embedded_png_produces_no_warnings() {
        let dir = TempDir::new("docx-png");
        let ctx = dir.context("docs/readme.md");
        dir.write("docs/assets/pic.png", &png_bytes());

        let (bytes, warnings) = convert(&image_doc("Pic", "assets/pic.png"), &ctx)
            .expect("export succeeds");

        assert!(warnings.is_empty(), "{warnings:?}");
        assert!(has_media(&bytes));
    }

    /// Regression test for the DOCX export crash: docx-rs's `Pic::new` panicked on bytes the
    /// `image` crate cannot decode, aborting the whole export. Demonstrated before the fix by
    /// calling `create_pic` with these SVG bytes: it aborted at docx-rs `pic.rs:58`.
    #[test]
    fn test_svg_image_warns_instead_of_panicking() {
        let dir = TempDir::new("docx-svg");
        let ctx = dir.context("docs/readme.md");
        dir.write(
            "docs/diagram.svg",
            br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>"#,
        );

        let (bytes, warnings) = convert(&image_doc("Diagram", "diagram.svg"), &ctx)
            .expect("export succeeds");

        assert!(!bytes.is_empty());
        assert_eq!(warnings, vec!["diagram.svg: unsupported image format"]);
        assert!(!has_media(&bytes));
    }

    #[test]
    fn test_missing_image_warns_and_export_succeeds() {
        let dir = TempDir::new("docx-missing");
        let ctx = dir.context("docs/readme.md");

        let (bytes, warnings) = convert(&image_doc("Gone", "assets/gone.png"), &ctx)
            .expect("export succeeds");

        assert!(!bytes.is_empty());
        assert_eq!(warnings, vec!["assets/gone.png: image not found"]);
        assert!(!has_media(&bytes));
    }

    #[test]
    fn test_absolute_image_outside_document_directory_is_not_embedded() {
        let dir = TempDir::new("docx-outside");
        let ctx = dir.context("docs/readme.md");
        let outside = dir.write("outside.png", &png_bytes());

        let (bytes, warnings) = convert(&image_doc("Secret", &outside.to_string_lossy()), &ctx)
            .expect("export succeeds");

        assert_eq!(warnings.len(), 1, "{warnings:?}");
        assert!(
            warnings[0].contains("outside the document directory"),
            "{warnings:?}"
        );
        assert!(!has_media(&bytes));
    }

    #[test]
    fn test_unc_image_reference_is_not_embedded() {
        let dir = TempDir::new("docx-unc");
        let ctx = dir.context("docs/readme.md");

        let (bytes, warnings) = convert(&image_doc("Share", r"\\server\share\a.png"), &ctx)
            .expect("export succeeds");

        assert_eq!(warnings.len(), 1, "{warnings:?}");
        assert!(warnings[0].contains(r"\\server\share\a.png"), "{warnings:?}");
        assert!(!has_media(&bytes));
    }

    #[test]
    fn test_file_url_image_is_embedded() {
        let dir = TempDir::new("docx-file-url");
        let ctx = dir.context("docs/readme.md");
        let png = dir.write("docs/assets/pic.png", &png_bytes());
        let url = crate::context::test_util::file_url(&png);

        let (bytes, warnings) = convert(&image_doc("Pic", &url), &ctx).expect("export succeeds");

        assert!(warnings.is_empty(), "{warnings:?}");
        assert!(has_media(&bytes));
    }
}

