/// Convert HTML back to Markdown.
/// Used for bidirectional preview editing.
pub fn convert(html: &str) -> String {
    htmd::convert(html).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_paragraph() {
        let md = convert("<p>Hello world</p>");
        assert_eq!(md.trim(), "Hello world");
    }

    #[test]
    fn test_heading() {
        let md = convert("<h2>Section title</h2>");
        assert_eq!(md.trim(), "## Section title");
    }

    #[test]
    fn test_bold_and_italic() {
        let md = convert("<p><strong>bold</strong> and <em>italic</em></p>");
        assert!(md.contains("**bold**"));
        assert!(md.contains("*italic*"));
    }

    #[test]
    fn test_table() {
        let html = r#"<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>"#;
        let md = convert(html);
        assert!(md.contains("| A | B |"));
        assert!(md.contains("| 1 | 2 |"));
    }
}
