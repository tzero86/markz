#[cfg(windows)]
fn list_local_voices() -> Result<Vec<crate::edge_tts_crate::EdgeVoice>, String> {
    let voices = crate::windows_tts::list_voices()?;
    Ok(voices.into_iter().map(|v| crate::edge_tts_crate::EdgeVoice {
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
fn list_local_voices() -> Result<Vec<crate::edge_tts_crate::EdgeVoice>, String> {
    Err("Local TTS is only available on Windows".to_string())
}

#[cfg(windows)]
fn synthesize_local(text: &str, voice_id: &str) -> Result<Vec<u8>, String> {
    crate::windows_tts::synthesize(text, Some(voice_id))
}

#[cfg(not(windows))]
fn synthesize_local(_text: &str, _voice_id: &str) -> Result<Vec<u8>, String> {
    Err("Local TTS is only available on Windows".to_string())
}

#[tauri::command]
pub async fn tts_get_voices(engine: String) -> Result<Vec<crate::edge_tts_crate::EdgeVoice>, String> {
    match engine.as_str() {
        "local" => list_local_voices(),
        "online" => {
            let voices = tauri::async_runtime::spawn_blocking(|| crate::edge_tts_crate::list_voices())
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

#[tauri::command]
pub async fn tts_speak(engine: String, text: String, voice_id: String) -> Result<String, String> {
    use base64::Engine;

    let audio = match engine.as_str() {
        "local" => synthesize_local(&text, &voice_id),
        "online" => {
            tauri::async_runtime::spawn_blocking(move || crate::edge_tts_crate::synthesize(&text, &voice_id))
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
