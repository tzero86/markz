//! Exact source ranges for every table the renderer emits.
//!
//! The preview tags each rendered table with `data-table-index`, and the editor
//! rewrites the table behind that index by splicing its source range. Both
//! sides must therefore agree on *which* table an index names. Scanning raw
//! text for lines containing `|` does not agree: pipes inside code fences,
//! prose, frontmatter and footnote tables all shift the numbering.
//!
//! So ranges are derived from the very same pulldown-cmark parse the renderer
//! uses, then translated back to original-file lines through the line map that
//! [`crate::parser::preprocess_math_with_lines`] records.

use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};

/// One table's position in the original Markdown source (byte offsets).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TableSource {
    /// Byte offset of the table's first source line.
    pub start: usize,
    /// Byte offset just past the table's last source line, *excluding* the
    /// trailing newline, so `md[..start] + new + md[end..]` keeps it intact.
    pub end: usize,
    /// True when the table sits inside a block quote, list item or footnote
    /// definition, where the editor has to preserve the container prefix.
    pub nested: bool,
}

/// Collect the source range of every rendered table.
///
/// Order matches [`crate::html::render`]: tables outside footnote definitions
/// first (document order), then tables inside footnote definitions, because the
/// renderer hoists footnote definitions to the end of its output.
pub fn table_sources(markdown: &str) -> Vec<TableSource> {
    let (body, _frontmatter) = crate::frontmatter::extract(markdown);
    // `body` is always a subslice of `markdown`, so pointer subtraction yields
    // the offset the splice operation needs.
    let body_offset = body.as_ptr() as usize - markdown.as_ptr() as usize;
    if body.is_empty() {
        return Vec::new();
    }

    let (processed, line_map) = crate::parser::preprocess_math_with_lines(body);

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_TASKLISTS);
    opts.insert(Options::ENABLE_SMART_PUNCTUATION);
    opts.insert(Options::ENABLE_FOOTNOTES);

    let processed_starts = physical_line_starts(&processed);
    let source_starts = source_line_starts(body);

    // Any open block quote / list / item / footnote definition means the table
    // is indented or quoted in the source. Footnote depth is tracked separately
    // because those tables must be reported last.
    let mut depth = 0usize;
    let mut footnote_depth = 0usize;
    let mut body_tables: Vec<TableSource> = Vec::new();
    let mut footnote_tables: Vec<TableSource> = Vec::new();

    for (event, range) in Parser::new_ext(&processed, opts).into_offset_iter() {
        match event {
            Event::Start(tag) => match &tag {
                Tag::Table(_) => {
                    let start_offset = trim_leading_layout(&processed, range.start, range.end);
                    let end_offset = trim_trailing_layout(&processed, range.end, range.start);
                    let first_processed_line = line_of(&processed_starts, start_offset);
                    let last_processed_line =
                        line_of(&processed_starts, end_offset.saturating_sub(1));

                    let first_source_line =
                        map_processed_line(&line_map, first_processed_line, source_starts.len());
                    let last_source_line =
                        map_processed_line(&line_map, last_processed_line, source_starts.len())
                            .max(first_source_line);

                    let table = TableSource {
                        start: body_offset + source_starts[first_source_line],
                        end: body_offset
                            + source_line_content_end(body, &source_starts, last_source_line),
                        nested: depth > 0,
                    };
                    if footnote_depth > 0 {
                        footnote_tables.push(table);
                    } else {
                        body_tables.push(table);
                    }
                }
                Tag::FootnoteDefinition(_) => {
                    depth += 1;
                    footnote_depth += 1;
                }
                Tag::BlockQuote(_) | Tag::List(_) | Tag::Item => depth += 1,
                _ => {}
            },
            Event::End(tag_end) => match &tag_end {
                TagEnd::FootnoteDefinition => {
                    depth = depth.saturating_sub(1);
                    footnote_depth = footnote_depth.saturating_sub(1);
                }
                TagEnd::BlockQuote(_) | TagEnd::List(_) | TagEnd::Item => {
                    depth = depth.saturating_sub(1);
                }
                _ => {}
            },
            _ => {}
        }
    }

    body_tables.extend(footnote_tables);
    body_tables
}

/// Start offset of every physical line in `text`, as produced by
/// `text.split('\n')` — a trailing newline *does* add a final empty line here.
fn physical_line_starts(text: &str) -> Vec<usize> {
    let mut starts = vec![0];
    for (index, byte) in text.bytes().enumerate() {
        if byte == b'\n' {
            starts.push(index + 1);
        }
    }
    starts
}

/// Start offset of every line in `text` under `str::lines()` numbering — a
/// trailing newline does not create an extra line. This is the numbering the
/// preprocessing line map uses.
fn source_line_starts(text: &str) -> Vec<usize> {
    let mut starts = vec![0];
    for (index, byte) in text.bytes().enumerate() {
        if byte == b'\n' && index + 1 < text.len() {
            starts.push(index + 1);
        }
    }
    starts
}

/// Index of the physical line containing `offset`.
fn line_of(starts: &[usize], offset: usize) -> usize {
    match starts.binary_search(&offset) {
        Ok(index) => index,
        Err(index) => index.saturating_sub(1),
    }
}

/// Translate a processed-text line index to the original `body` line index.
///
/// The map may be shorter than the processed output by one trailing empty line,
/// and `str::lines()` may report a different count than `split('\n')`, so both
/// ends are clamped rather than trusted.
fn map_processed_line(line_map: &[usize], processed_line: usize, source_lines: usize) -> usize {
    let Some(last) = line_map.len().checked_sub(1) else {
        return 0;
    };
    let mapped = line_map[processed_line.min(last)];
    if source_lines == 0 {
        mapped
    } else {
        mapped.min(source_lines - 1)
    }
}

