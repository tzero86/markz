use std::fmt;
use std::path::{Component, Path, PathBuf};

/// Maximum size of a local image that will be embedded into an exported document.
pub const MAX_IMAGE_BYTES: u64 = 32 * 1024 * 1024;

/// Image file extensions accepted for local embedding (superset of the preview pane's list).
const IMAGE_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif", "svg", "ico", "avif",
];

/// Why an image reference could not be turned into embeddable bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageError {
    /// Remote reference, not downloaded for this export.
    RemoteNotEmbedded,
    /// Remote reference, download attempted but failed.
    RemoteFetchFailed,
    /// UNC, Windows device or `..`-escaping reference.
    ForbiddenPath,
    /// The resolved path is not inside the document directory.
    OutsideDocumentDir,
    /// `ConvertContext::doc_dir()` is unknown, so the path cannot be confined.
    NoDocumentDirectory,
    /// The referenced file does not exist.
    NotFound,
    /// The referenced file could not be read.
    ReadFailed,
    /// The extension is not an image extension.
    UnsupportedExtension,
    /// The bytes do not match the format the extension claims.
    NotAnImage,
    /// The file is larger than [`MAX_IMAGE_BYTES`].
    TooLarge,
    /// A `data:` URL could not be base64-decoded.
    InvalidDataUrl,
    /// Remote reference, but this build cannot download it because the
    /// `remote-images` feature is not compiled in.
    #[cfg(not(feature = "remote-images"))]
    RemoteUnsupported,
}

impl fmt::Display for ImageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            ImageError::RemoteNotEmbedded => "remote images are not embedded",
            ImageError::RemoteFetchFailed => "remote image could not be downloaded",
            ImageError::ForbiddenPath => "UNC, device and parent-relative paths are not allowed",
            ImageError::OutsideDocumentDir => "outside the document directory",
            ImageError::NoDocumentDirectory => "document directory is unknown",
            ImageError::NotFound => "image not found",
            ImageError::ReadFailed => "image could not be read",
            ImageError::UnsupportedExtension => "unsupported image extension",
            ImageError::NotAnImage => "file content does not match its image extension",
            ImageError::TooLarge => "image exceeds the 32 MiB embed limit",
            ImageError::InvalidDataUrl => "invalid data URL",
            #[cfg(not(feature = "remote-images"))]
            ImageError::RemoteUnsupported => "remote images cannot be embedded: this build has no remote-images support",
        };
        f.write_str(message)
    }
}

/// Image containers recognised by magic bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImageFormat {
    Png,
    Jpeg,
    Gif,
    Bmp,
    Webp,
    Tiff,
    Ico,
    Avif,
    Svg,
}

impl ImageFormat {
    fn matches_extension(self, ext: &str) -> bool {
        matches!(
            (self, ext),
            (ImageFormat::Png, "png")
                | (ImageFormat::Jpeg, "jpg" | "jpeg")
                | (ImageFormat::Gif, "gif")
                | (ImageFormat::Bmp, "bmp")
                | (ImageFormat::Webp, "webp")
                | (ImageFormat::Tiff, "tiff" | "tif")
                | (ImageFormat::Ico, "ico")
                | (ImageFormat::Avif, "avif")
                | (ImageFormat::Svg, "svg")
        )
    }
}

/// Sniff the image container from its magic bytes.
fn sniff_image_format(bytes: &[u8]) -> Option<ImageFormat> {
    use ImageFormat::*;

    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Some(Png);
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some(Jpeg);
    }
    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some(Gif);
    }
    if bytes.starts_with(b"BM") {
        return Some(Bmp);
    }
    if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(&b"WEBP"[..]) {
        return Some(Webp);
    }
    if bytes.starts_with(b"II\x2A\x00") || bytes.starts_with(b"MM\x00\x2A") {
        return Some(Tiff);
    }
    if bytes.starts_with(&[0x00, 0x00, 0x01, 0x00]) {
        return Some(Ico);
    }
    if bytes.get(4..8) == Some(&b"ftyp"[..]) {
        if let Some(brand) = bytes.get(8..12) {
            if brand == b"avif" || brand == b"avis" {
                return Some(Avif);
            }
        }
    }

    // SVG is XML text: tolerate a UTF-8 BOM and leading whitespace.
    let head = &bytes[..bytes.len().min(1024)];
    let head = head.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(head);
    let body = head
        .iter()
        .position(|b| !b.is_ascii_whitespace())
        .map_or(head, |start| &head[start..]);
    if (body.starts_with(b"<svg") || body.starts_with(b"<?xml") || body.starts_with(b"<!DOCTYPE"))
        && head.windows(4).any(|w| w == b"<svg")
    {
        return Some(Svg);
    }

    None
}

