use std::path::{Path, PathBuf};

/// Context passed to format converters, carrying document-level metadata
/// needed for path resolution and export options.
#[derive(Debug, Clone, Default)]
pub struct ConvertContext {
    /// Absolute path to the currently open markdown file, if any.
    /// Used to resolve relative image paths.
    pub doc_path: Option<PathBuf>,
    /// When true, attempt to download remote images and embed them
    /// as binary data instead of leaving them as URLs.
    pub embed_remote_images: bool,
}

impl ConvertContext {
    pub fn new(doc_path: Option<PathBuf>) -> Self {
        Self {
            doc_path,
            embed_remote_images: false,
        }
    }

    pub fn with_embed_remote_images(mut self, enabled: bool) -> Self {
        self.embed_remote_images = enabled;
        self
    }

    /// Returns the directory containing the document, if known.
    pub fn doc_dir(&self) -> Option<&Path> {
        self.doc_path.as_ref().and_then(|p| p.parent())
    }
}

/// Resolve an image URL/path to an absolute filesystem path.
///
/// - Remote URLs (`http://` / `https://`) return `None`.
/// - Absolute paths are returned as-is.
/// - Relative paths are resolved against the document directory.
pub fn resolve_image_path(url: &str, ctx: &ConvertContext) -> Option<PathBuf> {
    if url.starts_with("http://") || url.starts_with("https://") {
        return None;
    }

    let path = Path::new(url);
    if path.is_absolute() {
        Some(path.to_path_buf())
    } else {
        ctx.doc_dir().map(|dir| dir.join(path))
    }
}

/// Resolve an image URL for inclusion in exported text formats.
///
/// - Remote URLs are returned unchanged.
/// - Local relative paths are converted to `file://` absolute URLs.
/// - Local absolute paths are converted to `file://` URLs.
pub fn resolve_image_url(url: &str, ctx: &ConvertContext) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else if let Some(abs) = resolve_image_path(url, ctx) {
        format!("file:///{}", abs.to_string_lossy().replace('\\', "/"))
    } else {
        url.to_string()
    }
}

/// Resolve an image to its raw bytes.
///
/// - Local files are read from disk.
/// - Remote URLs are downloaded when `ctx.embed_remote_images` is true.
/// - Returns `None` if the image cannot be resolved.
pub fn resolve_image_bytes(url: &str, ctx: &ConvertContext) -> Option<Vec<u8>> {
    // Local file
    if let Some(path) = resolve_image_path(url, ctx) {
        return std::fs::read(&path).ok();
    }

    // Remote URL
    if ctx.embed_remote_images && (url.starts_with("http://") || url.starts_with("https://")) {
        return download_image(url);
    }

    None
}

fn download_image(url: &str) -> Option<Vec<u8>> {
    let mut response = ureq::get(url).call().ok()?;

    // Only accept image content types
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !content_type.starts_with("image/") {
        return None;
    }

    let bytes = response.body_mut().read_to_vec().ok()?;

    if bytes.is_empty() {
        return None;
    }

    Some(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_image_path_remote() {
        let ctx = ConvertContext::default();
        assert_eq!(
            resolve_image_path("https://example.com/img.png", &ctx),
            None
        );
    }

    #[test]
    fn test_resolve_image_path_absolute() {
        let ctx = ConvertContext::default();
        #[cfg(windows)]
        let abs_path = "C:\\assets\\img.png";
        #[cfg(not(windows))]
        let abs_path = "/assets/img.png";
        let path = resolve_image_path(abs_path, &ctx);
        assert!(path.is_some());
        assert!(path.unwrap().is_absolute());
    }

    #[test]
    fn test_resolve_image_path_relative() {
        let ctx = ConvertContext::new(Some(PathBuf::from("/docs/project/readme.md")));
        let path = resolve_image_path("assets/img.png", &ctx);
        assert_eq!(path, Some(PathBuf::from("/docs/project/assets/img.png")));
    }

    #[test]
    fn test_resolve_image_url_remote() {
        let ctx = ConvertContext::default();
        assert_eq!(
            resolve_image_url("https://example.com/img.png", &ctx),
            "https://example.com/img.png"
        );
    }

    #[test]
    fn test_resolve_image_bytes_skips_remote_when_disabled() {
        let ctx = ConvertContext::default();
        // Should not attempt download when embed_remote_images is false
        assert_eq!(resolve_image_bytes("https://example.com/img.png", &ctx), None);
    }
}
