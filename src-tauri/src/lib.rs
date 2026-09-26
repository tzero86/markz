use markz_core::parser;
use markz_core::util::is_markdown_path;

use markz_convert::context::ConvertContext;
use std::sync::Mutex;
use base64::Engine;
use log::LevelFilter;
use tauri::{Emitter, Manager};
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

#[cfg(all(windows, feature = "tts"))]
mod windows_tts;
#[cfg(feature = "tts")]
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
    parser::parse_full(markdown)
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

/// Extensions the preview pane can display, and the set `open_document`
/// classifies as `kind: "image"`. Defined once at the crate root and imported
/// by `commands::documents` so the two classifications cannot drift apart.
pub(crate) const IMAGE_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif",
];

/// Largest local image inlined into the preview HTML. Bigger files keep their
/// original `src` and simply fail to load instead of freezing the webview.
const MAX_EMBED_IMAGE_BYTES: u64 = 20 * 1024 * 1024;

/// Drop a `file://` scheme, plus the extra slash Windows URLs carry, so that
/// `file:///C:/x.png` yields `C:/x.png` rather than an unrooted `/C:/x.png`
/// that `Path::is_absolute` would compare against the current drive root.
fn strip_file_scheme(src: &str) -> &str {
    let rest = src.strip_prefix("file://").unwrap_or(src);
    if let Some(without_slash) = rest.strip_prefix('/') {
        let bytes = without_slash.as_bytes();
        if bytes.len() >= 2 && bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
            return without_slash;
        }
    }
    rest
}

/// Resolve an `<img src>` value to a readable file inside `base_dir`, or `None`
/// when the reference must not be touched. `src` comes straight from document
/// content, so UNC/device paths (`\\server\share`, `\\.\C:`), any `..` segment,
/// non-image extensions, and paths whose canonical form escapes `base_dir` are
/// all refused before any filesystem access.
fn resolve_local_image(
    base_dir: &std::path::Path,
    src: &str,
) -> Option<std::path::PathBuf> {
    let value = strip_file_scheme(src);

    if value.starts_with(r"\\") || value.starts_with("//") {
        return None;
    }
    if value.split(['/', '\\']).any(|segment| segment == "..") {
        return None;
    }

    let candidate = std::path::Path::new(value);
    let extension = candidate
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())?;
    if !IMAGE_EXTS.contains(&extension.as_str()) {
        return None;
    }

    let full_path = if candidate.is_absolute() {
        std::path::PathBuf::from(value)
    } else {
        base_dir.join(value)
    };
    let canonical = full_path.canonicalize().ok()?;
    let base_canonical = base_dir.canonicalize().ok()?;
    if !canonical.starts_with(&base_canonical) {
        return None;
    }
    Some(canonical)
}

/// Read an image and encode it as a base64 `data:` URI, or `None` when it is
/// unreadable or larger than `MAX_EMBED_IMAGE_BYTES`.
async fn read_image_data_uri(path: &std::path::Path) -> Option<String> {
    let size = tokio::fs::metadata(path).await.ok()?.len();
    if size > MAX_EMBED_IMAGE_BYTES {
        log::warn!(
            "[embed_local_images] not inlining {}: {} bytes exceeds the {} byte limit",
            path.display(),
            size,
            MAX_EMBED_IMAGE_BYTES
        );
        return None;
    }
    let data = tokio::fs::read(path).await.ok()?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Some(format!("data:{};base64,{}", guess_mime(path), b64))
}

