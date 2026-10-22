use crate::{parse_document, embed_local_images, DocumentInfo, IMAGE_EXTS};
use log::info;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn render_preview(
    app: AppHandle,
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let t0 = std::time::Instant::now();
    let doc = markz_core::parser::parse_full(&markdown);
    let t1 = std::time::Instant::now();
    let mut html = markz_core::html::render(&doc);
    let t2 = std::time::Instant::now();

    if let Some(ref path) = doc_path {
        if let Some(base_dir) = std::path::Path::new(path).parent() {
            html = embed_local_images(&html, base_dir).await;
        }
    }
    let t3 = std::time::Instant::now();
    let message = format!(
        "parse={:.1}ms render={:.1}ms embed={:.1}ms total={:.1}ms",
        (t1 - t0).as_secs_f64() * 1000.0,
        (t2 - t1).as_secs_f64() * 1000.0,
        (t3 - t2).as_secs_f64() * 1000.0,
        (t3 - t0).as_secs_f64() * 1000.0,
    );
    info!("[render_preview] {}", message);
    let _ = app.emit(
        "markz:log",
        serde_json::json!({
            "level": "info",
            "source": "render_preview",
            "message": message,
        }),
    );

    Ok(html)
}

/// Files larger than this are never loaded into the editor/preview — reading
/// and rendering multi-megabyte text files freezes the UI.
const MAX_TEXT_FILE_BYTES: u64 = 5 * 1024 * 1024;