/// Strip a leading `file://` scheme, refusing the UNC host forms `file://host/share` and
/// `file:////share`.
fn strip_file_scheme(url: &str) -> Result<&str, ImageError> {
    let Some(rest) = url.strip_prefix("file://") else {
        return Ok(url);
    };
    if rest.starts_with("//") || rest.starts_with("\\\\") {
        return Err(ImageError::ForbiddenPath);
    }
    #[cfg(windows)]
    let rest = rest.strip_prefix('/').unwrap_or(rest);
    if !Path::new(rest).is_absolute() {
        return Err(ImageError::ForbiddenPath);
    }
    Ok(rest)
}

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

/// Resolve an image reference to a canonical path confined to the document directory.
///
/// - Remote URLs (`http://` / `https://`) return [`ImageError::RemoteNotEmbedded`].
/// - A leading `file://` / `file:///` scheme is stripped; the remainder is absolute when it looks
///   absolute and relative to the document directory otherwise.
/// - UNC (`\\`, `//`, `\\?\`, `\\.\`), drive-relative and `..`-containing references are refused
///   without touching the filesystem.
/// - The canonicalized path must stay inside [`ConvertContext::doc_dir`], which must be known.
pub fn resolve_image_path(url: &str, ctx: &ConvertContext) -> Result<PathBuf, ImageError> {
    if url.starts_with("http://") || url.starts_with("https://") {
        return Err(ImageError::RemoteNotEmbedded);
    }
    if url.starts_with("\\\\") || url.starts_with("//") {
        return Err(ImageError::ForbiddenPath);
    }

    let path = Path::new(strip_file_scheme(url)?);
    if path.components().any(|c| c == Component::ParentDir) {
        return Err(ImageError::ForbiddenPath);
    }
    if !path.is_absolute() && path.components().any(|c| matches!(c, Component::Prefix(_))) {
        // Drive-relative (`C:notes.md`) would resolve against the process CWD.
        return Err(ImageError::ForbiddenPath);
    }

    let base = ctx
        .doc_dir()
        .ok_or(ImageError::NoDocumentDirectory)?
        .canonicalize()
        .map_err(|_| ImageError::NoDocumentDirectory)?;
    let resolved = if path.is_absolute() {
        path.to_path_buf()
    } else {
        base.join(path)
    }
    .canonicalize()
    .map_err(|_| ImageError::NotFound)?;

    if !resolved.starts_with(&base) {
        return Err(ImageError::OutsideDocumentDir);
    }
    Ok(resolved)
}

/// Resolve an image URL for inclusion in exported text formats.
///
/// - Remote URLs are returned unchanged.
/// - A `file://` prefix is stripped and the path treated as absolute when it looks absolute.
/// - Local relative paths are converted to `file://` absolute URLs.
pub fn resolve_image_url(url: &str, ctx: &ConvertContext) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }
    let Ok(raw) = strip_file_scheme(url) else {
        return url.to_string();
    };

    let path = Path::new(raw);
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else if let Some(dir) = ctx.doc_dir() {
        dir.join(path)
    } else {
        return url.to_string();
    };
    file_url_for_path(&abs)
}

/// The `file://` URL for an absolute path, with an empty authority and exactly
/// three slashes: `file:///C:/x` on Windows (a drive path gains the leading
/// slash) and `file:///tmp/x` on Unix (the path already has one). Prefixing
/// `file:///` blindly produced the malformed `file:////tmp/x` on Unix.
fn file_url_for_path(path: &Path) -> String {
    let slashed = path.to_string_lossy().replace('\\', "/");
    if slashed.starts_with('/') {
        format!("file://{slashed}")
    } else {
        format!("file:///{slashed}")
    }
}

/// Resolve an image to its raw bytes.
///
/// - `data:` URLs are base64-decoded.
/// - Local files are read from disk, confined to the document directory and validated against
///   their image extension and magic bytes.
/// - Remote URLs are downloaded when `ctx.embed_remote_images` is true, and are refused
///   with [`ImageError::RemoteUnsupported`] when this build lacks the `remote-images` feature.
pub fn resolve_image_bytes(url: &str, ctx: &ConvertContext) -> Result<Vec<u8>, ImageError> {
    // Data URL (base64 embedded image)
    if url.starts_with("data:image/") {
        let Some(comma_idx) = url.find(',') else {
            return Err(ImageError::InvalidDataUrl);
        };
        let base64_data = &url[comma_idx + 1..];
        return base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data)
            .map_err(|_| ImageError::InvalidDataUrl);
    }

    if url.starts_with("http://") || url.starts_with("https://") {
        if !ctx.embed_remote_images {
            return Err(ImageError::RemoteNotEmbedded);
        }
        #[cfg(not(feature = "remote-images"))]
        return Err(ImageError::RemoteUnsupported);
        #[cfg(feature = "remote-images")]
        return download_image(url).ok_or(ImageError::RemoteFetchFailed);
    }

    let path = resolve_image_path(url, ctx)?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| IMAGE_EXTS.contains(&e.as_str()))
        .ok_or(ImageError::UnsupportedExtension)?;

    let size = std::fs::metadata(&path)
        .map_err(|_| ImageError::NotFound)?
        .len();
    if size > MAX_IMAGE_BYTES {
        return Err(ImageError::TooLarge);
    }

    let bytes = std::fs::read(&path).map_err(|_| ImageError::ReadFailed)?;
    match sniff_image_format(&bytes) {
        Some(format) if format.matches_extension(&ext) => Ok(bytes),
        _ => Err(ImageError::NotAnImage),
    }
}

