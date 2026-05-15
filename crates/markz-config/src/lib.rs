use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeSetting {
    Light,
    Dark,
    System,
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
        }
    }
}

pub fn config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("markz"))
}

pub fn settings_path() -> Option<PathBuf> {
    config_dir().map(|d| d.join("settings.json"))
}
