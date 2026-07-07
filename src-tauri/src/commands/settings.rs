#[tauri::command]
pub async fn get_settings() -> Result<markz_config::Settings, String> {
    let settings = if let Some(path) = markz_config::settings_path() {
        match tokio::fs::try_exists(&path).await {
            Ok(true) => {
                let data = tokio::fs::read_to_string(&path)
                    .await
                    .map_err(|e| e.to_string())?;
                serde_json::from_str(&data).unwrap_or_default()
            }
            Ok(false) => markz_config::Settings::default(),
            Err(e) => return Err(e.to_string()),
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
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }
        let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        tokio::fs::write(&path, data)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
