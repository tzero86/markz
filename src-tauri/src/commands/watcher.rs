use std::sync::Mutex;
use std::time::Duration;
use notify::{Watcher, RecursiveMode, recommended_watcher};
use tauri::Emitter;

static WORKSPACE_WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);
static FILE_WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);

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

    if let Ok(mut guard) = WORKSPACE_WATCHER.lock() {
        *guard = Some(watcher);
    }

    Ok(())
}

/// Stop any active workspace watcher.
pub fn stop_workspace_watcher() {
    if let Ok(mut guard) = WORKSPACE_WATCHER.lock() {
        *guard = None;
    }
}

/// Watch a set of individual file paths for external changes.
/// Emits `markz:file-externally-changed` with the file path on change.
#[tauri::command]
pub fn watch_open_files(paths: Vec<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    // Stop any existing file watcher
    if let Ok(mut guard) = FILE_WATCHER.lock() {
        *guard = None;
    }

    if paths.is_empty() {
        return Ok(());
    }

    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        if let Ok(event) = res {
            for path in event.paths {
                if let Some(path_str) = path.to_str() {
                    let _ = tx.send(path_str.to_string());
                }
            }
        }
    })
    .map_err(|e| e.to_string())?;

    for path in &paths {
        if let Err(e) = watcher.watch(std::path::Path::new(path), RecursiveMode::NonRecursive) {
            log::warn!("Failed to watch file {}: {}", path, e);
        }
    }

    std::thread::spawn(move || {
        while let Ok(path) = rx.recv() {
            // Debounce per path: wait for events to settle
            std::thread::sleep(Duration::from_millis(500));
            while rx.recv_timeout(Duration::from_millis(100)).is_ok() {}
            let _ = app_handle.emit("markz:file-externally-changed", path.clone());
        }
    });

    if let Ok(mut guard) = FILE_WATCHER.lock() {
        *guard = Some(watcher);
    }

    Ok(())
}

#[tauri::command]
pub fn unwatch_open_files() {
    if let Ok(mut guard) = FILE_WATCHER.lock() {
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
