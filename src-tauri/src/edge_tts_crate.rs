use serde::{Deserialize, Serialize};
use tungstenite::{connect, Message};

const VOICE_LIST_URL: &str = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const USER_AGENT: &str = "Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.193 Mobile Safari/537.36 EdgA/143.0.3650.125";
const WSS_URL: &str = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=";
const ORIGIN: &str = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";

#[derive(Serialize, Clone)]
pub struct EdgeVoice {
    pub name: String,
    pub short_name: String,
    pub gender: String,
    pub locale: String,
    pub suggested_codec: String,
    pub friendly_name: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
struct Voice {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "ShortName")]
    short_name: Option<String>,
    #[serde(rename = "Gender")]
    gender: Option<String>,
    #[serde(rename = "Locale")]
    locale: Option<String>,
    #[serde(rename = "SuggestedCodec")]
    suggested_codec: Option<String>,
    #[serde(rename = "FriendlyName")]
    friendly_name: Option<String>,
    #[serde(rename = "Status")]
    status: Option<String>,
}

#[derive(Debug, Clone)]
struct SpeechConfig {
    voice_name: String,
    audio_format: String,
    pitch: i32,
    rate: i32,
    volume: i32,
}

impl From<&Voice> for SpeechConfig {
    fn from(voice: &Voice) -> Self {
        let audio_format = voice
            .suggested_codec
            .clone()
            .unwrap_or_else(|| "audio-24khz-48kbitrate-mono-mp3".to_owned());
        Self {
            voice_name: voice.name.clone(),
            audio_format,
            pitch: 0,
            rate: 0,
            volume: 0,
        }
    }
}

pub fn list_voices() -> Result<Vec<EdgeVoice>, String> {
    println!("[edge_tts] list_voices() called");
    log::debug!("[edge_tts] Building ureq agent with native-tls...");
    let tls_config = ureq::tls::TlsConfig::builder()
        .provider(ureq::tls::TlsProvider::NativeTls)
        .build();
    let config = ureq::config::Config::builder()
        .tls_config(tls_config)
        .build();

    log::debug!("[edge_tts] Sending GET request...");
    let mut response = match config
        .new_agent()
        .get(VOICE_LIST_URL)
        .header("User-Agent", USER_AGENT)
        .call() {
        Ok(r) => r,
        Err(e) => {
            println!("[edge_tts] HTTP request failed: {}", e);
            log::error!("[edge_tts] HTTP request failed: {}", e);
            return Err(format!("HTTP request failed: {}", e));
        }
    };

    log::debug!("[edge_tts] Parsing JSON response...");
    let voices: Vec<Voice> = match response.body_mut().read_json() {
        Ok(v) => v,
        Err(e) => {
            println!("[edge_tts] JSON parse failed: {}", e);
            log::error!("[edge_tts] JSON parse failed: {}", e);
            return Err(format!("JSON parse failed: {}", e));
        }
    };
    println!("[edge_tts] Parsed {} voices", voices.len());

    if voices.is_empty() {
        println!("[edge_tts] No voices parsed, returning test voice");
        return Ok(vec![EdgeVoice {
            name: "Test Voice".to_string(),
            short_name: "Test".to_string(),
            gender: "Unknown".to_string(),
            locale: "en-US".to_string(),
            suggested_codec: "audio-24khz-48kbitrate-mono-mp3".to_string(),
            friendly_name: "Test Voice".to_string(),
            status: "Test".to_string(),
        }]);
    }

    let mut result: Vec<EdgeVoice> = voices
        .into_iter()
        .map(|v| EdgeVoice {
            name: v.name,
            short_name: v.short_name.unwrap_or_default(),
            gender: v.gender.unwrap_or_default(),
            locale: v.locale.unwrap_or_default(),
            suggested_codec: v.suggested_codec.unwrap_or_default(),
            friendly_name: v.friendly_name.unwrap_or_default(),
            status: v.status.unwrap_or_default(),
        })
        .collect();

    result.sort_by(|a, b| {
        let a_en = a.locale.starts_with("en");
        let b_en = b.locale.starts_with("en");
        match (b_en, a_en) {
            (true, false) => std::cmp::Ordering::Greater,
            (false, true) => std::cmp::Ordering::Less,
            _ => a.locale.cmp(&b.locale).then(a.name.cmp(&b.name)),
        }
    });

    Ok(result)
}

