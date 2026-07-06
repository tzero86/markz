use markz_core::frontmatter;
use markz_core::parser;
use markz_core::util::is_markdown_path;

use markz_convert::context::ConvertContext;
use std::sync::Mutex;
use base64::Engine;
use log::LevelFilter;
use tauri::{Emitter, Manager};
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

#[cfg(windows)]
mod windows_tts;
mod edge_tts_crate;
mod commands;
pub struct AppState {
    pub current_path: Mutex<Option<String>>,
    pub pending_open: Mutex<Vec<String>>,
}

/// Queue a file path to be opened by the frontend, and emit an event if the UI is listening.
pub fn queue_open_file<R: tauri::Runtime>(app: &tauri::AppHandle<R>, path: String) {
    if !is_markdown_path(&path) {
        return;
    }
    if let Ok(mut pending) = app.state::<AppState>().pending_open.lock() {
        pending.push(path.clone());
    }
    let _ = app.emit("open-file", path);
}

/// Parse command-line arguments and queue the first existing Markdown file.
pub fn handle_argv<R: tauri::Runtime>(app: &tauri::AppHandle<R>, args: &[String]) {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let path = if cfg!(windows) && arg.starts_with("file:///") {
            arg[8..].to_string()
        } else if arg.starts_with("file://") {
            arg[7..].to_string()
        } else {
            arg.clone()
        };
        if std::path::Path::new(&path).is_file() {
            queue_open_file(app, path);
            break;
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

pub fn parse_document(markdown: &str) -> markz_core::ast::Document {
    let text = parser::preprocess_math(markdown);
    let mut doc = parser::parse(&text);
    let remaining = frontmatter::parse_into_document(&text, &mut doc);
    if !remaining.is_empty() {
        doc.blocks = parser::parse(&remaining).blocks;
    }
    doc
}

pub fn read_settings_sync() -> Option<markz_config::Settings> {
    let path = markz_config::settings_path()?;
    if !path.exists() {
        return None;
    }
    let data = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn make_context(doc_path: Option<String>) -> ConvertContext {
    let embed_remote_images = read_settings_sync()
        .map(|s| s.embed_remote_images)
        .unwrap_or(false);
    ConvertContext::new(doc_path.map(std::path::PathBuf::from))
        .with_embed_remote_images(embed_remote_images)
}

pub fn guess_mime(path: &std::path::Path) -> &'static str {
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
pub fn embed_local_images(html: &str, base_dir: &std::path::Path) -> String {
    let mut out = String::with_capacity(html.len() * 2);
    let mut rest = html;

    while let Some(pos) = rest.find(r#"src=""#) {
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
                Err(_) => out.push_str(src),
            }
        }

        rest = &rest[end..];
    }

    out.push_str(rest);
    out
}

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct DocumentInfo {
    path: String,
    content: String,
    title: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SessionTab {
    content: String,
    path: Option<String>,
    title: String,
    is_dirty: bool,
    #[serde(default)]
    pinned: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
pub struct SessionState {
    tabs: Vec<SessionTab>,
    active_tab_path: Option<String>,
    workspace_path: Option<String>,
}

pub fn session_path() -> Option<std::path::PathBuf> {
    let mut dir = dirs::config_dir()?;
    dir.push("markz");
    std::fs::create_dir_all(&dir).ok()?;
    dir.push("session.json");
    Some(dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            handle_argv(app, &argv);
        }));
    }

    builder = builder
        .manage(AppState {
            current_path: Mutex::new(None),
            pending_open: Mutex::new(vec![]),
        })
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            handle_argv(app.handle(), &args);
            Ok(())
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
            commands::documents::render_preview,
            commands::documents::open_document,
            commands::documents::save_document,
            commands::documents::open_file_dialog,
            commands::documents::save_file_dialog,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::documents::generate_toc,
            commands::documents::process_pasted_image,
            commands::documents::process_dropped_image,
            commands::convert::convert_to_jira,
            commands::convert::convert_to_confluence,
            commands::convert::convert_to_slack,
            commands::convert::convert_to_github,
            commands::convert::convert_html_to_markdown,
            commands::tts::tts_get_voices,
            commands::tts::tts_speak,
            commands::convert::export_to_docx,
            commands::git::git_status,
            commands::git::git_diff,
            commands::documents::compute_stats,
            commands::backlinks::get_backlinks,
            commands::backlinks::get_wikilinks,
            commands::backlinks::resolve_wikilink,
            commands::templates::list_templates,
            commands::templates::get_template,
            commands::templates::save_template,
            commands::templates::delete_template,
            commands::templates::apply_template,
            commands::logging::log_frontend,
            commands::session::save_session,
            commands::session::load_session,
            commands::pandoc::pandoc_available,
            commands::pandoc::export_via_pandoc,
            commands::pandoc::copy_via_pandoc,
            commands::session::clear_session_disk,
            commands::workspace::open_folder_dialog,
            commands::workspace::list_workspace_files,
            commands::workspace::search_workspace,
            commands::watcher::watch_workspace,
            commands::watcher::unwatch_workspace,
            commands::watcher::watch_open_files,
            commands::watcher::unwatch_open_files,
            commands::presentation::render_slides,
            commands::app::take_pending_open,
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    #[cfg(target_os = "macos")]
    app.run(|app, event| {
        if let tauri::RunEvent::Opened { urls } = event {
            for url in urls {
                if url.scheme() == "file" {
                    if let Ok(path) = url.to_file_path() {
                        queue_open_file(app, path.to_string_lossy().to_string());
                    }
                }
            }
        }
    });
    #[cfg(not(target_os = "macos"))]
    app.run(|_app, _event| {});
}
