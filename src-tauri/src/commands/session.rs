use crate::{session_path_async, SessionState, SessionTab};

#[tauri::command]
pub async fn save_session(
    tabs: Vec<SessionTab>,
    active_tab_path: Option<String>,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let path = session_path_async()
        .await
        .ok_or("Could not determine session path")?;
    let state = SessionState {
        tabs,
        active_tab_path,
        workspace_path,
    };
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    tokio::fs::write(&path, json)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_session() -> Result<Option<SessionState>, String> {
    let path = match session_path_async().await {
        Some(p) => p,
        None => return Ok(None),
    };
    match tokio::fs::try_exists(&path).await {
        Ok(false) => return Ok(None),
        Err(e) => return Err(e.to_string()),
        Ok(true) => {}
    }
    let data = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    let state: SessionState = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(Some(state))
}

#[tauri::command]
pub async fn clear_session_disk() -> Result<(), String> {
    if let Some(path) = session_path_async().await {
        match tokio::fs::try_exists(&path).await {
            Ok(true) => {
                tokio::fs::remove_file(&path)
                    .await
                    .map_err(|e| e.to_string())?;
            }
            Ok(false) => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}
