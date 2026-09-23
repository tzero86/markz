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

/// Resolve relative resource references (images, linked files) against the
/// document's own directory instead of the process working directory.
fn apply_resource_context(cmd: &mut Command, base_dir: &std::path::Path) {
    // Make the base directory absolute first: the child's working directory is
    // about to change, so a relative `base_dir` would otherwise be resolved
    // against the wrong parent. Resolve it against the current directory once,
    // here, while the process CWD is still the caller's.
    let base_dir = match std::env::current_dir() {
        Ok(cwd) => cwd.join(base_dir),
        Err(_) => base_dir.to_path_buf(),
    };

    cmd.current_dir(&base_dir);
    cmd.arg(format!("--resource-path={}", base_dir.display()));
}

/// The pandoc arguments for one export or copy run. Kept apart from the
/// [`Command`] so the flags are assertable without spawning pandoc: in
/// particular that a rejected `reference-doc` never becomes `--reference-doc=`.
///
/// `--resource-path` is added separately by [`apply_resource_context`], which
/// must still run before this list so it precedes the positional input.
fn build_pandoc_args(
    format: &str,
    output: &str,
    reference_doc: Option<&str>,
    input: &std::path::Path,
) -> Vec<std::ffi::OsString> {
    let mut args: Vec<std::ffi::OsString> = vec![
        "--from=markdown".into(),
        format!("--to={}", format).into(),
        "-o".into(),
        output.into(),
    ];
    if let Some(ref_path) = reference_doc {
        args.push(format!("--reference-doc={}", ref_path).into());
    }
    args.push(input.into());
    args
}

/// The warnings pandoc wrote to stderr on an otherwise successful run, one per
/// line, or `""` when it wrote nothing.
///
/// A successful exit says nothing about resources: pandoc 3.x reports one it
/// could not fetch as `[WARNING] Could not fetch resource <path>: replacing
/// image with description` on stderr and still exits 0.
fn pandoc_warnings(stderr: &[u8]) -> String {
    String::from_utf8_lossy(stderr).trim().to_string()
}

/// The marker pandoc 3.x uses for a resource it could not fetch; anchors the
/// tests to the real message rather than a paraphrase.
#[cfg(test)]
const RESOURCE_FETCH_WARNING: &str = "Could not fetch resource";

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
///
/// `Ok` carries one human-readable warning per line — resources pandoc could
/// not fetch, a rejected `reference-doc`, unresolvable relative paths — or an
/// empty string when the export was clean.
#[tauri::command]
pub async fn export_via_pandoc(
    markdown: String,
    doc_path: Option<String>,
    output_path: String,
    format: String,
) -> Result<String, String> {
    run_pandoc_export(&markdown, doc_path.as_deref(), &output_path, &format).await
}

