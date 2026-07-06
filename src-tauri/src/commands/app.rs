use crate::AppState;
use tauri::{AppHandle, Manager};

/// Drain and return any file paths that were queued before the frontend loaded.
#[tauri::command]
pub fn take_pending_open(app: AppHandle) -> Vec<String> {
    app.state::<AppState>()
        .pending_open
        .lock()
        .map(|mut p| std::mem::take(&mut *p))
        .unwrap_or_default()
}
