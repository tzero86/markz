use crate::DocumentInfo;

#[tauri::command]
pub async fn get_backlinks(doc_path: String) -> Result<Vec<DocumentInfo>, String> {
    let path = std::path::Path::new(&doc_path);
    let dir = path.parent().ok_or("No parent directory")?;
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    if stem.is_empty() {
        return Ok(Vec::new());
    }
    let wiki_pattern = format!("[[{}]]", stem);
    let wiki_pattern_pipe = format!("[[{}|", stem);
    let mut results = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if p.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        if p == path {
            continue;
        }
        let content = std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
        if content.contains(&wiki_pattern) || content.contains(&wiki_pattern_pipe) {
            let title = p.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
                .to_string();
            results.push(DocumentInfo {
                path: p.to_string_lossy().to_string(),
                content,
                title,
                kind: "text".to_string(),
                size: std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0),
            });
        }
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_wikilinks(doc_path: String) -> Result<Vec<String>, String> {
    let content = std::fs::read_to_string(&doc_path).map_err(|e| e.to_string())?;
    let mut links = Vec::new();
    let mut rest = content.as_str();
    while let Some(start) = rest.find("[[") {
        rest = &rest[start + 2..];
        if let Some(end) = rest.find("]]") {
            let inner = &rest[..end];
            let target = if let Some(pipe) = inner.find('|') {
                inner[..pipe].trim().to_string()
            } else {
                inner.trim().to_string()
            };
            if !target.is_empty() && !links.contains(&target) {
                links.push(target);
            }
            rest = &rest[end + 2..];
        } else {
            break;
        }
    }
    Ok(links)
}

#[tauri::command]
pub async fn resolve_wikilink(target: String, doc_dir: String) -> Result<Option<String>, String> {
    let candidates = [
        format!("{}/{}.md", doc_dir, target),
        format!("{}/{}.mdx", doc_dir, target),
        format!("{}/{}/index.md", doc_dir, target),
    ];
    for c in &candidates {
        if std::path::Path::new(c).exists() {
            return Ok(Some(c.clone()));
        }
    }
    Ok(None)
}
