use sha2::{Sha256, Digest};
use std::time::{SystemTime, UNIX_EPOCH};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message;

pub const TRUSTED_CLIENT_TOKEN: &str = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH: i64 = 11644473600;
const CHROMIUM_FULL_VERSION: &str = "134.0.3124.66";
pub const BASE_URL: &str = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0";

fn generate_sec_ms_gec() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let s_to_ns: i64 = 1_000_000_000;
    let mut ticks = now + WIN_EPOCH;
    ticks -= ticks % 300;
    ticks *= s_to_ns / 100;

    let str_to_hash = format!("{}{}", ticks, TRUSTED_CLIENT_TOKEN);
    let mut hasher = Sha256::new();
    hasher.update(str_to_hash.as_bytes());
    let result = hasher.finalize();
    hex::encode_upper(result)
}

fn uuid_no_dashes() -> String {
    uuid::Uuid::new_v4()
        .to_string()
        .replace("-", "")
        .to_uppercase()
}

fn build_websocket_url() -> String {
    let sec_ms_gec = generate_sec_ms_gec();
    let sec_ms_gec_version = format!("1-{}", CHROMIUM_FULL_VERSION);
    let connection_id = uuid_no_dashes();

    format!(
        "wss://{}/edge/v1?TrustedClientToken={}&Sec-MS-GEC={}&Sec-MS-GEC-Version={}&ConnectionId={}",
        BASE_URL, TRUSTED_CLIENT_TOKEN, sec_ms_gec, sec_ms_gec_version, connection_id
    )
}

fn generate_command(output_format: &str) -> String {
    let timestamp = chrono::Local::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    format!(
        "X-Timestamp:{}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{{\"context\":{{\"synthesis\":{{\"audio\":{{\"metadataoptions\":{{\"sentenceBoundaryEnabled\":false,\"wordBoundaryEnabled\":true}},\"outputFormat\":\"{}\"}}}}}}}}\r\n",
        timestamp, output_format
    )
}

fn generate_ssml(text: &str, voice: &str, rate: &str, pitch: &str, volume: &str) -> String {
    let request_id = uuid_no_dashes();
    let timestamp = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    format!(
        "X-RequestId:{}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:{}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>\r\n\t<voice name='{}'>\r\n\t\t<prosody pitch='{}' rate='{}' volume='{}'>\r\n\t\t\t{}\r\n\t\t</prosody>\r\n\t</voice>\r\n</speak>",
        request_id, timestamp, voice, pitch, rate, volume, text
    )
}

fn parse_message_header(data: &[u8]) -> Option<(String, Vec<u8>)> {
    if data.len() < 2 {
        return None;
    }
    let header_length = ((data[0] as usize) << 8) | (data[1] as usize);
    let total_header_len = header_length + 2; // +2 for \r\n after header
    if data.len() < total_header_len {
        return None;
    }

    let header_bytes = &data[2..total_header_len];
    let header_text = String::from_utf8_lossy(header_bytes);

    // Check Path in header
    let path_line = header_text.lines().find(|line| line.starts_with("Path:"))?;
    let path = path_line.trim_start_matches("Path:").trim().to_string();

    let payload = data[total_header_len..].to_vec();
    Some((path, payload))
}

pub async fn synthesize(
    text: &str,
    voice: &str,
    rate: &str,
    pitch: &str,
    volume: &str,
) -> Result<Vec<u8>, String> {
    let url = build_websocket_url();

    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    let (mut write, mut read) = ws_stream.split();

    // Send config
    let config = generate_command("audio-24khz-48kbitrate-mono-mp3");
    write
        .send(Message::Text(config.into()))
        .await
        .map_err(|e| format!("Failed to send config: {}", e))?;

    // Send SSML
    let ssml = generate_ssml(text, voice, rate, pitch, volume);
    write
        .send(Message::Text(ssml.into()))
        .await
        .map_err(|e| format!("Failed to send SSML: {}", e))?;

    // Collect audio
    let mut audio_buffer: Vec<u8> = Vec::new();
    let mut turn_ended = false;

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Binary(data)) => {
                if let Some((path, payload)) = parse_message_header(&data) {
                    if path == "audio" {
                        audio_buffer.extend_from_slice(&payload);
                    }
                    // Ignore other paths like "turn.start"
                }
            }
            Ok(Message::Text(text)) => {
                if text.contains("Path:turn.end") {
                    turn_ended = true;
                    break;
                }
                // Check for errors
                if text.contains("X-StatusCode:") || text.contains("error") {
                    return Err(format!("TTS server error: {}", text));
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => return Err(format!("WebSocket error: {}", e)),
            _ => {}
        }
    }

    // Close our end gracefully
    let _ = write.send(Message::Close(None)).await;

    if audio_buffer.is_empty() && !turn_ended {
        return Err("No audio received from TTS server".to_string());
    }

    Ok(audio_buffer)
}
