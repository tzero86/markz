use crate::{make_context, parse_document};

#[tauri::command]
pub async fn convert_to_jira(markdown: String, doc_path: Option<String>) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::jira::convert(&doc, &ctx))
}

#[tauri::command]
pub async fn convert_to_confluence(
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::confluence::convert(&doc, &ctx))
}

#[tauri::command]
pub async fn convert_to_slack(markdown: String, doc_path: Option<String>) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::slack::convert(&doc, &ctx))
}

#[tauri::command]
pub async fn convert_to_github(
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::github::convert(&doc, &ctx))
}

#[tauri::command]
pub async fn convert_html_to_markdown(html: String) -> Result<String, String> {
    Ok(markz_core::html_to_markdown::convert(&html))
}

#[tauri::command]
pub async fn export_to_docx(
    markdown: String,
    doc_path: Option<String>,
    output_path: String,
) -> Result<(), String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    let bytes = markz_convert::docx::convert(&doc, &ctx).map_err(|e| e.to_string())?;
    std::fs::write(&output_path, bytes).map_err(|e| e.to_string())
}