#[cfg(feature = "remote-images")]
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

/// Test helpers shared with the other converter test modules.
#[cfg(test)]
pub(crate) mod test_util {
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::ConvertContext;

    static NEXT_DIR_ID: AtomicUsize = AtomicUsize::new(0);

    /// A directory below the system temp dir, deleted when it is dropped.
    pub(crate) struct TempDir(PathBuf);

    impl TempDir {
        pub(crate) fn new(tag: &str) -> TempDir {
            let dir = std::env::temp_dir().join(format!(
                "markz-convert-{}-{}-{}",
                tag,
                std::process::id(),
                NEXT_DIR_ID.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir_all(&dir).expect("create temp dir");
            TempDir(dir)
        }

        /// Write `rel` below the directory, creating parents, and return its full path.
        pub(crate) fn write(&self, rel: &str, bytes: &[u8]) -> PathBuf {
            let path = self.0.join(rel);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).expect("create temp parent dir");
            }
            std::fs::write(&path, bytes).expect("write temp file");
            path
        }

        /// A context whose document sits at `rel` inside the directory.
        pub(crate) fn context(&self, rel: &str) -> ConvertContext {
            ConvertContext::new(Some(self.write(rel, b"")))
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    /// A valid 2x2 PNG, encoded by the `image` crate so the bytes always decode.
    pub(crate) fn png_bytes() -> Vec<u8> {
        let mut buf = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(2, 2)
            .write_to(&mut buf, image::ImageFormat::Png)
            .expect("encode test png");
        buf.into_inner()
    }

    /// The `file:///C:/x` (Windows) or `file:///tmp/x` (Unix) form of an absolute path.
    pub(crate) fn file_url(path: &Path) -> String {
        #[cfg(windows)]
        let url = format!("file:///{}", path.to_string_lossy().replace('\\', "/"));
        #[cfg(not(windows))]
        let url = format!("file://{}", path.display());
        url
    }
}

#[cfg(test)]
mod tests {
    use super::test_util::{file_url, png_bytes, TempDir};
    use super::*;

    #[test]
    fn test_resolve_image_path_remote() {
        let ctx = ConvertContext::default();
        assert_eq!(
            resolve_image_path("https://example.com/img.png", &ctx),
            Err(ImageError::RemoteNotEmbedded)
        );
    }

    #[test]
    fn test_relative_path_inside_document_directory_resolves() {
        let dir = TempDir::new("relative");
        let ctx = dir.context("docs/readme.md");
        dir.write("docs/assets/img.png", &png_bytes());

        assert_eq!(resolve_image_bytes("assets/img.png", &ctx), Ok(png_bytes()));
    }

    #[test]
    fn test_missing_image_is_not_found() {
        let dir = TempDir::new("missing");
        let ctx = dir.context("docs/readme.md");

        assert_eq!(
            resolve_image_bytes("assets/missing.png", &ctx),
            Err(ImageError::NotFound)
        );
    }

    #[test]
    fn test_absolute_path_outside_document_directory_is_refused() {
        let dir = TempDir::new("outside");
        let ctx = dir.context("docs/readme.md");
        let url = dir.write("outside.png", &png_bytes()).to_string_lossy().to_string();

        assert_eq!(
            resolve_image_path(&url, &ctx),
            Err(ImageError::OutsideDocumentDir)
        );
        assert_eq!(
            resolve_image_bytes(&url, &ctx),
            Err(ImageError::OutsideDocumentDir)
        );
    }

    #[cfg(windows)]
    #[test]
    fn test_windows_absolute_path_outside_document_directory_is_refused() {
        let dir = TempDir::new("win-ini");
        let ctx = dir.context("docs/readme.md");

        assert_eq!(
            resolve_image_bytes("C:/Windows/win.ini", &ctx),
            Err(ImageError::OutsideDocumentDir)
        );
    }

    #[test]
    fn test_parent_directory_segments_are_refused() {
        let dir = TempDir::new("traversal");
        let ctx = dir.context("docs/readme.md");
        dir.write("secret.png", &png_bytes());

        assert_eq!(
            resolve_image_path("../secret.png", &ctx),
            Err(ImageError::ForbiddenPath)
        );
    }

