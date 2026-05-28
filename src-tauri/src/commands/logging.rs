#[tauri::command]
pub async fn log_frontend(level: String, message: String) {
    match level.as_str() {
        "trace" => log::trace!("{}", message),
        "debug" => log::debug!("{}", message),
        "info" => log::info!("{}", message),
        "warn" => log::warn!("{}", message),
        "error" => log::error!("{}", message),
        _ => log::info!("{}", message),
    }
}
