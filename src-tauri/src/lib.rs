use markz_core::frontmatter;
use markz_core::html;
use markz_core::parser;
use markz_core::toc;
use markz_convert::context::ConvertContext;
use std::sync::Mutex;
use base64::Engine;
use log::LevelFilter;
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

#[cfg(windows)]
mod windows_tts;
mod edge_tts_crate;
mod commands;
pub struct AppState {
    pub current_path: Mutex<Option<String>>,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn parse_document(markdown: &str) -> markz_core::ast::Document {
    let text = parser::preprocess_math(markdown);
    let mut doc = parser::parse(&text);
    let remaining = frontmatter::parse_into_document(&text, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = parser::parse(&remaining).blocks;
    }
    doc
}

fn read_settings_sync() -> Option<markz_config::Settings> {
    let path = markz_config::settings_path()?;
    if !path.exists() {
        return None;
    }
    let data = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}

fn make_context(doc_path: Option<String>) -> ConvertContext {
    let embed_remote_images = read_settings_sync()
        .map(|s| s.embed_remote_images)
        .unwrap_or(false);
    ConvertContext::new(doc_path.map(std::path::PathBuf::from))
        .with_embed_remote_images(embed_remote_images)
}

fn guess_mime(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}

/// Scan rendered HTML and embed local image files as base64 data URIs.
fn embed_local_images(html: &str, base_dir: &std::path::Path) -> String {
    let mut out = String::with_capacity(html.len() * 2);
    let mut rest = html;

    while let Some(pos) = rest.find(r#"src=""#) {
        // Copy everything up to and including src="
        out.push_str(&rest[..pos + 5]);
        rest = &rest[pos + 5..];

        let Some(end) = rest.find('"') else { break };
        let src = &rest[..end];

        if src.starts_with("http://")
            || src.starts_with("https://")
            || src.starts_with("data:")
        {
            out.push_str(src);
        } else {
            let path_str = if src.starts_with("file://") {
                &src[7..]
            } else {
                src
            };

            let full_path = if std::path::Path::new(path_str).is_absolute() {
                std::path::PathBuf::from(path_str)
            } else {
                base_dir.join(path_str)
            };

            match std::fs::read(&full_path) {
                Ok(data) => {
                    let mime = guess_mime(&full_path);
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
                    out.push_str(&format!("data:{};base64,{}", mime, b64));
                }
                Err(_) => out.push_str(src), // fallback: keep original path
            }
        }

        rest = &rest[end..];
    }

    out.push_str(rest);
    out
}

// ── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
async fn render_preview(
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let mut doc = parser::parse(&markdown);
    let remaining = frontmatter::parse_into_document(&markdown, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = parser::parse(&remaining).blocks;
    }
    let mut html = html::render(&doc);

    if let Some(ref path) = doc_path {
        if let Some(base_dir) = std::path::Path::new(path).parent() {
            html = embed_local_images(&html, base_dir);
        }
    }

    Ok(html)
}

#[tauri::command]
async fn open_document(path: String) -> Result<DocumentInfo, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let title = std::path::Path::new(&path).file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string();
        Ok(DocumentInfo { path, content, title })
}

