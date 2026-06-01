use crate::embed_local_images;

#[tauri::command]
pub async fn render_slides(
    markdown: String,
    doc_path: Option<String>,
) -> Result<markz_core::slides::SlideDeck, String> {
    let mut deck = markz_core::slides::parse_slides(&markdown);

    // Embed local images in each slide's HTML
    if let Some(ref path) = doc_path {
        if let Some(base_dir) = std::path::Path::new(path).parent() {
            for slide in &mut deck.slides {
                slide.content = embed_local_images(&slide.content, base_dir);
            }
        }
    }

    Ok(deck)
}
