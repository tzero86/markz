use std::process::{Command, Stdio};

const SUPPORTED_FORMATS: &[&str] = &["docx", "pdf", "html", "epub"];

fn is_supported_format(fmt: &str) -> bool {
    SUPPORTED_FORMATS.contains(&fmt)
}

/// Check whether `pandoc` is available on the system PATH.
#[tauri::command]
pub fn pandoc_available() -> Result<bool, String> {
    match Command::new("pandoc").arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Export Markdown to the requested format via Pandoc.
///
/// Supported `format` values: `docx`, `pdf`, `html`, `epub`.
/// If the Markdown frontmatter contains a `reference-doc` key, its value is
/// passed to Pandoc via `--reference-doc=`.
#[tauri::command]
pub async fn export_via_pandoc(
    markdown: String,
    doc_path: Option<String>,
    output_path: String,
    format: String,
) -> Result<(), String> {
    if !is_supported_format(&format) {
        return Err(format!(
            "Unsupported export format '{}'. Supported formats: {:?}",
            format, SUPPORTED_FORMATS
        ));
    }

    // Determine base directory for resolving relative reference-doc paths.
    let base_dir = doc_path
        .as_ref()
        .and_then(|p| std::path::Path::new(p).parent())
        .unwrap_or_else(|| std::path::Path::new("."));

    // Extract reference-doc from frontmatter, if any.
    let reference_doc = extract_reference_doc(&markdown, base_dir);

    // Write markdown to a temporary file so Pandoc can read it.
    let temp_path = std::env::temp_dir().join(format!("markz-pandoc-{}.md", uuid::Uuid::new_v4()));
    std::fs::write(&temp_path, markdown.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Build Pandoc command.
    let mut cmd = Command::new("pandoc");
    cmd.arg("--from=markdown")
        .arg(format!("--to={}", format))
        .arg("-o")
        .arg(&output_path)
        .arg(&temp_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(ref_path) = reference_doc {
        cmd.arg(format!("--reference-doc={}", ref_path));
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute pandoc: {}", e))?;

    // Clean up temp file regardless of outcome.
    let _ = std::fs::remove_file(&temp_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Pandoc failed: {}", stderr));
    }

    Ok(())
}

/// Look for `reference-doc` in YAML/TOML frontmatter and resolve it relative
/// to `base_dir` when it is not an absolute path.
fn extract_reference_doc(markdown: &str, base_dir: &std::path::Path) -> Option<String> {
    let (_, fm) = markz_core::frontmatter::extract(markdown);
    let fm = fm?;

    let val = fm.metadata.get("reference-doc")?;
    let rel_path = val.as_str()?;

    let path = std::path::Path::new(rel_path);
    let resolved = if path.is_absolute() {
        path.to_path_buf()
    } else {
        base_dir.join(path)
    };

    resolved.to_str().map(String::from)
}
