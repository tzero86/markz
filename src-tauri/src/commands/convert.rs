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

#[cfg(feature = "docx")]
#[tauri::command]
pub async fn export_to_docx(
    markdown: String,
    doc_path: Option<String>,
    output_path: String,
) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    let (bytes, warnings) =
        markz_convert::docx::convert(&doc, &ctx).map_err(|e| e.to_string())?;
    std::fs::write(&output_path, bytes).map_err(|e| e.to_string())?;
    Ok(warnings.join("\n"))
}

// These exercise a real DOCX export; without the `docx` feature the command
// only returns a feature-disabled error, so they have nothing to assert.
#[cfg(all(test, feature = "docx"))]
mod tests {
    use super::*;

    const SVG_IMAGE: &str =
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>"#;

    async fn export(markdown: &str, dir: &std::path::Path) -> String {
        let doc_path = dir.join("doc.md");
        std::fs::write(&doc_path, markdown).unwrap();
        export_to_docx(
            markdown.to_string(),
            Some(doc_path.to_string_lossy().to_string()),
            dir.join("out.docx").to_string_lossy().to_string(),
        )
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn export_to_docx_writes_the_file_and_reports_nothing_when_clean() {
        let dir = tempfile::tempdir().unwrap();

        let warnings = export("# Title\n\nHello world.", dir.path()).await;

        assert_eq!(warnings, "");
        assert!(std::fs::metadata(dir.path().join("out.docx")).unwrap().len() > 0);
    }

    #[tokio::test]
    async fn export_to_docx_reports_one_line_per_unembedded_image() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("diagram.svg"), SVG_IMAGE).unwrap();

        let warnings = export("# Title\n\n![gone](missing.png)\n\n![svg](diagram.svg)", dir.path())
            .await;

        assert_eq!(
            warnings,
            "missing.png: image not found\ndiagram.svg: unsupported image format"
        );
    }
}