/// Run a Pandoc export, writing `markdown` to a temporary file first.
///
/// Shared with `export_via_pandoc` so the invocation is exercisable without a
/// Tauri runtime. Always builds the command via [`build_pandoc_command`], so a
/// custom pandoc path from settings is honored.
async fn run_pandoc_export(
    markdown: &str,
    doc_path: Option<&str>,
    output_path: &str,
    format: &str,
) -> Result<String, String> {
    if !is_supported_format(format) {
        return Err(format!(
            "Unsupported export format '{}'. Supported formats: {:?}",
            format, SUPPORTED_FORMATS
        ));
    }

    let mut warnings = Vec::new();

    // Determine base directory for resolving relative reference-doc paths.
    let base_dir = doc_path
        .and_then(|p| std::path::Path::new(p).parent())
        .unwrap_or_else(|| std::path::Path::new("."));
    if doc_path.is_none() {
        warnings.push(
            "This document is unsaved, so relative image paths could not be resolved against \
             its folder. Save the document first to embed them."
                .to_string(),
        );
    }

    // Extract reference-doc from frontmatter, if any.
    let (reference_doc, reference_warnings) = extract_reference_doc(markdown, base_dir);
    warnings.extend(reference_warnings);

    // Write markdown to a temporary file so Pandoc can read it.
    let temp_path = std::env::temp_dir().join(format!("markz-pandoc-{}.md", uuid::Uuid::new_v4()));
    tokio::fs::write(&temp_path, markdown.as_bytes())
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Build Pandoc command.
    let mut cmd = build_pandoc_command();
    apply_resource_context(&mut cmd, base_dir);
    cmd.args(build_pandoc_args(
        format,
        output_path,
        reference_doc.as_deref(),
        &temp_path,
    ));

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

    // A successful exit says nothing about resources pandoc could not fetch.
    let stderr_warnings = pandoc_warnings(&output.stderr);
    if !stderr_warnings.is_empty() {
        warnings.push(stderr_warnings);
    }

    Ok(warnings.join("\n"))
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

    // Extract reference-doc from frontmatter, if any. Validation applies here
    // too, so an invalid value never reaches pandoc; the rejection warning is
    // dropped because a copy writes no artifact to disk.
    let (reference_doc, _) = extract_reference_doc(&markdown, base_dir);

    // Write markdown to a temporary file so Pandoc can read it.
    let temp_path =
        std::env::temp_dir().join(format!("markz-pandoc-copy-{}.md", uuid::Uuid::new_v4()));
    tokio::fs::write(&temp_path, markdown.as_bytes())
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Build Pandoc command, writing to stdout.
    let mut cmd = build_pandoc_command();
    apply_resource_context(&mut cmd, base_dir);
    cmd.args(build_pandoc_args(&fmt, "-", reference_doc.as_deref(), &temp_path));

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

/// Template extensions pandoc accepts for `--reference-doc`.
const REFERENCE_DOC_EXTENSIONS: &[&str] = &["docx", "odt", "pptx"];

/// Validate a frontmatter `reference-doc` value and resolve it inside `base_dir`.
///
/// The value is attacker-controllable document content that pandoc dereferences,
/// so a remote or device path — which makes Windows authenticate outbound to the
/// named host as the logged-on user — a traversal segment, or anything outside
/// the document's own directory is refused. Returns the resolved path, or the
/// reason it was rejected.
fn resolve_reference_doc(raw: &str, base_dir: &std::path::Path) -> Result<String, String> {
    // UNC (`\\host\share`), device (`\\?\`, `\\.\`) and slash-UNC (`//host/share`).
    if raw.starts_with(r"\\") || raw.starts_with("//") {
        return Err("remote and device paths are not allowed".to_string());
    }
    if raw.split(['/', '\\']).any(|segment| segment == "..") {
        return Err("parent-directory traversal is not allowed".to_string());
    }

    let supported_extension = std::path::Path::new(raw)
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| REFERENCE_DOC_EXTENSIONS.contains(&ext.to_lowercase().as_str()));
    if !supported_extension {
        return Err(format!(
            "extension must be one of {:?}",
            REFERENCE_DOC_EXTENSIONS
        ));
    }

    let base = base_dir
        .canonicalize()
        .map_err(|_| "the document directory cannot be resolved".to_string())?;
    let candidate = if std::path::Path::new(raw).is_absolute() {
        std::path::PathBuf::from(raw)
    } else {
        base.join(raw)
    };
    let resolved = candidate
        .canonicalize()
        .map_err(|_| "the file does not exist".to_string())?;
    if !resolved.starts_with(&base) {
        return Err("the file is outside the document directory".to_string());
    }

    resolved
        .to_str()
        .map(String::from)
        .ok_or_else(|| "the path is not valid UTF-8".to_string())
}

