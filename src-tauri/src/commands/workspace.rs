use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub rel_path: String,
    pub is_dir: bool,
    // Always serialize `children` (even when empty) so the frontend can rely
    // on it being an array. Omitting it for empty dirs made the JS side read
    // `node.children.length` on `undefined`, which crashed folder expansion.
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
        // Compute rel_path by normalising both sides to forward slashes and
        // stripping the root prefix. This avoids Path::strip_prefix quirks with
        // mixed separators or trailing slashes on Windows.
        let root_norm = root.to_string_lossy().replace('\\', "/");
        let path_norm = path.to_string_lossy().replace('\\', "/");
        let rel_path = path_norm
            .strip_prefix(&root_norm)
            .map(|s| s.trim_start_matches('/').to_string())
            .unwrap_or_else(|| name.clone());

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
pub async fn create_workspace_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }
    tokio::fs::write(p, "").await.map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub async fn create_workspace_folder(path: String) -> Result<String, String> {
    tokio::fs::create_dir_all(&path).await.map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub async fn rename_workspace_entry(old_path: String, new_name: String) -> Result<String, String> {
    let old = Path::new(&old_path);
    let parent = old.parent().ok_or("Cannot rename root directory")?;
    let new_path = parent.join(&new_name);
    if new_path.exists() {
        return Err("A file or folder with that name already exists".to_string());
    }
    tokio::fs::rename(old, &new_path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_workspace_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let meta = tokio::fs::metadata(p).await.map_err(|e| e.to_string())?;
    if meta.is_dir() {
        tokio::fs::remove_dir_all(p).await.map_err(|e| e.to_string())?;
    } else {
        tokio::fs::remove_file(p).await.map_err(|e| e.to_string())?;
    }
    Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;

    async fn temp_dir_with_file(name: &str, content: &str) -> (tempfile::TempDir, String) {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_string_lossy().to_string();
        let path = dir.path().join(name);
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await.unwrap();
        }
        tokio::fs::write(&path, content.as_bytes()).await.unwrap();
        (dir, root)
    }

    #[tokio::test]
    async fn create_workspace_file_creates_file() {
        let (_dir, root) = temp_dir_with_file("existing.md", "# ok").await;
        let path = format!("{}/nested/new.md", root);
        let result = create_workspace_file(path.clone()).await.unwrap();
        assert_eq!(result, path);
        assert!(tokio::fs::metadata(&path).await.unwrap().is_file());
    }

    #[tokio::test]
    async fn create_workspace_folder_creates_directory() {
        let (_dir, root) = temp_dir_with_file("existing.md", "# ok").await;
        let path = format!("{}/nested/folder", root);
        let result = create_workspace_folder(path.clone()).await.unwrap();
        assert_eq!(result, path);
        assert!(tokio::fs::metadata(&path).await.unwrap().is_dir());
    }

    #[tokio::test]
    async fn rename_workspace_entry_renames_file() {
        let (_dir, root) = temp_dir_with_file("old.md", "# ok").await;
        let old_path = format!("{}/old.md", root);
        let new_path = rename_workspace_entry(old_path.clone(), "new.md".to_string())
            .await
            .unwrap();
        let expected = std::path::Path::new(&root).join("new.md");
        assert_eq!(new_path, expected.to_string_lossy().to_string());
        assert!(!std::path::Path::new(&old_path).exists());
        assert!(std::path::Path::new(&new_path).exists());
    }

    #[tokio::test]
    async fn list_workspace_files_shallow_returns_top_level_entries() {
        let (_dir, root) = temp_dir_with_file("notes.md", "# notes").await;
        let docs = std::path::Path::new(&root).join("docs");
        tokio::fs::create_dir(&docs).await.unwrap();
        tokio::fs::write(docs.join("readme.md"), "# readme").await.unwrap();

        let tree = list_workspace_files_shallow(root.clone()).await.unwrap();
        let names: Vec<_> = tree.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"docs"));
        assert!(names.contains(&"notes.md"));

        let docs_node = tree.iter().find(|n| n.name == "docs").unwrap();
        assert!(docs_node.is_dir);
        assert!(docs_node.children.is_empty());
    }

    #[test]
    fn file_tree_node_always_serializes_children_array() {
        // Regression: `children` used to be skipped when empty, so the frontend
        // received `children: undefined` for empty dirs and crashed on
        // `node.children.length` during expansion.
        let node = FileTreeNode {
            name: "docs".to_string(),
            path: "/root/docs".to_string(),
            rel_path: "docs".to_string(),
            is_dir: true,
            children: Vec::new(),
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["children"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn list_dir_children_returns_nested_entries_with_rel_paths() {
        let (_dir, root) = temp_dir_with_file("notes.md", "# notes").await;
        let docs = std::path::Path::new(&root).join("docs");
        tokio::fs::create_dir(&docs).await.unwrap();
        tokio::fs::write(docs.join("readme.md"), "# readme").await.unwrap();
        let sub = docs.join("sub");
        tokio::fs::create_dir(&sub).await.unwrap();
        tokio::fs::write(sub.join("inner.md"), "# inner").await.unwrap();

        let children = list_dir_children(docs.to_string_lossy().to_string(), root.clone())
            .await
            .unwrap();
        let readme = children.iter().find(|n| n.name == "readme.md").unwrap();
        assert_eq!(readme.rel_path, "docs/readme.md");
        assert!(!readme.is_dir);

        let sub_node = children.iter().find(|n| n.name == "sub").unwrap();
        assert_eq!(sub_node.rel_path, "docs/sub");
        assert!(sub_node.is_dir);
    }

    #[tokio::test]
    async fn rename_workspace_entry_rejects_duplicate_name() {
        let (_dir, root) = temp_dir_with_file("a.md", "# a").await;
        tokio::fs::write(format!("{}/b.md", root), "# b")
            .await
            .unwrap();
        let old_path = format!("{}/a.md", root);
        let result = rename_workspace_entry(old_path, "b.md".to_string()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn delete_workspace_entry_removes_file() {
        let (_dir, root) = temp_dir_with_file("delete-me.md", "# ok").await;
        let path = format!("{}/delete-me.md", root);
        delete_workspace_entry(path.clone()).await.unwrap();
        assert!(!std::path::Path::new(&path).exists());
    }

    #[tokio::test]
    async fn delete_workspace_entry_removes_directory_recursively() {
        let (_dir, root) = temp_dir_with_file("nested/keep.md", "# ok").await;
        tokio::fs::write(format!("{}/nested/child.md", root), "# child")
            .await
            .unwrap();
        let path = format!("{}/nested", root);
        delete_workspace_entry(path.clone()).await.unwrap();
        assert!(!std::path::Path::new(&path).exists());
    }
}
