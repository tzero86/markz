use crate::{session_path, SessionState, SessionTab};

#[tauri::command]
pub async fn save_session(
    tabs: Vec<SessionTab>,
    active_tab_path: Option<String>,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let path = session_path().ok_or("Could not determine session path")?;
    let state = SessionState {
        tabs,
        active_tab_path,
        workspace_path,
    };
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_session() -> Result<Option<SessionState>, String> {
    let path = match session_path() {
        Some(p) => p,
        None => return Ok(None),
    };
    if !path.exists() {
        return Ok(None);
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let state: SessionState = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(Some(state))
}

#[tauri::command]
pub async fn clear_session_disk() -> Result<(), String> {
    if let Some(path) = session_path() {
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