/// Look for `reference-doc` in YAML/TOML frontmatter and validate it against
/// `base_dir`. Returns the resolved path when it is accepted, plus one warning
/// line per rejected value so the caller can tell the user why the template was
/// ignored.
fn extract_reference_doc(
    markdown: &str,
    base_dir: &std::path::Path,
) -> (Option<String>, Vec<String>) {
    let (_, fm) = markz_core::frontmatter::extract(markdown);
    let Some(raw) = fm
        .and_then(|fm| fm.metadata.get("reference-doc").cloned())
        .and_then(|val| val.as_str().map(String::from))
    else {
        return (None, Vec::new());
    };

    match resolve_reference_doc(&raw, base_dir) {
        Ok(resolved) => (Some(resolved), Vec::new()),
        Err(reason) => (
            None,
            vec![format!("Ignoring reference-doc '{}': {}.", raw, reason)],
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A valid 1x1 opaque-red RGBA PNG.
    const PIXEL_PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0x63, 0xF8,
        0xCF, 0xC0, 0xF0, 0x1F, 0x00, 0x05, 0x00, 0x01, 0xFF, 0x56, 0xC7, 0x2F, 0x0D, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    /// Entry names inside a docx, i.e. its OOXML part paths.
    fn docx_entries(path: &std::path::Path) -> Vec<String> {
        let file = std::fs::File::open(path).unwrap();
        let archive = zip::ZipArchive::new(file).unwrap();
        archive.file_names().map(String::from).collect()
    }

    /// Exporting a document whose image is referenced relative to the document
    /// must embed the image, not drop it because pandoc resolved the reference
    /// against the process working directory.
    #[tokio::test]
    async fn export_embeds_document_relative_image() {
        if !pandoc_available().await.unwrap_or(false) {
            return;
        }

        let dir = tempfile::tempdir().unwrap();
        let assets = dir.path().join("assets");
        std::fs::create_dir_all(&assets).unwrap();
        std::fs::write(assets.join("pic.png"), PIXEL_PNG).unwrap();

        let doc_path = dir.path().join("doc.md");
        let output_path = dir.path().join("out.docx");

        run_pandoc_export(
            "# Title\n\n![shot](assets/pic.png)\n",
            Some(doc_path.to_str().unwrap()),
            output_path.to_str().unwrap(),
            "docx",
        )
        .await
        .unwrap();

        let entries = docx_entries(&output_path);
        assert!(
            entries.iter().any(|name| name.starts_with("word/media/")),
            "the document-relative image was not embedded; archive entries: {:?}",
            entries
        );
    }

    /// Pandoc reports an unresolvable image as a warning on stderr and still
    /// exits 0, so the export path used to return `Ok(())` and the user got a
    /// success toast for a document written with the image missing.
    #[tokio::test]
    async fn export_warns_about_missing_resource() {
        if !pandoc_available().await.unwrap_or(false) {
            return;
        }

        let dir = tempfile::tempdir().unwrap();
        let doc_path = dir.path().join("doc.md");
        let output_path = dir.path().join("out.docx");

        let warnings = run_pandoc_export(
            "# Title\n\n![shot](assets/gone.png)\n",
            Some(doc_path.to_str().unwrap()),
            output_path.to_str().unwrap(),
            "docx",
        )
        .await
        .unwrap();

        assert!(
            warnings.contains(RESOURCE_FETCH_WARNING) && warnings.contains("assets/gone.png"),
            "the missing image was not reported; warnings: {:?}",
            warnings
        );
    }

    /// An unsaved document has no folder to resolve relative paths against, so
    /// the export must say so rather than resolving them against the process
    /// working directory.
    #[tokio::test]
    async fn export_warns_when_document_is_unsaved() {
        if !pandoc_available().await.unwrap_or(false) {
            return;
        }

        let dir = tempfile::tempdir().unwrap();
        let output_path = dir.path().join("out.docx");

        let warnings = run_pandoc_export(
            "# Title\n\n![shot](assets/gone.png)\n",
            None,
            output_path.to_str().unwrap(),
            "docx",
        )
        .await
        .unwrap();

        assert!(
            warnings.contains("unsaved"),
            "the unsaved-document limitation was not reported; warnings: {:?}",
            warnings
        );
    }

    /// Resolve a `reference-doc` value through the same path the export uses and
    /// report the pandoc arguments it produces.
    fn reference_doc_args(markdown: &str, base_dir: &std::path::Path) -> Vec<std::ffi::OsString> {
        let (reference_doc, _) = extract_reference_doc(markdown, base_dir);
        build_pandoc_args(
            "docx",
            "out.docx",
            reference_doc.as_deref(),
            std::path::Path::new("doc.md"),
        )
    }

    fn has_reference_doc_flag(args: &[std::ffi::OsString]) -> bool {
        args.iter()
            .any(|arg| arg.to_string_lossy().starts_with("--reference-doc="))
    }

    /// A `reference-doc` naming a remote host makes Windows authenticate
    /// outbound as the logged-on user the moment pandoc dereferences it, so the
    /// value must never become an argument.
    #[test]
    fn remote_reference_doc_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let markdown = "---\nreference-doc: \\\\attacker.tld\\share\\r.docx\n---\n\n# Title\n";

        let (reference_doc, warnings) = extract_reference_doc(markdown, dir.path());

        assert!(reference_doc.is_none(), "the remote path was resolved");
        assert!(
            warnings.iter().any(|w| w.contains("attacker.tld")),
            "the rejected value was not reported; warnings: {:?}",
            warnings
        );
        assert!(
            !has_reference_doc_flag(&reference_doc_args(markdown, dir.path())),
            "the rejected reference-doc reached pandoc"
        );
    }

    /// An absolute path outside the document's own folder targets a file the
    /// document has no business naming.
    #[test]
    fn reference_doc_outside_document_directory_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let elsewhere = tempfile::tempdir().unwrap();
        let outside = elsewhere.path().join("template.docx");
        std::fs::write(&outside, b"not a real docx").unwrap();

        let markdown = format!("---\nreference-doc: '{}'\n---\n\n# Title\n", outside.display());
        let (reference_doc, warnings) = extract_reference_doc(&markdown, dir.path());

        assert!(reference_doc.is_none(), "the outside path was resolved");
        assert!(
            warnings
                .iter()
                .any(|w| w.contains("outside the document directory")),
            "warnings: {:?}",
            warnings
        );
        assert!(
            !has_reference_doc_flag(&reference_doc_args(&markdown, dir.path())),
            "the rejected reference-doc reached pandoc"
        );
    }

    /// A template stored beside the document is a legitimate use and still
    /// reaches pandoc.
    #[test]
    fn document_relative_reference_doc_is_accepted() {
        let dir = tempfile::tempdir().unwrap();
        let template = dir.path().join("template.docx");
        std::fs::write(&template, b"not a real docx").unwrap();

        let markdown = "---\nreference-doc: template.docx\n---\n\n# Title\n";
        let (reference_doc, warnings) = extract_reference_doc(markdown, dir.path());

        assert!(
            warnings.is_empty(),
            "the template was not accepted; warnings: {:?}",
            warnings
        );
        assert_eq!(
            reference_doc.as_deref(),
            template.canonicalize().unwrap().to_str()
        );
        assert!(
            has_reference_doc_flag(&reference_doc_args(markdown, dir.path())),
            "the accepted reference-doc was not passed"
        );
    }
}