fn gen_sec_ms_gec() -> String {
    use sha2::Digest;

    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        + std::time::Duration::from_secs(11644473600);
    let ticks = duration.as_nanos() / 100;
    let ticks = ticks - ticks % 3_000_000_000;

    let mut hasher = sha2::Sha256::new();
    hasher.update(format!("{ticks}6A5AA1D4EAFF4E9FB37E23D68491D6F4"));
    let hash_code = hasher.finalize();
    let mut hex_str = String::new();
    for &byte in hash_code.iter() {
        hex_str.push_str(&format!("{:02X}", byte));
    }
    hex_str
}

fn build_websocket_request() -> Result<tungstenite::handshake::client::Request, String> {
    use tungstenite::client::IntoClientRequest;
    use tungstenite::http::header;

    let uuid = uuid::Uuid::new_v4().simple().to_string();
    let sec_ms_gec = gen_sec_ms_gec();
    let sec_ms_gec_version = "1-130.0.2849.68";
    let mut request = format!(
        "{}{}&Sec-MS-GEC={}&Sec-MS-GEC-Version={}",
        WSS_URL, uuid, sec_ms_gec, sec_ms_gec_version
    )
    .into_client_request()
    .map_err(|e| format!("Invalid URL: {}", e))?;

    let headers = request.headers_mut();
    headers.insert(header::PRAGMA, "no-cache".parse().unwrap());
    headers.insert(header::CACHE_CONTROL, "no-cache".parse().unwrap());
    headers.insert(header::USER_AGENT, USER_AGENT.parse().unwrap());
    headers.insert(header::ORIGIN, ORIGIN.parse().unwrap());
    Ok(request)
}

fn build_config_message(config: &SpeechConfig) -> Message {
    static SPEECH_CONFIG_HEAD: &str = r#"{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":""#;
    static SPEECH_CONFIG_TAIL: &str = r#""}}}}"#;
    let msg = format!(
        "X-Timestamp:{}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{}{}{}",
        chrono::Local::now().to_rfc2822(),
        SPEECH_CONFIG_HEAD,
        config.audio_format,
        SPEECH_CONFIG_TAIL
    );
    Message::Text(msg.into())
}

fn xml_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn build_ssml_message(text: &str, config: &SpeechConfig) -> Message {
    let escaped = xml_escape(text);
    let ssml = format!(
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='{}'><prosody pitch='{:+}Hz' rate='{:+}%' volume='{:+}%'>{}</prosody></voice></speak>",
        config.voice_name, config.pitch, config.rate, config.volume, escaped,
    );
    let msg = format!(
        "X-RequestId:{}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:{}\r\nPath:ssml\r\n\r\n{}",
        uuid::Uuid::new_v4().simple(),
        chrono::Local::now().to_rfc2822(),
        ssml,
    );
    Message::Text(msg.into())
}

struct AudioMetadata {
    #[allow(dead_code)]
    metadata_type: Option<String>,
    #[allow(dead_code)]
    offset: u64,
    #[allow(dead_code)]
    duration: u64,
    #[allow(dead_code)]
    text: Option<String>,
    #[allow(dead_code)]
    length: u64,
    #[allow(dead_code)]
    boundary_type: Option<String>,
}

impl AudioMetadata {
    fn from_str(text: &str) -> Result<Vec<Self>, String> {
        let value: serde_json::Value = serde_json::from_str(text)
            .map_err(|e| format!("Invalid metadata JSON: {}", e))?;
        if let Some(items) = value["Metadata"].as_array() {
            let mut audio_metadata = Vec::new();
            for item in items {
                let metadata_type = item["Type"].as_str().map(|x| x.to_owned());
                let offset = item["Data"]["Offset"].as_u64().unwrap_or(0);
                let duration = item["Data"]["Duration"].as_u64().unwrap_or(0);
                let text = item["Data"]["text"]["Text"].as_str().map(|x| x.to_owned());
                let length = item["Data"]["text"]["Length"].as_u64().unwrap_or(0);
                let boundary_type = item["Data"]["text"]["BoundaryType"]
                    .as_str()
                    .map(|x| x.to_owned());
                audio_metadata.push(AudioMetadata {
                    metadata_type,
                    offset,
                    duration,
                    text,
                    length,
                    boundary_type,
                });
            }
            Ok(audio_metadata)
        } else {
            Err("unexpected metadata format".to_string())
        }
    }
}