/// Byte offset where the line's content ends, excluding its `\n` (and `\r`).
fn source_line_content_end(body: &str, starts: &[usize], line: usize) -> usize {
    let start = starts[line];
    let mut end = if line + 1 < starts.len() {
        // `starts[line + 1]` is the first byte after the terminating newline.
        starts[line + 1] - 1
    } else {
        body.len()
    };
    let bytes = body.as_bytes();
    if end > start && bytes[end - 1] == b'\n' {
        end -= 1;
    }
    if end > start && bytes[end - 1] == b'\r' {
        end -= 1;
    }
    end
}

/// Skip layout bytes so a block range that begins on a preceding newline or
/// indentation still resolves to the table's own line.
fn trim_leading_layout(text: &str, mut offset: usize, end: usize) -> usize {
    let bytes = text.as_bytes();
    while offset < end && matches!(bytes[offset], b'\n' | b'\r' | b' ' | b'\t') {
        offset += 1;
    }
    offset
}

/// Skip a trailing newline (or trailing spaces) so the range end resolves to
/// the last line that actually holds table content.
fn trim_trailing_layout(text: &str, mut offset: usize, start: usize) -> usize {
    let bytes = text.as_bytes();
    while offset > start && matches!(bytes[offset - 1], b'\n' | b'\r' | b' ' | b'\t') {
        offset -= 1;
    }
    offset
}

#[cfg(test)]
mod tests {
    use super::*;

    fn slices(markdown: &str) -> Vec<&str> {
        table_sources(markdown)
            .iter()
            .map(|source| &markdown[source.start..source.end])
            .collect()
    }

    #[test]
    fn ignores_pipes_in_prose_between_tables() {
        let markdown = "| a | b |\n|---|---|\n| 1 | 2 |\n\nNote: a | b\n\n| c | d |\n|---|---|\n| 3 | 4 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 2, "found: {found:?}");
        assert_eq!(found[0], "| a | b |\n|---|---|\n| 1 | 2 |");
        assert_eq!(found[1], "| c | d |\n|---|---|\n| 3 | 4 |");
    }

    #[test]
    fn ignores_pipes_in_fenced_code() {
        let markdown = "```\n| a | b |\n|---|---|\n```\n\n| real | table |\n|---|---|\n| 1 | 2 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| real | table |\n|---|---|\n| 1 | 2 |");
    }

    #[test]
    fn skips_frontmatter_with_pipes() {
        let markdown = "---\ntitle: A | B\n---\n\n| x | y |\n|---|---|\n| 1 | 2 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| x | y |\n|---|---|\n| 1 | 2 |");
    }

    #[test]
    fn footnote_tables_are_reported_last() {
        let markdown = "| body | table |\n|---|---|\n| 1 | 2 |\n\n[^1]: note\n\n    | foot | table |\n    |---|---|\n    | 3 | 4 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 2, "found: {found:?}");
        assert_eq!(found[0], "| body | table |\n|---|---|\n| 1 | 2 |");
        assert_eq!(found[1], "    | foot | table |\n    |---|---|\n    | 3 | 4 |");
    }

    #[test]
    fn offsets_are_bytes_not_chars() {
        let markdown = "Café 🚀 résumé\n\n| α | β |\n|---|---|\n| 1 | 2 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| α | β |\n|---|---|\n| 1 | 2 |");
    }

    #[test]
    fn crlf_offsets_exclude_carriage_returns() {
        let markdown = "intro\r\n\r\n| a | b |\r\n|---|---|\r\n| 1 | 2 |\r\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| a | b |\r\n|---|---|\r\n| 1 | 2 |");
        let source = table_sources(markdown)[0];
        assert!(!markdown[source.start..source.end].ends_with('\n'));
        assert!(!markdown[source.start..source.end].ends_with('\r'));
    }

    #[test]
    fn math_block_before_table_keeps_line_map_aligned() {
        let markdown = "$$\nx = 1\ny = 2\n$$\n\n| a | b |\n|---|---|\n| 1 | 2 |\n";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| a | b |\n|---|---|\n| 1 | 2 |");
    }

    #[test]
    fn nested_is_true_inside_list_item() {
        let markdown = "- item\n\n  | a | b |\n  |---|---|\n  | 1 | 2 |\n";
        let sources = table_sources(markdown);
        assert_eq!(sources.len(), 1, "found: {sources:?}");
        assert!(sources[0].nested, "table inside a list item must be nested: {sources:?}");
        assert_eq!(
            &markdown[sources[0].start..sources[0].end],
            "  | a | b |\n  |---|---|\n  | 1 | 2 |"
        );
    }

    #[test]
    fn table_at_eof_without_trailing_newline() {
        let markdown = "intro\n\n| a | b |\n|---|---|\n| 1 | 2 |";
        let found = slices(markdown);
        assert_eq!(found.len(), 1, "found: {found:?}");
        assert_eq!(found[0], "| a | b |\n|---|---|\n| 1 | 2 |");
    }

    #[test]
    fn nested_is_true_inside_block_quote() {
        let markdown = "> | a | b |\n> |---|---|\n> | 1 | 2 |\n";
        let sources = table_sources(markdown);
        assert_eq!(sources.len(), 1, "found: {sources:?}");
        assert!(sources[0].nested);
        assert_eq!(
            &markdown[sources[0].start..sources[0].end],
            "> | a | b |\n> |---|---|\n> | 1 | 2 |"
        );
    }

    #[test]
    fn nested_is_false_at_top_level() {
        let markdown = "| a | b |\n|---|---|\n| 1 | 2 |\n";
        let sources = table_sources(markdown);
        assert_eq!(sources.len(), 1, "found: {sources:?}");
        assert!(!sources[0].nested);
    }
}
