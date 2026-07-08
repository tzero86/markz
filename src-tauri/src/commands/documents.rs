use crate::{parse_document, embed_local_images, DocumentInfo};
use log::info;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn render_preview(
    app: AppHandle,
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let t0 = std::time::Instant::now();
    let mut doc = markz_core::parser::parse(&markdown);
    let remaining = markz_core::frontmatter::parse_into_document(&markdown, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = markz_core::parser::parse(&remaining).blocks;
    }
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

#[tauri::command]
pub async fn open_document(path: String) -> Result<DocumentInfo, String> {
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    let title = std::path::Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    Ok(DocumentInfo { path, content, title })
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
            let content = std::fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
            let title = std::path::Path::new(&path_str)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
                .to_string();
            Ok(Some(DocumentInfo {
                path: path_str,
                content,
                title,
            }))
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

#[tauri::command]
pub async fn generate_toc(markdown: String) -> Result<Vec<markz_core::toc::TocEntry>, String> {
    let text = markz_core::parser::preprocess_math(&markdown);
    let mut doc = markz_core::parser::parse(&text);
    let remaining = markz_core::frontmatter::parse_into_document(&text, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = markz_core::parser::parse(&remaining).blocks;
    }
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
