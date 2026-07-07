use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub rel_path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<FileTreeNode>,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub path: String,
    pub rel_path: String,
    pub line_number: usize,
    pub context: String,
}

#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog().file().blocking_pick_folder();

    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// Directories that are never useful in the workspace tree and may be huge
/// (build output, dependencies). Skipped during listing.
const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".git",
    "__pycache__",
    ".next",
    ".cache",
    "coverage",
    ".venv",
    "venv",
];

fn is_ignored_dir(name: &str) -> bool {
    IGNORED_DIRS.contains(&name)
}

fn normalize_rel(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

async fn read_dir_shallow(dir: &Path, root: &Path) -> Result<Vec<FileTreeNode>, String> {
    let mut entries = Vec::new();
    let mut read_dir = tokio::fs::read_dir(dir)
        .await
        .map_err(|e| e.to_string())?;
    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        entries.push(entry);
    }

    let mut with_meta = Vec::with_capacity(entries.len());
    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        let file_type = entry.file_type().await.map_err(|e| e.to_string())?;
        let is_dir = file_type.is_dir();
        let path = entry.path();
        with_meta.push((name, is_dir, path));
    }

    with_meta.sort_by(|a, b| match (a.1, b.1) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.0.cmp(&b.0),
    });

    let mut children = Vec::new();
    for (name, is_dir, path) in with_meta {
        // Skip hidden files and common non-document directories
        if name.starts_with('.') || (is_dir && is_ignored_dir(&name)) {
            continue;
        }

        let path_str = path.to_string_lossy().to_string();
        let rel_path = path
            .strip_prefix(root)
            .map(normalize_rel)
            .unwrap_or_else(|_| name.clone());

        children.push(FileTreeNode {
            name,
            path: path_str,
            rel_path,
            is_dir,
            children: Vec::new(),
        });
    }

    Ok(children)
}

async fn is_valid_dir(path: &Path) -> Result<bool, String> {
    match tokio::fs::metadata(path).await {
        Ok(meta) => Ok(meta.is_dir()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn list_workspace_files_shallow(root: String) -> Result<Vec<FileTreeNode>, String> {
    let root_path = Path::new(&root);
    if !is_valid_dir(root_path).await? {
        return Err("Path is not a valid directory".to_string());
    }

    read_dir_shallow(root_path, root_path).await
}

#[tauri::command]
pub async fn list_dir_children(path: String, root: String) -> Result<Vec<FileTreeNode>, String> {
    let dir = Path::new(&path);
    let root_path = Path::new(&root);
    if !is_valid_dir(dir).await? {
        return Err("Path is not a valid directory".to_string());
    }

    read_dir_shallow(dir, root_path).await
}

#[tauri::command]
pub async fn search_workspace(root: String, query: String) -> Result<Vec<SearchResult>, String> {
    let root_path = Path::new(&root);
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Invalid workspace directory".to_string());
    }

    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    let mut stack: Vec<std::path::PathBuf> = vec![root_path.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let mut read_dir = tokio::fs::read_dir(&dir)
            .await
            .map_err(|e| e.to_string())?;
        while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let file_type = entry.file_type().await.map_err(|e| e.to_string())?;
            let path = entry.path();
            if file_type.is_dir() {
                if !is_ignored_dir(&name) {
                    stack.push(path);
                }
                continue;
            }

            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "md" && ext != "mdx" && ext != "markdown" {
                continue;
            }

            let content = match tokio::fs::read_to_string(&path).await {
                Ok(c) => c,
                Err(_) => continue,
            };

            let rel_path = path
                .strip_prefix(root_path)
                .map(normalize_rel)
                .unwrap_or_else(|_| name.clone());

            for (line_idx, line) in content.lines().enumerate() {
                if line.to_lowercase().contains(&query_lower) {
                    let context = if line.len() > 120 {
                        format!("{}...", &line[..120])
                    } else {
                        line.to_string()
                    };
                    results.push(SearchResult {
                        path: path.to_string_lossy().to_string(),
                        rel_path: rel_path.clone(),
                        line_number: line_idx + 1,
                        context,
                    });
                }
            }
        }
    }

    Ok(results)
}
