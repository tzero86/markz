use serde::Serialize;

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

    let folder = app
        .dialog()
        .file()
        .blocking_pick_folder();

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
#[tauri::command]
pub async fn list_workspace_files(root: String) -> Result<Vec<FileTreeNode>, String> {
    let root_path = std::path::Path::new(&root);
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Path is not a valid directory".to_string());
    }

    let mut tree = Vec::new();
    let mut entries: Vec<_> = std::fs::read_dir(root_path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();

    entries.sort_by(|a, b| {
        let a_is_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_is_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path().to_string_lossy().to_string();
        let rel_path = entry
            .path()
            .strip_prefix(root_path)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| name.clone());
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        // Skip hidden files and common non-document directories
        if name.starts_with('.') || (is_dir && is_ignored_dir(&name)) {
            continue;
        }

        let node = if is_dir {
            let children = read_dir_recursive(&entry.path(), root_path)?;
            FileTreeNode {
                name,
                path,
                rel_path,
                is_dir: true,
                children,
            }
        } else {
            FileTreeNode {
                name,
                path,
                rel_path,
                is_dir: false,
                children: Vec::new(),
            }
        };

        tree.push(node);
    }

    Ok(tree)
}

fn read_dir_recursive(
    dir: &std::path::Path,
    root: &std::path::Path,
) -> Result<Vec<FileTreeNode>, String> {
    let mut children = Vec::new();
    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();

    entries.sort_by(|a, b| {
        let a_is_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_is_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        // Skip hidden files and common non-document directories
        if name.starts_with('.') || (is_dir && is_ignored_dir(&name)) {
            continue;
        }

        let path = entry.path().to_string_lossy().to_string();
        let rel_path = entry
            .path()
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| name.clone());

        children.push(FileTreeNode {
            name,
            path,
            rel_path,
            is_dir,
            children: if is_dir {
                read_dir_recursive(&entry.path(), root)?
            } else {
                Vec::new()
            },
        });
    }

    Ok(children)
}

#[tauri::command]
pub async fn search_workspace(root: String, query: String) -> Result<Vec<SearchResult>, String> {
    let root_path = std::path::Path::new(&root);
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Invalid workspace directory".to_string());
    }

    let mut results = Vec::new();
    search_dir(root_path, root_path, &query.to_lowercase(), &mut results)?;
    Ok(results)
}

fn search_dir(
    dir: &std::path::Path,
    root: &std::path::Path,
    query: &str,
    results: &mut Vec<SearchResult>,
) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }

        let path = entry.path();
        if path.is_dir() {
            search_dir(&path, root, query, results)?;
        } else {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "md" && ext != "mdx" && ext != "markdown" {
                continue;
            }

            let content = match std::fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let rel_path = path
                .strip_prefix(root)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| name.clone());

            for (line_idx, line) in content.lines().enumerate() {
                if line.to_lowercase().contains(query) {
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

    Ok(())
}

