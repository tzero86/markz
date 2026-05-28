use serde::Serialize;

#[derive(Serialize)]
pub struct GitStatus {
    pub is_repo: bool,
    pub is_modified: bool,
    pub branch: Option<String>,
    pub ahead_behind: Option<String>,
}

#[tauri::command]
pub async fn git_status(doc_path: String) -> Result<GitStatus, String> {
    let path = std::path::Path::new(&doc_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid file path")?;

    let repo = match git2::Repository::discover(path) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitStatus {
                is_repo: false,
                is_modified: false,
                branch: None,
                ahead_behind: None,
            });
        }
    };

    let is_modified = {
        let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
        let mut modified = false;
        for entry in statuses.iter() {
            if let Some(path) = entry.path() {
                if path == file_name {
                    let s = entry.status();
                    modified = s.is_index_modified()
                        || s.is_wt_modified()
                        || s.is_index_new()
                        || s.is_wt_new()
                        || s.is_index_deleted()
                        || s.is_wt_deleted()
                        || s.is_index_renamed()
                        || s.is_wt_renamed()
                        || s.is_index_typechange()
                        || s.is_wt_typechange();
                    if modified {
                        break;
                    }
                }
            }
        }
        modified
    };

    let branch = repo
        .head()
        .ok()
        .and_then(|head| head.shorthand().map(|s| s.to_string()));

    let ahead_behind = (|| {
        let head = repo.head().ok()?;
        let local_oid = head.target()?;
        let resolved = head.resolve().ok()?;
        let upstream = resolved.symbolic_target()?;
        let upstream_ref = repo.find_reference(upstream).ok()?;
        let upstream_oid = upstream_ref.target()?;
        let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid).ok()?;
        if ahead == 0 && behind == 0 {
            None
        } else {
            Some(format!("+{}/-{}", ahead, behind))
        }
    })();

    Ok(GitStatus {
        is_repo: true,
        is_modified,
        branch,
        ahead_behind,
    })
}