/// Scan rendered HTML and embed local image files as base64 data URIs.
/// This is async so blocking file reads don't starve the Tauri runtime.
/// References that are refused (see `resolve_local_image`) or unreadable keep
/// their original `src`, so the image simply does not load.
pub async fn embed_local_images(html: &str, base_dir: &std::path::Path) -> String {
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
            match resolve_local_image(base_dir, src) {
                Some(path) => match read_image_data_uri(&path).await {
                    Some(data_uri) => out.push_str(&data_uri),
                    None => out.push_str(src),
                },
                None => out.push_str(src),
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
    /// How the frontend should treat this file: "text" (editable/read-only
    /// text), "image" (preview only), or "binary" (not displayable).
    kind: String,
    /// File size in bytes.
    size: u64,
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

pub async fn session_path_async() -> Option<std::path::PathBuf> {
    let mut dir = dirs::config_dir()?;
    dir.push("markz");
    tokio::fs::create_dir_all(&dir).await.ok()?;
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
        .register_uri_scheme_protocol("asset", |_ctx, request| {
            // Serve local files (e.g. images opened in the preview pane) to the
            // webview. The URL is `asset://localhost/<absolute path>`.
            let path = request.uri().path().trim_start_matches('/');
            let decoded = percent_encoding::percent_decode_str(path)
                .decode_utf8_lossy()
                .to_string();
            let file = std::path::PathBuf::from(&decoded);
            match std::fs::read(&file) {
                Ok(data) => tauri::http::Response::builder()
                    .header("Content-Type", crate::guess_mime(&file))
                    .body(data)
                    .unwrap(),
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .unwrap(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::documents::render_preview,
            commands::documents::open_document,
            commands::documents::save_document,
            commands::documents::read_file_text,
            commands::documents::open_file_dialog,
            commands::documents::save_file_dialog,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::documents::generate_toc,
            commands::documents::save_image,
            commands::convert::convert_to_jira,
            commands::convert::convert_to_confluence,
            commands::convert::convert_to_slack,
            commands::convert::convert_to_github,
            commands::convert::convert_html_to_markdown,
            #[cfg(feature = "tts")]
            commands::tts::tts_get_voices,
            #[cfg(feature = "tts")]
            commands::tts::tts_speak,
            #[cfg(feature = "docx")]
            commands::convert::export_to_docx,
            #[cfg(feature = "git")]
            commands::git::git_status,
            #[cfg(feature = "git")]
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
            #[cfg(feature = "pandoc")]
            commands::pandoc::pandoc_available,
            #[cfg(feature = "pandoc")]
            commands::pandoc::export_via_pandoc,
            #[cfg(feature = "pandoc")]
            commands::pandoc::copy_via_pandoc,
            commands::session::clear_session_disk,
            commands::workspace::open_folder_dialog,
            commands::workspace::list_workspace_files_shallow,
            commands::workspace::list_dir_children,
            commands::workspace::create_workspace_file,
            commands::workspace::create_workspace_folder,
            commands::workspace::rename_workspace_entry,
            commands::workspace::delete_workspace_entry,
            commands::workspace::search_workspace,
            #[cfg(feature = "watcher")]
            commands::watcher::watch_workspace,
            #[cfg(feature = "watcher")]
            commands::watcher::unwatch_workspace,
            #[cfg(feature = "watcher")]
            commands::watcher::watch_open_files,
            #[cfg(feature = "watcher")]
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

#[cfg(test)]
mod tests {
    use super::*;

    /// A 1x1 PNG header. Only the extension matters for the decision logic.
    const TINY_PNG: &[u8] = &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// `file:///C:/...` on Windows, `file:///tmp/...` elsewhere.
    fn file_url(path: &std::path::Path) -> String {
        let display = path.display().to_string().replace('\\', "/");
        if display.starts_with('/') {
            format!("file://{}", display)
        } else {
            format!("file:///{}", display)
        }
    }

    #[test]
    fn unc_and_device_paths_are_refused() {
        let dir = tempfile::tempdir().unwrap();

        assert_eq!(resolve_local_image(dir.path(), r"\\server\share\a.png"), None);
        assert_eq!(resolve_local_image(dir.path(), r"\\.\C:\x.png"), None);
        assert_eq!(resolve_local_image(dir.path(), r"\\?\C:\x.png"), None);
        assert_eq!(resolve_local_image(dir.path(), "//server/share/a.png"), None);
    }

    #[test]
    fn paths_outside_the_document_directory_are_refused() {
        let parent = tempfile::tempdir().unwrap();
        let base = parent.path().join("docs");
        std::fs::create_dir_all(&base).unwrap();
        // A real image that only an escaping or absolute reference can reach.
        let outside = parent.path().join("outside.png");
        std::fs::write(&outside, TINY_PNG).unwrap();

        assert_eq!(resolve_local_image(&base, "../outside.png"), None);
        assert_eq!(resolve_local_image(&base, outside.to_str().unwrap()), None);
        assert_eq!(
            resolve_local_image(&base, &file_url(&outside)),
            None,
            "a file:// URL outside the document directory must be refused"
        );
        assert_eq!(resolve_local_image(&base, "C:/Windows/win.ini"), None);
    }

    #[test]
    fn non_image_extensions_are_refused() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("notes.txt"), b"hello").unwrap();
        std::fs::write(dir.path().join("key.pem"), b"-----BEGIN KEY-----").unwrap();

        assert_eq!(resolve_local_image(dir.path(), "notes.txt"), None);
        assert_eq!(resolve_local_image(dir.path(), "key.pem"), None);
    }

    #[test]
    fn images_inside_the_document_directory_resolve() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("assets")).unwrap();
        let pic = dir.path().join("assets").join("pic.png");
        std::fs::write(&pic, TINY_PNG).unwrap();
        let canonical = pic.canonicalize().unwrap();

        assert_eq!(
            resolve_local_image(dir.path(), "assets/pic.png"),
            Some(canonical.clone())
        );
        assert_eq!(
            resolve_local_image(dir.path(), pic.to_str().unwrap()),
            Some(canonical.clone())
        );
        assert_eq!(
            resolve_local_image(dir.path(), &file_url(&pic)),
            Some(canonical.clone()),
            "a file:// URL inside the document directory must resolve"
        );
    }

    #[test]
    fn uppercase_extensions_are_accepted() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("SHOT.PNG"), TINY_PNG).unwrap();

        assert!(resolve_local_image(dir.path(), "SHOT.PNG").is_some());
    }

    #[test]
    fn file_scheme_strips_one_slash_to_keep_the_drive_letter() {
        assert_eq!(strip_file_scheme("file:///C:/docs/pic.png"), "C:/docs/pic.png");
        assert_eq!(strip_file_scheme("file:///tmp/pic.png"), "/tmp/pic.png");
        assert_eq!(strip_file_scheme("photo.png"), "photo.png");
    }

    #[tokio::test]
    async fn embed_inlines_local_images_and_leaves_refused_sources_untouched() {
        let parent = tempfile::tempdir().unwrap();
        let base = parent.path().join("docs");
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("pic.png"), TINY_PNG).unwrap();
        std::fs::write(parent.path().join("outside.png"), TINY_PNG).unwrap();

        let html = concat!(
            r#"<p><img src="pic.png" alt="local"></p>"#,
            r#"<p><img src="\\server\share\a.png"></p>"#,
            r#"<p><img src="../outside.png"></p>"#,
            r#"<p><img src="missing.png"></p>"#,
        );
        let out = embed_local_images(html, &base).await;

        assert!(
            out.contains(r#"src="data:image/png;base64,iVBORw0KGgo=""#),
            "the document-relative image was not inlined: {out}"
        );
        assert!(
            out.contains(r#"src="\\server\share\a.png""#),
            "the UNC source was rewritten: {out}"
        );
        assert!(
            out.contains(r#"src="../outside.png""#),
            "the escaping source was rewritten: {out}"
        );
        assert!(
            out.contains(r#"src="missing.png""#),
            "the missing source was rewritten: {out}"
        );
    }

    #[tokio::test]
    async fn oversized_images_are_not_inlined() {
        let dir = tempfile::tempdir().unwrap();
        let big = dir.path().join("big.png");
        std::fs::write(&big, vec![0u8; MAX_EMBED_IMAGE_BYTES as usize + 1]).unwrap();

        let out = embed_local_images(r#"<img src="big.png">"#, dir.path()).await;
        assert_eq!(out, r#"<img src="big.png">"#);
    }
}
