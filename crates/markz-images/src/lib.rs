use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors that can occur while handling images.
#[derive(Debug, Error)]
pub enum ImageError {
    /// An IO operation failed.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    /// The provided filename could not be used.
    #[error("Invalid filename")]
    InvalidFilename,
    /// No target directory could be determined.
    #[error("No document path and no default directory available")]
    NoDirectory,
}

/// Information about a saved image, suitable for inserting into Markdown.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageResult {
    /// Path relative to the document directory (e.g. `assets/image.png`).
    pub relative_path: String,
    /// Absolute path on the filesystem.
    pub absolute_path: String,
    /// The sanitized filename that was written.
    pub filename: String,
}

/// Save image bytes to the appropriate assets directory.
///
/// If `doc_path` is provided, saves to `{doc_dir}/assets/`.
/// Otherwise, saves to the OS documents dir + `MarkZ/assets/`.
///
/// The filename is sanitized and a timestamp prefix is added to avoid collisions.
pub fn save_image(
    image_data: &[u8],
    suggested_filename: &str,
    doc_path: Option<&str>,
) -> Result<ImageResult, ImageError> {
    let assets_dir = ensure_assets_dir(doc_path)?;
    let safe_name = generate_safe_filename(suggested_filename);

    if safe_name.is_empty() {
        return Err(ImageError::InvalidFilename);
    }

    let file_path = assets_dir.join(&safe_name);
    std::fs::write(&file_path, image_data)?;

    let relative_path = format!("assets/{}", safe_name);
    let absolute_path = file_path.to_string_lossy().to_string();

    Ok(ImageResult {
        relative_path,
        absolute_path,
        filename: safe_name,
    })
}

/// Ensure the assets directory exists and return its path.
///
/// * If `doc_path` is `Some`, the parent of that path is used and `assets` is appended.
/// * If `doc_path` is `None`, the OS documents directory is used and `MarkZ/assets` is appended.
pub fn ensure_assets_dir(doc_path: Option<&str>) -> Result<PathBuf, ImageError> {
    let base_dir = if let Some(path) = doc_path {
        Path::new(path)
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or(ImageError::NoDirectory)?
    } else {
        dirs::document_dir()
            .map(|p| p.join("MarkZ"))
            .ok_or(ImageError::NoDirectory)?
    };

    let assets_dir = base_dir.join("assets");
    std::fs::create_dir_all(&assets_dir)?;
    Ok(assets_dir)
}

/// Generate a safe filename from a suggested name.
///
/// Adds a timestamp prefix like `20250514_151230_` to avoid collisions.
fn generate_safe_filename(suggested: &str) -> String {
    let now = chrono::Local::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    let sanitized = sanitize_filename(suggested);

    if sanitized.is_empty() {
        format!("{}_image.png", timestamp)
    } else {
        format!("{}_{}", timestamp, sanitized)
    }
}

/// Sanitize a filename: keep only alphanumeric, hyphens, underscores, dots.
/// Replaces everything else with `_`. Limited to 100 characters.
fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();

    if sanitized.len() > 100 {
        sanitized.chars().take(100).collect()
    } else {
        sanitized
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename_removes_special_chars() {
        assert_eq!(
            sanitize_filename("hello world!@#.png"),
            "hello_world___.png"
        );
        assert_eq!(sanitize_filename("my-image_v2.jpg"), "my-image_v2.jpg");
        assert_eq!(sanitize_filename(""), "");
    }

    #[test]
    fn test_sanitize_filename_limits_length() {
        let long = "a".repeat(150);
        let result = sanitize_filename(&long);
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn test_generate_safe_filename_format() {
        let name = generate_safe_filename("test.png");
        // Should be like YYYYMMDD_HHMMSS_test.png
        assert!(
            name.ends_with("_test.png"),
            "expected name to end with '_test.png', got: {}",
            name
        );
        let parts: Vec<&str> = name.splitn(2, '_').collect();
        assert_eq!(parts.len(), 2);
        assert!(
            parts[0].chars().all(|c| c.is_numeric()),
            "expected timestamp prefix to be numeric, got: {}",
            parts[0]
        );
    }

    #[test]
    fn test_generate_safe_filename_empty() {
        let name = generate_safe_filename("");
        assert!(
            name.ends_with("_image.png"),
            "expected default fallback, got: {}",
            name
        );
    }

    #[test]
    fn test_ensure_assets_dir_with_doc_path() {
        let tmp_dir = tempfile::tempdir().unwrap();
        let doc_path = tmp_dir.path().join("doc.md");
        std::fs::File::create(&doc_path).unwrap();

        let assets_dir = ensure_assets_dir(Some(doc_path.to_str().unwrap())).unwrap();
        assert_eq!(assets_dir, tmp_dir.path().join("assets"));
        assert!(assets_dir.exists());
    }

    #[test]
    fn test_save_image_writes_file_and_returns_paths() {
        let tmp_dir = tempfile::tempdir().unwrap();
        let doc_path = tmp_dir.path().join("notes.md");
        std::fs::File::create(&doc_path).unwrap();

        let data = b"fake image bytes";
        let result = save_image(data, "my pic.png", Some(doc_path.to_str().unwrap())).unwrap();

        assert!(result.absolute_path.contains("assets"));
        assert!(result.relative_path.starts_with("assets/"));
        assert!(result.filename.ends_with("_my_pic.png"));

        let written_path = Path::new(&result.absolute_path);
        assert!(written_path.exists());
        let read_back = std::fs::read(written_path).unwrap();
        assert_eq!(read_back, data);
    }
}
