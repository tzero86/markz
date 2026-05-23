use windows::core::HSTRING;
use windows::Media::SpeechSynthesis::SpeechSynthesizer;
use windows::Storage::Streams::DataReader;

#[derive(serde::Serialize)]
pub struct WindowsVoice {
    pub id: String,
    pub name: String,
    pub language: String,
    pub gender: String,
    pub description: String,
}

pub fn list_voices() -> Result<Vec<WindowsVoice>, String> {
    let all_voices = SpeechSynthesizer::AllVoices()
        .map_err(|e| format!("Failed to get voices: {}", e))?;

    let mut result = Vec::new();
    for voice in all_voices {
        let gender = match voice.Gender() {
            Ok(g) => match g {
                windows::Media::SpeechSynthesis::VoiceGender::Male => "Male",
                windows::Media::SpeechSynthesis::VoiceGender::Female => "Female",
                _ => "Unknown",
            },
            Err(_) => "Unknown",
        };

        result.push(WindowsVoice {
            id: voice.Id().map(|s| s.to_string()).unwrap_or_default(),
            name: voice.DisplayName().map(|s| s.to_string()).unwrap_or_default(),
            language: voice.Language().map(|s| s.to_string()).unwrap_or_default(),
            gender: gender.to_string(),
            description: voice.Description().map(|s| s.to_string()).unwrap_or_default(),
        });
    }

    result.sort_by(|a, b| {
        let a_en = a.language.starts_with("en");
        let b_en = b.language.starts_with("en");
        match (b_en, a_en) {
            (true, false) => std::cmp::Ordering::Greater,
            (false, true) => std::cmp::Ordering::Less,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(result)
}

pub fn synthesize(text: &str, voice_id: Option<&str>) -> Result<Vec<u8>, String> {
    let synth = SpeechSynthesizer::new().map_err(|e| format!("Failed to create synthesizer: {}", e))?;

    if let Some(id) = voice_id {
        let all_voices = SpeechSynthesizer::AllVoices()
            .map_err(|e| format!("Failed to get voices: {}", e))?;
        for voice in all_voices {
            if let Ok(vid) = voice.Id() {
                if vid.to_string() == id {
                    synth.SetVoice(&voice).map_err(|e| format!("Failed to set voice: {}", e))?;
                    break;
                }
            }
        }
    }

    let op = synth
        .SynthesizeTextToStreamAsync(&HSTRING::from(text))
        .map_err(|e| format!("Failed to start synthesis: {}", e))?;

    let stream = op.get().map_err(|e| format!("Synthesis failed: {}", e))?;

    let size = stream
        .Size()
        .map_err(|e| format!("Failed to get stream size: {}", e))? as u32;

    let input_stream = stream.GetInputStreamAt(0)
        .map_err(|e| format!("Failed to get input stream: {}", e))?;

    let reader = DataReader::CreateDataReader(&input_stream)
        .map_err(|e| format!("Failed to create data reader: {}", e))?;

    let load_op = reader
        .LoadAsync(size)
        .map_err(|e| format!("Failed to load data: {}", e))?;

    load_op.get().map_err(|e| format!("Data load failed: {}", e))?;

    let mut buffer = vec![0u8; size as usize];
    reader
        .ReadBytes(&mut buffer)
        .map_err(|e| format!("Failed to read bytes: {}", e))?;

    Ok(buffer)
}
