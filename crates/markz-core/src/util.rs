const MARKDOWN_EXTS: &[&str] = &["md", "markdown", "mdx", "mdown"];

/// Check whether a path has a recognized Markdown extension.
pub fn is_markdown_path(path: &str) -> bool {
    std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| {
            let ext = e.to_lowercase();
            MARKDOWN_EXTS.contains(&ext.as_str())
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::is_markdown_path;

    #[test]
    fn recognizes_markdown_extensions() {
        assert!(is_markdown_path("/docs/readme.md"));
        assert!(is_markdown_path("/docs/readme.markdown"));
        assert!(is_markdown_path("/docs/readme.mdx"));
        assert!(is_markdown_path("/docs/readme.mdown"));
        assert!(is_markdown_path("C:\\Docs\\README.MD"));
    }

    #[test]
    fn rejects_non_markdown_extensions() {
        assert!(!is_markdown_path("/docs/readme.txt"));
        assert!(!is_markdown_path("/docs/readme.pdf"));
        assert!(!is_markdown_path("/docs/no-extension"));
        assert!(!is_markdown_path(""));
    }
}
