export interface AppSettings {
  theme: string;
  editor_font_size: number;
  editor_font_family: string;
  line_height: number;
  word_wrap: boolean;
  show_line_numbers: boolean;
  show_minimap: boolean;
  preview_max_width: number;
  auto_save: boolean;
  auto_save_interval_seconds: number;
  embed_remote_images: boolean;
  show_outline: boolean;
  view_mode: string;
  preview_font_size: number;
  reduced_motion: boolean;
  ui_font_size: number;
  tts_engine: string;
  tts_voice_id: string;
  tts_rate: number;
  custom_css: string;
  pandoc_path: string | null;
  custom_dictionary: string[];
  split_direction: string;
  vim_mode: boolean;
  auto_open_folder: boolean;
  enable_spellcheck: boolean;
}