#[tauri::command]
async fn save_document(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<DocumentInfo>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "mdx", "markdown"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            let content = std::fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
            let title = std::path::Path::new(&path_str).file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string();
                        Ok(Some(DocumentInfo {
                            path: path_str,
                            content,
                            title,
                        }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_file_dialog(
    app: tauri::AppHandle,
    default_name: Option<String>,
    filter_name: Option<String>,
    filter_extensions: Option<Vec<String>>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    if let (Some(name), Some(exts)) = (filter_name, filter_extensions) {
        let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(&name, &ext_refs);
    } else {
        dialog = dialog.add_filter("Markdown", &["md", "mdx", "markdown"]);
    }

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let path = dialog.blocking_save_file();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
async fn generate_toc(markdown: String) -> Result<Vec<markz_core::toc::TocEntry>, String> {
    let text = parser::preprocess_math(&markdown);
    let mut doc = parser::parse(&text);
    let remaining = frontmatter::parse_into_document(&text, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = parser::parse(&remaining).blocks;
    }
    Ok(toc::generate_toc(&doc))
}

#[tauri::command]
async fn process_pasted_image(
    image_data: Vec<u8>,
    filename: String,
    doc_path: Option<String>,
) -> Result<markz_images::ImageResult, String> {
    markz_images::save_image(&image_data, &filename, doc_path.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn process_dropped_image(
    image_data: Vec<u8>,
    filename: String,
    doc_path: Option<String>,
) -> Result<markz_images::ImageResult, String> {
    markz_images::save_image(&image_data, &filename, doc_path.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings() -> Result<markz_config::Settings, String> {
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
async fn update_settings(settings: markz_config::Settings) -> Result<(), String> {
    if let Some(path) = markz_config::settings_path() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&path, data).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn convert_to_jira(markdown: String, doc_path: Option<String>) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::jira::convert(&doc, &ctx))
}

#[tauri::command]
async fn convert_to_confluence(
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::confluence::convert(&doc, &ctx))
}

#[tauri::command]
async fn convert_to_slack(markdown: String, doc_path: Option<String>) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::slack::convert(&doc, &ctx))
}

#[tauri::command]
async fn convert_to_github(
    markdown: String,
    doc_path: Option<String>,
) -> Result<String, String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    Ok(markz_convert::github::convert(&doc, &ctx))
}

#[tauri::command]
async fn convert_html_to_markdown(html: String) -> Result<String, String> {
    Ok(markz_core::html_to_markdown::convert(&html))
}

#[cfg(windows)]
fn list_local_voices() -> Result<Vec<edge_tts_crate::EdgeVoice>, String> {
    let voices = windows_tts::list_voices()?;
    Ok(voices.into_iter().map(|v| edge_tts_crate::EdgeVoice {
        name: v.name.clone(),
        short_name: v.id,
        gender: v.gender,
        locale: v.language,
        suggested_codec: "audio-24khz-48kbitrate-mono-mp3".to_string(),
        friendly_name: v.name,
        status: "local".to_string(),
    }).collect())
}

#[cfg(not(windows))]
fn list_local_voices() -> Result<Vec<edge_tts_crate::EdgeVoice>, String> {
    Err("Local TTS is only available on Windows".to_string())
}

#[tauri::command]
async fn tts_get_voices(engine: String) -> Result<Vec<edge_tts_crate::EdgeVoice>, String> {
    match engine.as_str() {
        "local" => list_local_voices(),
        "online" => {
            let voices = tauri::async_runtime::spawn_blocking(|| edge_tts_crate::list_voices())
                .await
                .map_err(|e| {
                    if let tauri::Error::JoinError(join_err) = e {
                        if join_err.is_panic() {
                            let payload = join_err.into_panic();
                            if let Some(s) = payload.downcast_ref::<&str>() {
                                format!("TTS panicked: {}", s)
                            } else if let Some(s) = payload.downcast_ref::<String>() {
                                format!("TTS panicked: {}", s)
                            } else {
                                "TTS panicked with unknown payload".to_string()
                            }
                        } else {
                            format!("Task cancelled: {}", join_err)
                        }
                    } else {
                        format!("TTS task failed: {}", e)
                    }
                })??;
            Ok(voices.into_iter().take(50).collect())
        }
        _ => Err(format!("Unknown TTS engine: {}", engine)),
    }
}

#[cfg(windows)]
fn synthesize_local(text: &str, voice_id: &str) -> Result<Vec<u8>, String> {
    windows_tts::synthesize(text, Some(voice_id))
}

#[cfg(not(windows))]
fn synthesize_local(_text: &str, _voice_id: &str) -> Result<Vec<u8>, String> {
    Err("Local TTS is only available on Windows".to_string())
}

#[tauri::command]
async fn tts_speak(engine: String, text: String, voice_id: String) -> Result<String, String> {
    let audio = match engine.as_str() {
        "local" => synthesize_local(&text, &voice_id),
        "online" => {
            tauri::async_runtime::spawn_blocking(move || edge_tts_crate::synthesize(&text, &voice_id))
                .await
                .map_err(|e| {
                    if let tauri::Error::JoinError(join_err) = e {
                        if join_err.is_panic() {
                            let payload = join_err.into_panic();
                            if let Some(s) = payload.downcast_ref::<&str>() {
                                format!("TTS panicked: {}", s)
                            } else if let Some(s) = payload.downcast_ref::<String>() {
                                format!("TTS panicked: {}", s)
                            } else {
                                "TTS panicked with unknown payload".to_string()
                            }
                        } else {
                            format!("Task cancelled: {}", join_err)
                        }
                    } else {
                        format!("TTS task failed: {}", e)
                    }
                })?
        }
        _ => Err(format!("Unknown TTS engine: {}", engine)),
    }
    .map_err(|e| format!("TTS synthesis failed: {}", e))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&audio);
    Ok(b64)
}

#[tauri::command]
async fn export_to_docx(
    markdown: String,
    doc_path: Option<String>,
    output_path: String,
) -> Result<(), String> {
    let doc = parse_document(&markdown);
    let ctx = make_context(doc_path);
    let bytes = markz_convert::docx::convert(&doc, &ctx).map_err(|e| e.to_string())?;
    std::fs::write(&output_path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
async fn compute_stats(markdown: String) -> Result<markz_core::stats::DocumentStats, String> {
    let doc = parse_document(&markdown);
    Ok(markz_core::stats::compute(&doc))
}

#[tauri::command]
async fn list_templates() -> Result<Vec<markz_templates::Template>, String> {
    markz_templates::list_templates().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_template(id: String) -> Result<Option<markz_templates::Template>, String> {
    markz_templates::get_template(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_template(
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
async fn delete_template(id: String) -> Result<(), String> {
    markz_templates::delete_template(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn log_frontend(level: String, message: String) {
    match level.as_str() {
        "trace" => log::trace!("{}", message),
        "debug" => log::debug!("{}", message),
        "info" => log::info!("{}", message),
        "warn" => log::warn!("{}", message),
        "error" => log::error!("{}", message),
        _ => log::info!("{}", message),
    }
}

#[tauri::command]
async fn apply_template(id: String) -> Result<String, String> {
    let template = markz_templates::get_template(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Template not found".to_string())?;
    Ok(markz_templates::substitute_variables(&template.content))
}

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct DocumentInfo {
    path: String,
    content: String,
    title: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SessionTab {
    content: String,
    path: Option<String>,
    title: String,
    is_dirty: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct SessionState {
    tabs: Vec<SessionTab>,
    active_tab_path: Option<String>,
}

fn session_path() -> Option<std::path::PathBuf> {
    let mut dir = dirs::config_dir()?;
    dir.push("markz");
    std::fs::create_dir_all(&dir).ok()?;
    dir.push("session.json");
    Some(dir)
}

#[tauri::command]
async fn save_session(tabs: Vec<SessionTab>, active_tab_path: Option<String>) -> Result<(), String> {
    let path = session_path().ok_or("Could not determine session path")?;
    let state = SessionState { tabs, active_tab_path };
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_session() -> Result<Option<SessionState>, String> {
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
async fn clear_session_disk() -> Result<(), String> {
    if let Some(path) = session_path() {
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            current_path: Mutex::new(None),
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("markz".into()),
                    }),
                ])
                .level(LevelFilter::Debug)
                .rotation_strategy(RotationStrategy::KeepAll)
                .max_file_size(500_000)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            render_preview,
            open_document,
            save_document,
            open_file_dialog,
            save_file_dialog,
            get_settings,
            update_settings,
            generate_toc,
            process_pasted_image,
            process_dropped_image,
            convert_to_jira,
            convert_to_confluence,
            convert_to_slack,
            convert_to_github,
            convert_html_to_markdown,
            tts_get_voices,
            tts_speak,
            export_to_docx,
            compute_stats,
            commands::backlinks::get_backlinks,
            commands::backlinks::get_wikilinks,
            commands::backlinks::resolve_wikilink,
            list_templates,
            get_template,
            save_template,
            delete_template,
            apply_template,
            log_frontend,
            save_session,
            load_session,
            clear_session_disk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
