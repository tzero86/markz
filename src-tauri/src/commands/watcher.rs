use std::sync::Mutex;
use std::time::Duration;
use notify::{Watcher, RecursiveMode, recommended_watcher};
use tauri::Emitter;

static WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);

/// Start watching a workspace directory for changes.
/// Emits `markz:workspace-changed` on the app handle after a 500ms debounce.
pub fn start_workspace_watcher(path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    stop_workspace_watcher();

    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        if res.is_ok() {
            let _ = tx.send(());
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        while rx.recv().is_ok() {
            // Debounce: wait for events to settle
            std::thread::sleep(Duration::from_millis(500));
            // Drain any pending events within the settle window
            while rx.recv_timeout(Duration::from_millis(100)).is_ok() {}
            let _ = app_handle.emit("markz:workspace-changed", ());
        }
    });

    if let Ok(mut guard) = WATCHER.lock() {
        *guard = Some(watcher);
    }

    Ok(())
}

/// Stop any active workspace watcher.
pub fn stop_workspace_watcher() {
    if let Ok(mut guard) = WATCHER.lock() {
        *guard = None;
    }
}

#[tauri::command]
pub fn watch_workspace(path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    start_workspace_watcher(path, app_handle)
}

#[tauri::command]
pub fn unwatch_workspace() {
    stop_workspace_watcher();
}
