use crate::ast::{Block, Document, Inline};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentStats {
    pub words: usize,
    pub characters: usize,
    pub characters_no_spaces: usize,
    pub sentences: usize,
    pub paragraphs: usize,
    pub reading_time_seconds: usize,
    pub flesch_reading_ease: f64,
    pub flesch_kincaid_grade: f64,
}

impl Default for DocumentStats {
    fn default() -> Self {
        Self {
            words: 0,
            characters: 0,
            characters_no_spaces: 0,
            sentences: 0,
            paragraphs: 0,
            reading_time_seconds: 0,
            flesch_reading_ease: 0.0,
            flesch_kincaid_grade: 0.0,
        }
    }
}

/// Compute document statistics from plain text.
pub fn compute(document: &Document) -> DocumentStats {
    let text = extract_plain_text(document);
    if text.is_empty() {
        return DocumentStats::default();
    }

    let words: Vec<&str> = text
        .split_whitespace()
        .filter(|w| !w.is_empty())
        .collect();
    let word_count = words.len();

    let characters = text.chars().count();
    let characters_no_spaces = text.chars().filter(|c| !c.is_whitespace()).count();

    let sentences = count_sentences(&text);
    let paragraphs = count_paragraphs(document);

    let reading_time_seconds = (word_count as f64 / 200.0 * 60.0).round() as usize;

    let (flesch_reading_ease, flesch_kincaid_grade) =
        if sentences > 0 && word_count > 0 {
            let avg_sentence_length = word_count as f64 / sentences as f64;
            let syllables = count_syllables(&text);
            let avg_syllables_per_word = syllables as f64 / word_count as f64;

            let fre = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word);
            let fk = (0.39 * avg_sentence_length) + (11.8 * avg_syllables_per_word) - 15.59;

            (fre.clamp(0.0, 100.0), fk.clamp(0.0, 20.0))
        } else {
            (0.0, 0.0)
        };

    DocumentStats {
        words: word_count,
        characters,
        characters_no_spaces,
        sentences,
        paragraphs,
        reading_time_seconds,
        flesch_reading_ease,
        flesch_kincaid_grade,
    }
}

fn extract_plain_text(document: &Document) -> String {
    let mut result = String::new();
    for block in &document.blocks {
        append_block_text(&mut result, block);
    }
    result
}

fn append_block_text(result: &mut String, block: &Block) {
    match block {
            Block::Heading { text, .. } => {
                append_inlines(result, text);
                result.push('\n');
            }
            Block::Paragraph { text } => {
                append_inlines(result, text);
                result.push('\n');
            }
            Block::CodeBlock { content, .. } => {
                result.push_str(content);
                result.push('\n');
            }
            Block::BlockQuote { blocks } => {
                for b in blocks {
                    append_block_text(result, b);
                }
            }
            Block::List { items, .. } => {
                for item in items {
                    for b in &item.blocks {
                        append_block_text(result, b);
                    }
                }
            }
            Block::Table { header, rows } => {
                for cell in header {
                    append_inlines(result, &cell.text);
                    result.push(' ');
                }
                result.push('\n');
                for row in rows {
                    for cell in row {
                        append_inlines(result, &cell.text);
                        result.push(' ');
                    }
                    result.push('\n');
                }
            }
            Block::ThematicBreak => {}
            Block::RawHtml(html) => {
                result.push_str(html);
                result.push('\n');
            }
            Block::FootnoteDefinition { blocks, .. } => {
                for b in blocks {
                    append_block_text(result, b);
                }
            }
        }
}

fn append_inlines(result: &mut String, inlines: &[Inline]) {
    for inline in inlines {
        match inline {
                    Inline::Text(t) => result.push_str(t),
                    Inline::Code(c) => result.push_str(c),
                    Inline::Emphasis(inner)
                    | Inline::Strong(inner)
                    | Inline::Strikethrough(inner) => append_inlines(result, inner),
                    Inline::Link { text, .. } => append_inlines(result, text),
                    Inline::Image { alt, .. } => result.push_str(alt),
                    Inline::HardBreak | Inline::SoftBreak => result.push(' '),
                    Inline::Html(h) => result.push_str(h),
                    Inline::FootnoteReference { .. } => {}
                    Inline::WikiLink { display, .. } => result.push_str(display),
                }
    }
}

fn count_sentences(text: &str) -> usize {
    let mut count = 0;
    let mut _prev = '\0';
    for ch in text.chars() {
        if ch == '.' || ch == '!' || ch == '?' {
            count += 1;
        }
        _prev = ch;
    }
    // If text ends without punctuation but has words, count as one sentence
    if count == 0 && !text.trim().is_empty() {
        count = 1;
    }
    count
}

fn count_paragraphs(document: &Document) -> usize {
    document
        .blocks
        .iter()
        .filter(|b| matches!(b, Block::Paragraph { .. }))
        .count()
}

/// Naive syllable count: count vowel groups in words.
fn count_syllables(text: &str) -> usize {
    let mut total = 0;
    for word in text.split_whitespace() {
        let clean: String = word
            .chars()
            .filter(|c| c.is_alphabetic())
            .collect::<String>()
            .to_lowercase();
        if clean.is_empty() {
            continue;
        }
        let mut syllables = 0;
        let mut prev_vowel = false;
        for ch in clean.chars() {
            let is_vowel = matches!(ch, 'a' | 'e' | 'i' | 'o' | 'u' | 'y');
            if is_vowel && !prev_vowel {
                syllables += 1;
            }
            prev_vowel = is_vowel;
        }
        if clean.ends_with('e') && syllables > 1 {
            syllables -= 1;
        }
        if syllables == 0 {
            syllables = 1;
        }
        total += syllables;
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse;

    #[test]
    fn test_empty_document() {
        let doc = parse("");
        let stats = compute(&doc);
        assert_eq!(stats.words, 0);
        assert_eq!(stats.sentences, 0);
        assert_eq!(stats.paragraphs, 0);
    }

    #[test]
    fn test_simple_document() {
        let doc = parse("Hello world. This is a test.\n\nSecond paragraph here.");
        let stats = compute(&doc);
        assert_eq!(stats.words, 9);
        assert_eq!(stats.sentences, 3);
        assert_eq!(stats.paragraphs, 2);
        assert!(stats.reading_time_seconds > 0);
    }

    #[test]
    fn test_character_counts() {
        let doc = parse("Hello world");
        let stats = compute(&doc);
        assert_eq!(stats.characters, 12);
        assert_eq!(stats.characters_no_spaces, 10);
    }

    #[test]
    fn test_readability_scores() {
        let doc = parse("The cat sat on the mat. It was a warm day.");
        let stats = compute(&doc);
        assert!(stats.flesch_reading_ease >= 0.0);
        assert!(stats.flesch_kincaid_grade >= 0.0);
        assert!(stats.flesch_kincaid_grade < 5.0);
    }
}
