use crate::ast::{Block, Document, Inline};
use serde::{Deserialize, Serialize};

/// A single slide in a presentation deck.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Slide {
    /// Slide type determines layout and styling.
    pub kind: SlideKind,
    /// Optional heading text (plain-text, no HTML).
    pub title: Option<String>,
    /// Rendered HTML content of the slide.
    pub content: String,
    /// Heading level that triggered this slide (0 for implicit).
    pub level: u8,
    /// Zero-based slide index.
    pub index: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SlideKind {
    /// Title slide — first slide, big centered heading.
    Title,
    /// Section divider — H1, full-bleed background change.
    Section,
    /// Regular content slide — H2+ with body content.
    Content,
    /// Code-focused slide — contains mostly a code block.
    Code,
    /// Image slide — contains mostly images.
    Image,
}

/// Full presentation deck with metadata.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SlideDeck {
    pub title: Option<String>,
    pub author: Option<String>,
    pub theme: String,
    pub slides: Vec<Slide>,
}

impl Default for SlideDeck {
    fn default() -> Self {
        Self {
            title: None,
            author: None,
            theme: "default".to_string(),
            slides: Vec::new(),
        }
    }
}

/// Parse markdown into a slide deck.
///
/// Splitting rules:
/// - Each H1 starts a new **section** slide.
/// - Each H2 starts a new **content** slide.
/// - A thematic break (`---`) starts a new **content** slide.
/// - Content before the first heading becomes a **title** slide.
/// - If the first block is an H1, it becomes a title slide (not a section).
pub fn parse_slides(markdown: &str) -> SlideDeck {
    let mut doc = crate::parser::parse(markdown);
    let remaining = crate::frontmatter::parse_into_document(markdown, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = crate::parser::parse(&remaining).blocks;
    }

    let mut deck = SlideDeck::default();

    // Extract metadata from frontmatter
    if let Some(ref fm) = doc.frontmatter {
        if let serde_json::Value::Object(ref map) = fm.metadata {
            if let Some(serde_json::Value::String(t)) = map.get("title") {
                deck.title = Some(t.clone());
            }
            if let Some(serde_json::Value::String(a)) = map.get("author") {
                deck.author = Some(a.clone());
            }
            if let Some(serde_json::Value::String(th)) = map.get("theme") {
                deck.theme = th.clone();
            }
        }
    }

    let mut slide_blocks: Vec<Vec<Block>> = Vec::new();
    let mut current: Vec<Block> = Vec::new();
    let mut _first_heading_seen = false;

    for block in &doc.blocks {
        let is_boundary = match block {
            Block::Heading { level, .. } => {
                let is_h1 = *level == 1;
                let is_h2 = *level == 2;
                if is_h1 || is_h2 {
                    _first_heading_seen = true;
                }
                is_h1 || is_h2
            }
            Block::ThematicBreak => {
                _first_heading_seen = true;
                true
            }
            _ => false,
        };

        if is_boundary {
            if !current.is_empty() {
                slide_blocks.push(std::mem::take(&mut current));
            }
            // Thematic breaks are pure slide separators — don't include them.
            if !matches!(block, Block::ThematicBreak) {
                current.push(block.clone());
            }
        } else {
            current.push(block.clone());
        }
    }
    if !current.is_empty() {
        slide_blocks.push(current);
    }
    // Strip any stray thematic breaks and remove empty slides.
    slide_blocks.retain(|blocks| {
        let meaningful: Vec<Block> = blocks
            .iter()
            .filter(|b| !matches!(b, Block::ThematicBreak))
            .cloned()
            .collect();
        !meaningful.is_empty()
    });
    // If there are no headings at all, the whole doc becomes one title slide.
    if slide_blocks.is_empty() && !doc.blocks.is_empty() {
        slide_blocks.push(
            doc.blocks
                .iter()
                .filter(|b| !matches!(b, Block::ThematicBreak))
                .cloned()
                .collect(),
        );
    }

    // If there are no headings at all, the whole doc becomes one title slide.
    if slide_blocks.is_empty() && !doc.blocks.is_empty() {
        slide_blocks.push(
            doc.blocks
                .iter()
                .filter(|b| !matches!(b, Block::ThematicBreak))
                .cloned()
                .collect(),
        );
    }
    for (idx, blocks) in slide_blocks.iter().enumerate() {
        let (kind, title, level) = determine_slide_meta(blocks, idx, &deck.title);
        let content = render_slide_blocks(blocks);
        deck.slides.push(Slide {
            kind,
            title,
            content,
            level,
            index: idx,
        });
    }
    deck
}

fn determine_slide_meta(
    blocks: &[Block],
    index: usize,
    deck_title: &Option<String>,
) -> (SlideKind, Option<String>, u8) {
    let first_heading = blocks.iter().find_map(|b| match b {
        Block::Heading { level, text } => Some((*level, inlines_to_plain(text))),
        _ => None,
    });

    if index == 0 {
        // First slide: if it starts with H1, it's a title slide.
        // Otherwise it's a title slide using frontmatter title or first text.
        if let Some((1, title)) = first_heading {
            return (SlideKind::Title, Some(title), 1);
        }
        let title = deck_title.clone().or_else(|| {
            blocks.iter().find_map(|b| match b {
                Block::Paragraph { text } => Some(inlines_to_plain(text)),
                _ => None,
            })
        });
        return (SlideKind::Title, title, 0);
    }

    if let Some((level, title)) = first_heading {
        let kind = if level == 1 {
            SlideKind::Section
        } else if is_mostly_code(blocks) {
            SlideKind::Code
        } else if is_mostly_image(blocks) {
            SlideKind::Image
        } else {
            SlideKind::Content
        };
        return (kind, Some(title), level);
    }

    // Slide with no heading — treat as continuation content.
    let kind = if is_mostly_code(blocks) {
        SlideKind::Code
    } else if is_mostly_image(blocks) {
        SlideKind::Image
    } else {
        SlideKind::Content
    };
    (kind, None, 0)
}

