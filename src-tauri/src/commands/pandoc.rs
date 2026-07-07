use std::process::Stdio;
use tokio::process::Command;

const SUPPORTED_FORMATS: &[&str] = &["docx", "pdf", "html", "epub"];
const SUPPORTED_CLIPBOARD_FORMATS: &[&str] = &["html", "rtf"];

/// Windows process creation flag that prevents a console window from flashing
/// when a GUI app spawns pandoc.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn is_supported_format(fmt: &str) -> bool {
    SUPPORTED_FORMATS.contains(&fmt)
}

fn is_supported_clipboard_format(fmt: &str) -> bool {
    SUPPORTED_CLIPBOARD_FORMATS.contains(&fmt)
}

/// Resolve the pandoc executable to use, honoring a custom path from settings
/// before falling back to the system `pandoc` binary.
fn pandoc_binary() -> String {
    if let Some(settings) = crate::read_settings_sync() {
        if let Some(ref custom_path) = settings.pandoc_path {
            if !custom_path.is_empty() {
                return custom_path.clone();
            }
        }
    }
    "pandoc".to_string()
}

/// Build a pandoc command with stdout/stderr captured and, on Windows, the
/// `CREATE_NO_WINDOW` flag set so no console flashes when the frontend checks
/// availability or runs an export/copy.
fn build_pandoc_command() -> Command {
    let mut cmd = Command::new(pandoc_binary());
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Check whether `pandoc` is available — first checking the custom path from
/// settings (if set), then falling back to the system PATH.
#[tauri::command]
pub async fn pandoc_available() -> Result<bool, String> {
    match build_pandoc_command().arg("--version").output().await {
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
    tokio::fs::write(&temp_path, markdown.as_bytes())
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Build Pandoc command.
    let mut cmd = build_pandoc_command();
    cmd.arg("--from=markdown")
        .arg(format!("--to={}", format))
        .arg("-o")
        .arg(&output_path)
        .arg(&temp_path);

    if let Some(ref_path) = reference_doc {
        cmd.arg(format!("--reference-doc={}", ref_path));
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute pandoc: {}", e))?;

    // Clean up temp file regardless of outcome.
    let _ = tokio::fs::remove_file(&temp_path).await;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Pandoc failed: {}", stderr));
    }

    Ok(())
}

/// Convert Markdown to a text-based format via Pandoc and return the output.
///
/// Supported `format` values: `html`, `rtf`.
/// If the Markdown frontmatter contains a `reference-doc` key, its value is
/// passed to Pandoc via `--reference-doc=`.
#[tauri::command]
pub async fn copy_via_pandoc(
    markdown: String,
    doc_path: Option<String>,
    format: String,
) -> Result<String, String> {
    let fmt = format.to_lowercase();
    if !is_supported_clipboard_format(&fmt) {
        return Err(format!(
            "Unsupported clipboard format '{}'. Supported formats: {:?}",
            format, SUPPORTED_CLIPBOARD_FORMATS
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
    let temp_path =
        std::env::temp_dir().join(format!("markz-pandoc-copy-{}.md", uuid::Uuid::new_v4()));
    tokio::fs::write(&temp_path, markdown.as_bytes())
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Build Pandoc command, writing to stdout.
    let mut cmd = build_pandoc_command();
    cmd.arg("--from=markdown")
        .arg(format!("--to={}", fmt))
        .arg("-o")
        .arg("-")
        .arg(&temp_path);

    if let Some(ref_path) = reference_doc {
        cmd.arg(format!("--reference-doc={}", ref_path));
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute pandoc: {}", e))?;

    // Clean up temp file regardless of outcome.
    let _ = tokio::fs::remove_file(&temp_path).await;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Pandoc failed: {}", stderr));
    }

    String::from_utf8(output.stdout)
        .map_err(|e| format!("Pandoc output is not valid UTF-8: {}", e))
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
