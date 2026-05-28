#[tauri::command]
pub async fn list_templates() -> Result<Vec<markz_templates::Template>, String> {
    markz_templates::list_templates().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_template(id: String) -> Result<Option<markz_templates::Template>, String> {
    markz_templates::get_template(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_template(
    id: String,
    name: String,
    category: String,
    description: String,
    content: String,
) -> Result<(), String> {
    let template = markz_templates::Template {
        id,
        name,
        category,
        description,
        content,
        builtin: false,
    };
    markz_templates::save_template(&template).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_template(id: String) -> Result<(), String> {
    markz_templates::delete_template(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn apply_template(id: String) -> Result<String, String> {
    let template = markz_templates::get_template(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Template not found".to_string())?;
    Ok(markz_templates::substitute_variables(&template.content))
}
