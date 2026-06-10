use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub theme: ThemeSetting,
    pub editor_font_size: u8,
    pub editor_font_family: String,
    pub line_height: f32,
    pub word_wrap: bool,
    pub show_line_numbers: bool,
    pub show_minimap: bool,
    pub preview_max_width: u16,
    pub auto_save: bool,
    pub auto_save_interval_seconds: u16,
    pub embed_remote_images: bool,
    pub show_outline: bool,
    pub view_mode: ViewMode,
    pub preview_font_size: u8,
    pub reduced_motion: bool,
    pub ui_font_size: u8,
    pub tts_engine: String,
    pub tts_voice_id: String,
    pub tts_rate: f32,
    pub custom_css: String,
    pub pandoc_path: Option<String>,
    pub auto_open_folder: bool,
    pub enable_spellcheck: bool,
    pub custom_dictionary: Vec<String>,
    pub split_direction: SplitDirection,
    pub vim_mode: bool,
    pub debug_panel_collapsed: bool,
    pub debug_panel_height: u16,
    pub debug_log_filter: String,
  pub theme_preset: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SplitDirection {
    #[default]
    Horizontal,
    Vertical,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeSetting {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ViewMode {
    #[default]
    Split,
    Editor,
    Preview,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: ThemeSetting::System,
            editor_font_size: 14,
            editor_font_family: "JetBrains Mono".to_string(),
            line_height: 1.7,
            word_wrap: true,
            show_line_numbers: true,
            show_minimap: false,
            preview_max_width: 820,
            auto_save: true,
            auto_save_interval_seconds: 30,
            embed_remote_images: false,
            show_outline: true,
            view_mode: ViewMode::Split,
            preview_font_size: 16,
            reduced_motion: false,
            ui_font_size: 14,
            tts_engine: "online".to_string(),
            tts_voice_id: "".to_string(),
            tts_rate: 1.0,
            custom_css: String::new(),
            pandoc_path: None,
            auto_open_folder: true,
            enable_spellcheck: true,
            custom_dictionary: Vec::new(),
            split_direction: SplitDirection::Horizontal,
            vim_mode: false,
            debug_panel_collapsed: true,
            debug_panel_height: 180,
            debug_log_filter: "info".to_string(),
            theme_preset: String::new(),
        }
    }
}

pub fn config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("markz"))
}

pub fn settings_path() -> Option<PathBuf> {
    config_dir().map(|d| d.join("settings.json"))
}