fn is_image_path(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

#[tauri::command]
pub async fn open_document(path: String) -> Result<DocumentInfo, String> {
    let path_buf = std::path::PathBuf::from(&path);
    let title = path_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();

    let size = tokio::fs::metadata(&path_buf)
        .await
        .map_err(|e| e.to_string())?
        .len();

    // Oversized files are never read into the UI — loading them freezes the
    // editor and preview. The frontend shows a "file too large" notice.
    if size > MAX_TEXT_FILE_BYTES {
        return Ok(DocumentInfo {
            path,
            content: String::new(),
            title,
            kind: "binary".to_string(),
            size,
        });
    }

    // Try UTF-8 text first. Binary files (e.g. UTF-16 PowerShell scripts,
    // compiled artifacts) fail this and are classified instead of erroring.
    match tokio::fs::read_to_string(&path_buf).await {
        Ok(content) => Ok(DocumentInfo {
            path,
            content,
            title,
            kind: "text".to_string(),
            size,
        }),
        Err(_) if is_image_path(&path_buf) => Ok(DocumentInfo {
            path,
            content: String::new(),
            title,
            kind: "image".to_string(),
            size,
        }),
        Err(_) => Ok(DocumentInfo {
            path,
            content: String::new(),
            title,
            kind: "binary".to_string(),
            size,
        }),
    }
}

#[tauri::command]
pub async fn save_document(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file_text(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Result<Option<DocumentInfo>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "mdx", "markdown"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            // Reuse open_document so classification (text/image/binary, size
            // cap) is identical for the dialog and every other open path.
            open_document(path_str).await.map(Some)
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    default_name: Option<String>,
    filter_name: Option<String>,
    filter_extensions: Option<Vec<String>>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    if let (Some(name), Some(exts)) = (filter_name, filter_extensions) {
        let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(&name, &ext_refs);
    } else {
        dialog = dialog.add_filter("Markdown", &["md", "mdx", "markdown"]);
    }

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let path = dialog.blocking_save_file();
    Ok(path.map(|p| p.to_string()))
}

/// Source slice of the table the preview tagged with `data-table-index="{index}"`.
///
/// The preview and the table editor must agree on *which* table the user
/// double-clicked. The renderer numbers tables in render order and the editor
/// asks for that same number here, so neither side re-derives table positions
/// from the text (the old frontend scanner counted any line containing `|`,
/// which desynced on code fences, prose pipes, frontmatter and footnotes).
#[tauri::command]
pub async fn get_table_source(
    markdown: String,
    index: usize,
) -> Result<TableSourcePayload, String> {
    let tables = markz_core::tables::table_sources(&markdown);
    let count = tables.len();
    let table = tables
        .get(index)
        .ok_or_else(|| format!("Table {} not found.", index + 1))?;

    if table.nested {
        return Err(
            "This table is nested inside a list, block quote, or footnote. Edit it in the editor pane instead."
                .to_string(),
        );
    }

    // Defensive: a bad span would panic on slicing, and a Tauri command must
    // never take the app down. Treat it as a missing table.
    let source = markdown
        .get(table.start..table.end)
        .ok_or_else(|| format!("Table {} not found.", index + 1))?;

    // The frontend slices the markdown with JavaScript string indexes, which
    // count UTF-16 code units — not Rust's UTF-8 bytes. Convert once here.
    let start = utf16_len(&markdown[..table.start]);
    let end = start + utf16_len(source);

    Ok(TableSourcePayload {
        markdown: source.to_string(),
        start,
        end,
        count,
    })
}

#[derive(Debug, serde::Serialize)]
pub struct TableSourcePayload {
    markdown: String,
    start: usize,
    end: usize,
    count: usize,
}

fn utf16_len(text: &str) -> usize {
    text.encode_utf16().count()
}

#[tauri::command]
pub async fn generate_toc(markdown: String) -> Result<Vec<markz_core::toc::TocEntry>, String> {
    let doc = markz_core::parser::parse_full(&markdown);
    Ok(markz_core::toc::generate_toc(&doc))
}

#[tauri::command]
pub async fn save_image(
    image_data: Vec<u8>,
    filename: String,
    doc_path: Option<String>,
) -> Result<markz_images::ImageResult, String> {
    markz_images::save_image(&image_data, &filename, doc_path.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn compute_stats(markdown: String) -> Result<markz_core::stats::DocumentStats, String> {
    let doc = parse_document(&markdown);
    Ok(markz_core::stats::compute(&doc))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn get_table_source_returns_the_requested_table() {
        let md = "| A | B |\n|---|---|\n| 1 | 2 |\n\ntext | pipes\n\n| C | D |\n|---|---|\n| 3 | 4 |";

        let first = get_table_source(md.to_string(), 0).await.unwrap();
        assert_eq!(first.markdown, "| A | B |\n|---|---|\n| 1 | 2 |");
        assert_eq!(first.start, 0);
        assert_eq!(first.count, 2);

        let second = get_table_source(md.to_string(), 1).await.unwrap();
        assert_eq!(second.markdown, "| C | D |\n|---|---|\n| 3 | 4 |");
        // Offsets are UTF-16 code units so the frontend can slice with them.
        let expected_start = md[..md.find("| C | D |").unwrap()].encode_utf16().count();
        assert_eq!(second.start, expected_start);
        assert_eq!(
            expected_start + second.markdown.encode_utf16().count(),
            second.end
        );
    }

    #[tokio::test]
    async fn get_table_source_uses_utf16_offsets_for_non_ascii_text() {
        let md = "Café 🚀\n\n| A | B |\n|---|---|";
        let table = get_table_source(md.to_string(), 0).await.unwrap();
        let prefix = &md[..md.find("| A | B |").unwrap()];
        // Byte offsets and UTF-16 offsets differ here: the rocket is 4 bytes in
        // Rust but a 2-unit surrogate pair in JavaScript.
        assert_ne!(prefix.len(), prefix.encode_utf16().count());
        assert_eq!(table.start, prefix.encode_utf16().count());
        assert_eq!(table.markdown, "| A | B |\n|---|---|");
    }

    #[tokio::test]
    async fn get_table_source_rejects_missing_and_nested_tables() {
        let err = get_table_source("| A |\n|---|".to_string(), 1)
            .await
            .unwrap_err();
        assert!(err.contains("not found"), "{err}");

        let nested = "| A | B |\n|---|---|\n\n- item\n\n  | C | D |\n  |---|---|";
        let err = get_table_source(nested.to_string(), 1)
            .await
            .unwrap_err();
        assert!(err.contains("nested"), "{err}");
    }

    #[tokio::test]
    async fn open_document_classifies_text_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("notes.md");
        tokio::fs::write(&path, "# Hello").await.unwrap();

        let info = open_document(path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(info.kind, "text");
        assert_eq!(info.content, "# Hello");
        assert_eq!(info.size, 7);
    }

    #[tokio::test]
    async fn open_document_classifies_image_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("photo.png");
        // 1x1 PNG — invalid UTF-8, so it must be classified as an image.
        tokio::fs::write(&path, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
            .await
            .unwrap();

        let info = open_document(path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(info.kind, "image");
        assert!(info.content.is_empty());
    }

    #[tokio::test]
    async fn open_document_classifies_binary_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("script.ps1");
        // UTF-16LE BOM — not valid UTF-8, not an image extension.
        tokio::fs::write(&path, [0xFF, 0xFE, 0x57, 0x00, 0x72, 0x00])
            .await
            .unwrap();

        let info = open_document(path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(info.kind, "binary");
        assert!(info.content.is_empty());
    }

    #[tokio::test]
    async fn open_document_caps_oversized_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("huge.log");
        // 6 MiB of ASCII — valid UTF-8 but over the 5 MiB cap.
        let data = vec![b'a'; 6 * 1024 * 1024];
        tokio::fs::write(&path, &data).await.unwrap();

        let info = open_document(path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(info.kind, "binary");
        assert!(info.content.is_empty());
        assert_eq!(info.size, data.len() as u64);
    }
}
