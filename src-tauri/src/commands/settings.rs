#[tauri::command]
pub async fn get_settings() -> Result<markz_config::Settings, String> {
    let settings = if let Some(path) = markz_config::settings_path() {
        if path.exists() {
            let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            markz_config::Settings::default()
        }
    } else {
        markz_config::Settings::default()
    };
    Ok(settings)
}

#[tauri::command]
pub async fn update_settings(settings: markz_config::Settings) -> Result<(), String> {
    if let Some(path) = markz_config::settings_path() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&path, data).map_err(|e| e.to_string())?;
    }
    Ok(())
}