enum Payload {
    AudioBytes((tungstenite::Bytes, usize)),
    #[allow(dead_code)]
    AudioMetadata(Vec<AudioMetadata>),
}

impl Payload {
    fn process(
        message: Message,
        turn_start: &mut bool,
        response: &mut bool,
        turn_end: &mut bool,
    ) -> Result<Option<Payload>, String> {
        match message {
            Message::Text(text) => {
                if text.contains("audio.metadata") {
                    if let Some(index) = text.find("\r\n\r\n") {
                        let metadata = AudioMetadata::from_str(&text[index + 4..])?;
                        Ok(Some(Payload::AudioMetadata(metadata)))
                    } else {
                        Ok(None)
                    }
                } else if text.contains("turn.start") {
                    *turn_start = true;
                    Ok(None)
                } else if text.contains("response") {
                    *response = true;
                    Ok(None)
                } else if text.contains("turn.end") {
                    *turn_end = true;
                    Ok(None)
                } else {
                    Err(format!("unexpected text message: {}", text))
                }
            }
            Message::Binary(bytes) => {
                if *turn_start || *response {
                    let header_len = u16::from_be_bytes([bytes[0], bytes[1]]) as usize;
                    Ok(Some(Payload::AudioBytes((bytes, header_len + 2))))
                } else {
                    Ok(None)
                }
            }
            Message::Close(_) => {
                *turn_end = true;
                Ok(None)
            }
            _ => Err(format!("unexpected message: {:?}", message)),
        }
    }
}

pub fn synthesize(text: &str, voice_name: &str) -> Result<Vec<u8>, String> {
    log::debug!("[edge_tts] Fetching voice list to find '{}'...", voice_name);
    let voices = list_voices()?;

    let voice = voices
        .into_iter()
        .find(|v| v.short_name == voice_name || v.name == voice_name)
        .ok_or_else(|| format!("Voice '{}' not found", voice_name))?;

    let voice_obj = Voice {
        name: voice.name,
        short_name: Some(voice.short_name),
        gender: Some(voice.gender),
        locale: Some(voice.locale),
        suggested_codec: Some(voice.suggested_codec),
        friendly_name: Some(voice.friendly_name),
        status: Some(voice.status),
    };

    log::debug!("[edge_tts] Connecting to TTS service...");
    let config = SpeechConfig::from(&voice_obj);
    let request = build_websocket_request()?;
    let (mut socket, _) =
        connect(request).map_err(|e| format!("WebSocket connect failed: {}", e))?;

    log::debug!("[edge_tts] Sending config...");
    socket
        .send(build_config_message(&config))
        .map_err(|e| format!("Send config failed: {}", e))?;

    log::debug!("[edge_tts] Sending SSML...");
    socket
        .send(build_ssml_message(text, &config))
        .map_err(|e| format!("Send SSML failed: {}", e))?;

    log::debug!("[edge_tts] Reading audio...");
    let mut audio_parts: Vec<Vec<u8>> = Vec::new();
    let mut turn_start = false;
    let mut response = false;
    let mut turn_end = false;

    while !turn_end {
        let msg = socket
            .read()
            .map_err(|e| format!("WebSocket read failed: {}", e))?;
        let payload = Payload::process(msg, &mut turn_start, &mut response, &mut turn_end)
            .map_err(|e| format!("Process message failed: {}", e))?;

        if let Some(Payload::AudioBytes((bytes, index))) = payload {
            audio_parts.push(bytes[index..].to_vec());
        }
    }

    let result = audio_parts.into_iter().flatten().collect();
    Ok(result)
}