    #[test]
    fn test_unc_and_device_paths_are_refused() {
        let dir = TempDir::new("unc");
        let ctx = dir.context("docs/readme.md");

        for url in [
            r"\\server\share\a.png",
            r"\\?\C:\a.png",
            r"\\.\PhysicalDrive0",
            "//server/share/a.png",
            "file://server/share/a.png",
        ] {
            assert_eq!(
                resolve_image_bytes(url, &ctx),
                Err(ImageError::ForbiddenPath),
                "{url}"
            );
        }
    }

    #[test]
    fn test_file_url_inside_document_directory_resolves() {
        let dir = TempDir::new("file-url");
        let ctx = dir.context("docs/readme.md");
        let png = dir.write("docs/assets/pic.png", &png_bytes());
        let url = file_url(&png);

        assert_eq!(resolve_image_bytes(&url, &ctx), Ok(png_bytes()));
        assert_eq!(resolve_image_url(&url, &ctx), url);
        // An empty authority means exactly three slashes; `file:////tmp/x` is
        // malformed. Guards both the helper and resolve_image_url.
        assert!(!url.contains("////"), "malformed file URL: {url}");
    }

    /// The Unix URL shape must be assertable from Windows too, since the
    /// `#[cfg(not(windows))]` helper branch is otherwise never compiled here.
    #[test]
    fn test_file_url_for_path_is_well_formed_on_both_platforms() {
        assert_eq!(file_url_for_path(Path::new("/tmp/x.png")), "file:///tmp/x.png");
        assert_eq!(file_url_for_path(Path::new("C:/x.png")), "file:///C:/x.png");
        assert_eq!(file_url_for_path(Path::new(r"C:\x.png")), "file:///C:/x.png");
        for p in ["/tmp/x.png", "/tmp/a b/x.png", "C:/x.png"] {
            let url = file_url_for_path(Path::new(p));
            assert!(!url.contains("////"), "malformed file URL for {p}: {url}");
        }
    }

    #[test]
    fn test_renamed_png_with_non_image_bytes_is_refused() {
        let dir = TempDir::new("fake-png");
        let ctx = dir.context("docs/readme.md");
        dir.write(
            "docs/id_rsa.png",
            b"-----BEGIN OPENSSH PRIVATE KEY-----\nnot an image\n",
        );

        assert_eq!(
            resolve_image_bytes("id_rsa.png", &ctx),
            Err(ImageError::NotAnImage)
        );
    }

    #[test]
    fn test_non_image_extension_is_refused() {
        let dir = TempDir::new("bad-ext");
        let ctx = dir.context("docs/readme.md");
        dir.write("docs/notes.txt", b"hello");

        assert_eq!(
            resolve_image_bytes("notes.txt", &ctx),
            Err(ImageError::UnsupportedExtension)
        );
    }

    #[test]
    fn test_resolve_image_path_without_document_directory_is_refused() {
        let ctx = ConvertContext::default();
        assert_eq!(
            resolve_image_path("assets/img.png", &ctx),
            Err(ImageError::NoDocumentDirectory)
        );
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
    fn test_resolve_image_url_without_document_directory_is_unchanged() {
        let ctx = ConvertContext::default();
        assert_eq!(resolve_image_url("assets/img.png", &ctx), "assets/img.png");
    }

    #[test]
    fn test_resolve_image_bytes_skips_remote_when_disabled() {
        let ctx = ConvertContext::default();
        // Should not attempt download when embed_remote_images is false
        assert_eq!(
            resolve_image_bytes("https://example.com/img.png", &ctx),
            Err(ImageError::RemoteNotEmbedded)
        );
    }

    #[test]
    fn test_sniff_tolerates_truncated_input() {
        // A short `RIFF….ftyp` header must not slice past the end of the buffer.
        for len in 0..16 {
            let mut buf = b"RIFF\x00\x00\x00\x00ftypavif".to_vec();
            buf.truncate(len);
            assert_eq!(sniff_image_format(&buf), None, "len {len}");
        }
        assert_eq!(sniff_image_format(b"\xff\xd8\xff"), Some(ImageFormat::Jpeg));
    }

    #[test]
    fn test_sniff_agrees_with_extension() {
        assert_eq!(sniff_image_format(&png_bytes()), Some(ImageFormat::Png));
        assert_eq!(
            sniff_image_format(br#"<svg xmlns="http://www.w3.org/2000/svg"/>"#),
            Some(ImageFormat::Svg)
        );
        assert_eq!(sniff_image_format(b"-----BEGIN OPENSSH PRIVATE KEY-----"), None);
        assert!(ImageFormat::Png.matches_extension("png"));
        assert!(!ImageFormat::Png.matches_extension("svg"));
    }
}
