use crate::ast::{Document, Frontmatter, FrontmatterFormat};

/// Extract frontmatter from raw Markdown text and parse it into structured metadata.
/// Returns (remaining_text, frontmatter_if_any).
pub fn extract(text: &str) -> (&str, Option<Frontmatter>) {
    let trimmed = text.trim_start();

    // YAML frontmatter: ---\n...\n---
    if trimmed.starts_with("---") {
        if let Some(end) = trimmed[3..].find("\n---") {
            let fm_text = &trimmed[..end + 7]; // include both delimiters
            let inner = &fm_text[3..end + 3]; // content between delimiters
            let rest = &trimmed[end + 7..];
            let metadata = parse_yaml(inner);
            return (
                rest,
                Some(Frontmatter {
                    raw: fm_text.to_string(),
                    format: FrontmatterFormat::Yaml,
                    metadata,
                }),
            );
        }
    }

    // TOML frontmatter: +++\n...\n+++
    if trimmed.starts_with("+++") {
        if let Some(end) = trimmed[3..].find("\n+++") {
            let fm_text = &trimmed[..end + 7];
            let inner = &fm_text[3..end + 3];
            let rest = &trimmed[end + 7..];
            let metadata = parse_toml(inner);
            return (
                rest,
                Some(Frontmatter {
                    raw: fm_text.to_string(),
                    format: FrontmatterFormat::Toml,
                    metadata,
                }),
            );
        }
    }

    (text, None)
}

fn parse_yaml(text: &str) -> serde_json::Value {
    serde_yaml::from_str(text).unwrap_or_else(|_| serde_json::Value::Null)
}

fn parse_toml(text: &str) -> serde_json::Value {
    toml::from_str(text).unwrap_or_else(|_| serde_json::Value::Null)
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
        assert_eq!(fm.metadata["title"], "Hello");
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
        assert_eq!(fm.metadata["title"], "Hello");
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
        let fm = doc.frontmatter.unwrap();
        assert_eq!(fm.metadata["title"], "Test");
    }

    #[test]
    fn test_yaml_nested_metadata() {
        let text = "---\ntitle: Test\nauthor:\n  name: Alice\n  email: alice@example.com\n---\ncontent";
        let (_, fm) = extract(text);
        let fm = fm.unwrap();
        assert_eq!(fm.metadata["title"], "Test");
        assert_eq!(fm.metadata["author"]["name"], "Alice");
        assert_eq!(fm.metadata["author"]["email"], "alice@example.com");
    }

    #[test]
    fn test_toml_nested_metadata() {
        let text = "+++\ntitle = \"Test\"\n[author]\nname = \"Alice\"\nemail = \"alice@example.com\"\n+++\ncontent";
        let (_, fm) = extract(text);
        let fm = fm.unwrap();
        assert_eq!(fm.metadata["title"], "Test");
        assert_eq!(fm.metadata["author"]["name"], "Alice");
        assert_eq!(fm.metadata["author"]["email"], "alice@example.com");
    }

    #[test]
    fn test_yaml_tags_array() {
        let text = "---\ntags:\n  - rust\n  - markdown\n---\ncontent";
        let (_, fm) = extract(text);
        let fm = fm.unwrap();
        let tags = fm.metadata["tags"].as_array().unwrap();
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0], "rust");
        assert_eq!(tags[1], "markdown");
    }

    #[test]
    fn test_frontmatter_preserved_in_document() {
        let text = "---\ntitle: Hello\n---\n\n# World";
        let doc = crate::parser::parse_full(text);
        assert!(doc.frontmatter.is_some());
        let fm = doc.frontmatter.unwrap();
        assert_eq!(fm.metadata["title"], "Hello");
        assert_eq!(doc.blocks.len(), 1);
    }
}

#[cfg(test)]
mod e2e_tests {
    use crate::parser::parse_full;

    #[test]
    fn test_frontmatter_preserved_in_document() {
        let markdown = "---\ntitle: Hello\n---\n\n# World";
        let doc = parse_full(markdown);
        assert!(doc.frontmatter.is_some());
        let fm = doc.frontmatter.unwrap();
        assert_eq!(fm.metadata["title"], "Hello");
        assert_eq!(doc.blocks.len(), 1);
    }
}