fn is_mostly_code(blocks: &[Block]) -> bool {
    let total = blocks.len();
    if total == 0 {
        return false;
    }
    let code_count = blocks.iter().filter(|b| matches!(b, Block::CodeBlock { .. })).count();
    code_count * 2 >= total
}

fn is_mostly_image(blocks: &[Block]) -> bool {
    let total = blocks.len();
    if total == 0 {
        return false;
    }
    let img_count = blocks.iter().filter(|b| {
        if let Block::Paragraph { text } = b {
            text.iter().any(|i| matches!(i, Inline::Image { .. }))
        } else {
            false
        }
    }).count();
    img_count * 2 >= total
}


fn inlines_to_plain(inlines: &[Inline]) -> String {
    let mut s = String::new();
    for inline in inlines {
        match inline {
            Inline::Text(t) | Inline::Code(t) => s.push_str(t),
            Inline::Emphasis(children)
            | Inline::Strong(children)
            | Inline::Strikethrough(children) => {
                s.push_str(&inlines_to_plain(children));
            }
            Inline::Link { text, .. } => s.push_str(&inlines_to_plain(text)),
            Inline::Image { alt, .. } => s.push_str(alt),
            Inline::HardBreak | Inline::SoftBreak => s.push(' '),
            Inline::FootnoteReference { .. } => {}
            Inline::Html(t) => s.push_str(t),
            Inline::WikiLink { display, .. } => s.push_str(display),
        }
    }
    s.trim().to_string()
}

fn render_slide_blocks(blocks: &[Block]) -> String {
    let sub_doc = Document {
        frontmatter: None,
        blocks: blocks.to_vec(),
    };
    crate::html::render(&sub_doc)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_slides() {
        let md = "# Title\n\nBody\n\n## Slide 1\n\nContent 1\n\n## Slide 2\n\nContent 2\n";
        let deck = parse_slides(md);
        assert_eq!(deck.slides.len(), 3);
        assert!(matches!(deck.slides[0].kind, SlideKind::Title));
        assert_eq!(deck.slides[0].title.as_deref(), Some("Title"));
        assert!(matches!(deck.slides[1].kind, SlideKind::Content));
        assert_eq!(deck.slides[1].title.as_deref(), Some("Slide 1"));
        assert!(matches!(deck.slides[2].kind, SlideKind::Content));
    }

    #[test]
    fn test_thematic_break_slide() {
        let md = "# Title\n\n---\n\nNew slide without heading\n\nMore text\n";
        let deck = parse_slides(md);
        assert_eq!(deck.slides.len(), 2);
        assert!(matches!(deck.slides[1].kind, SlideKind::Content));
        assert!(deck.slides[1].title.is_none());
    }

    #[test]
    fn test_frontmatter_title() {
        let md = "---\ntitle: My Deck\nauthor: Alice\n---\n\n# Welcome\n\nHello world\n";
        let deck = parse_slides(md);
        assert_eq!(deck.title.as_deref(), Some("My Deck"));
        assert_eq!(deck.author.as_deref(), Some("Alice"));
        assert_eq!(deck.slides[0].title.as_deref(), Some("Welcome"));
    }

    #[test]
    fn test_code_slide() {
        let md = "# Title\n\n## Code Demo\n\n```rust\nfn main() {}\n```\n\n```rust\nfn foo() {}\n```\n";
        let deck = parse_slides(md);
        assert!(matches!(deck.slides[1].kind, SlideKind::Code));
    }

    #[test]
    fn test_consecutive_thematic_breaks_no_empty_slides() {
        let md = "# Title\n\n---\n\n---\n\nContent\n\n---\n\n---\n\nMore content\n";
        let deck = parse_slides(md);
        assert_eq!(deck.slides.len(), 3);
        assert!(matches!(deck.slides[0].kind, SlideKind::Title));
        assert_eq!(deck.slides[0].title.as_deref(), Some("Title"));
        assert!(matches!(deck.slides[1].kind, SlideKind::Content));
        assert!(matches!(deck.slides[2].kind, SlideKind::Content));
        // No slide should contain a bare <hr> (thematic break stripped)
        for slide in &deck.slides {
            assert!(!slide.content.contains("<hr>"), "slide {} should not contain hr", slide.index);
        }
    }
    #[test]
    fn test_section_slide() {
        let md = "# Title\n\n## Part A\n\nContent\n\n# Part B\n\nMore content\n";
        let deck = parse_slides(md);
        assert!(matches!(deck.slides[2].kind, SlideKind::Section));
        assert_eq!(deck.slides[2].title.as_deref(), Some("Part B"));
    }
}
