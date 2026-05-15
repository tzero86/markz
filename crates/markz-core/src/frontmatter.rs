use crate::ast::{Document, Frontmatter, FrontmatterFormat};

/// Extract frontmatter from raw Markdown text.
/// Returns (remaining_text, frontmatter_if_any).
pub fn extract(text: &str) -> (&str, Option<Frontmatter>) {
    let trimmed = text.trim_start();

    // YAML frontmatter: ---\n...\n---
    if trimmed.starts_with("---") {
        if let Some(end) = trimmed[3..].find("\n---") {
            let fm_text = &trimmed[..end + 7]; // include both delimiters
            let rest = &trimmed[end + 7..];
            return (
                rest,
                Some(Frontmatter {
                    raw: fm_text.to_string(),
                    format: FrontmatterFormat::Yaml,
                }),
            );
        }
    }

    // TOML frontmatter: +++\n...\n+++
    if trimmed.starts_with("+++") {
        if let Some(end) = trimmed[3..].find("\n+++") {
            let fm_text = &trimmed[..end + 7];
            let rest = &trimmed[end + 7..];
            return (
                rest,
                Some(Frontmatter {
                    raw: fm_text.to_string(),
                    format: FrontmatterFormat::Toml,
                }),
            );
        }
    }

    (text, None)
}

/// Parse frontmatter and attach it to the document.
pub fn parse_into_document(text: &str, doc: &mut Document) -> String {
    let (remaining, fm) = extract(text);
    doc.frontmatter = fm;
    remaining.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_yaml_frontmatter() {
        let text = "---\ntitle: Hello\n---\ncontent";
        let (rest, fm) = extract(text);
        assert_eq!(rest, "\ncontent");
        assert!(fm.is_some());
        let fm = fm.unwrap();
        assert_eq!(fm.format, FrontmatterFormat::Yaml);
        assert!(fm.raw.starts_with("---"));
    }

    #[test]
    fn test_extract_toml_frontmatter() {
        let text = "+++\ntitle = \"Hello\"\n+++\ncontent";
        let (rest, fm) = extract(text);
        assert_eq!(rest, "\ncontent");
        assert!(fm.is_some());
        let fm = fm.unwrap();
        assert_eq!(fm.format, FrontmatterFormat::Toml);
        assert!(fm.raw.starts_with("+++"));
    }

    #[test]
    fn test_no_frontmatter() {
        let text = "Just markdown\ncontent";
        let (rest, fm) = extract(text);
        assert_eq!(rest, "Just markdown\ncontent");
        assert!(fm.is_none());
    }

    #[test]
    fn test_parse_into_document() {
        let text = "---\ntitle: Test\n---\n# Hello";
        let mut doc = Document::new();
        let remaining = parse_into_document(text, &mut doc);
        assert_eq!(remaining, "\n# Hello");
        assert!(doc.frontmatter.is_some());
    }
}
