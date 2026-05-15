use crate::ast::{Block, Document, Inline};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TocEntry {
    pub level: u8,
    pub text: String,
    pub anchor: String,
}

pub fn generate_toc(document: &Document) -> Vec<TocEntry> {
    let mut toc = Vec::new();
    for block in &document.blocks {
        if let Block::Heading { level, text } = block {
            let heading_text = extract_text(text);
            let anchor = slugify(&heading_text);
            toc.push(TocEntry {
                level: *level,
                text: heading_text,
                anchor,
            });
        }
    }
    toc
}

pub fn extract_text(inlines: &[Inline]) -> String {
    let mut result = String::new();
    for inline in inlines {
        match inline {
            Inline::Text(t) => result.push_str(t),
            Inline::Code(c) => result.push_str(c),
            Inline::Emphasis(inner)
            | Inline::Strong(inner)
            | Inline::Strikethrough(inner) => {
                result.push_str(&extract_text(inner));
            }
            Inline::Link { text, .. } => {
                result.push_str(&extract_text(text));
            }
            Inline::Image { alt, .. } => {
                result.push_str(alt);
            }
            Inline::SoftBreak | Inline::HardBreak => {
                result.push(' ');
            }
            Inline::Html(html) => {
                result.push_str(html);
            }
        }
    }
    result.trim().to_string()
}

pub fn slugify(text: &str) -> String {
    let mut result = String::new();
    let mut prev_hyphen = true; // suppress leading hyphens
    for ch in text.to_lowercase().chars() {
        if ch.is_alphanumeric() {
            result.push(ch);
            prev_hyphen = false;
        } else if !prev_hyphen {
            result.push('-');
            prev_hyphen = true;
        }
    }
    // Trim trailing hyphen
    if result.ends_with('-') {
        result.pop();
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_toc() {
        let doc = Document {
            frontmatter: None,
            blocks: vec![
                Block::Heading {
                    level: 1,
                    text: vec![Inline::Text("Hello World".to_string())],
                },
                Block::Heading {
                    level: 2,
                    text: vec![Inline::Code("code".to_string())],
                },
                Block::Paragraph {
                    text: vec![Inline::Text("text".to_string())],
                },
            ],
        };
        let toc = generate_toc(&doc);
        assert_eq!(toc.len(), 2);
        assert_eq!(toc[0].level, 1);
        assert_eq!(toc[0].text, "Hello World");
        assert_eq!(toc[0].anchor, "hello-world");
        assert_eq!(toc[1].level, 2);
        assert_eq!(toc[1].text, "code");
        assert_eq!(toc[1].anchor, "code");
    }

    #[test]
    fn test_slugify_special_chars() {
        assert_eq!(slugify("Hello & World!!"), "hello-world");
        assert_eq!(slugify("---leading"), "leading");
        assert_eq!(slugify("trailing---"), "trailing");
        assert_eq!(slugify("a  b"), "a-b");
    }

    #[test]
    fn test_extract_text_nested() {
        let inlines = vec![
            Inline::Text("Hello ".to_string()),
            Inline::Strong(vec![Inline::Text("bold".to_string())]),
            Inline::SoftBreak,
            Inline::Link {
                text: vec![Inline::Text("link".to_string())],
                url: "#".to_string(),
                title: None,
            },
        ];
        assert_eq!(extract_text(&inlines), "Hello bold link");
    }
}
