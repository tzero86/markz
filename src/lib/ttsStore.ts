import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

export type TtsState = "idle" | "loading" | "playing" | "paused";
export type TtsEngine = "local" | "online";

export interface TtsVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  description: string;
  engine: TtsEngine;
}

interface TtsStore {
  state: TtsState;
  engine: TtsEngine;
  voice: TtsVoice | null;
  rate: number;
  voices: TtsVoice[];
  audio: HTMLAudioElement | null;
  error: string | null;
  loadingVoices: boolean;
}

function createTtsStore() {
  const { subscribe, set, update } = writable<TtsStore>({
    state: "idle",
    engine: "online",
    voice: null,
    rate: 1.0,
    voices: [],
    audio: null,
    error: null,
    loadingVoices: false,
  });

  async function loadVoices(engine: TtsEngine) {
    const current = get({ subscribe });
    // Skip if already loaded for this engine or currently loading
    if (current.loadingVoices) return;
    if (current.engine === engine && current.voices.length > 0) return;

    update((s) => ({ ...s, loadingVoices: true, error: null }));

    try {
      const raw = (await invoke("tts_get_voices", { engine })) as any[];

      if (!Array.isArray(raw)) {
        update((s) => ({ ...s, error: "Failed to load voices", loadingVoices: false }));
        return;
      }

      if (raw.length === 0) {
        update((s) => ({ ...s, error: "No voices available", loadingVoices: false }));
        return;
      }

      const voices: TtsVoice[] = [];
      for (let i = 0; i < raw.length; i++) {
        const v = raw[i];
        try {
          if (engine === "local") {
            voices.push({
              id: v.id ?? "",
              name: v.name ?? "",
              language: v.language ?? "",
              gender: v.gender ?? "",
              description: v.description ?? "",
              engine,
            });
          } else {
            voices.push({
              id: v.short_name ?? v.name ?? "",
              name: v.friendly_name ?? v.name ?? "",
              language: v.locale ?? "",
              gender: v.gender ?? "",
              description: `${v.locale ?? ""} — ${v.status ?? ""}`,
              engine,
            });
          }
        } catch (mapErr) {
          console.error("[ttsStore] Error mapping voice at index", i, ":", mapErr, "voice:", v);
        }
      }

      if (voices.length === 0) {
        update((s) => ({ ...s, error: "No voices available", loadingVoices: false }));
        return;
      }

      update((s) => {
        const preferred =
          s.voice &&
          s.voice.engine === engine &&
          voices.find((v) => v.id === s.voice!.id)
            ? s.voice
            : voices.find((v) => v.language.startsWith("en")) ||
              voices[0] ||
              null;
        return { ...s, engine, voices, voice: preferred, error: null, loadingVoices: false };
      });
    } catch (e) {
      console.error("[ttsStore] loadVoices error:", e);
      update((s) => ({ ...s, error: String(e), loadingVoices: false }));
    }
  }

  /** Initialize store from persisted settings and load voices */
  async function initFromSettings(
    engine: TtsEngine,
    voiceId: string,
    rate: number
  ) {
    update((s) => ({ ...s, engine, rate: Math.max(0.5, Math.min(2.0, rate)) }));
    await loadVoices(engine);
    if (voiceId) {
      const state = get({ subscribe });
      const savedVoice = state.voices.find((v) => v.id === voiceId);
      if (savedVoice) {
        update((s) => ({ ...s, voice: savedVoice }));
      }
    }
  }

  function extractReadableText(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement;
    const selectors = [
      "pre",
      "code",
      ".mermaid-diagram",
      "svg",
      "img",
      "table",
      "hr",
      "script",
      "style",
    ];
    selectors.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });
    return (
      clone.textContent?.replace(/\n+/g, "\n").replace(/\s+/g, " ").trim() || ""
    );
  }

  async function speak(text: string) {
    stop();

    const state = get({ subscribe });
    if (!state.voice) {
      console.warn("TTS: No voice selected");
      return;
    }
    if (!text.trim()) return;

    update((s) => ({ ...s, state: "loading", error: null }));

    try {
      const b64 = await invoke<string>("tts_speak", {
        engine: state.engine,
        text,
        voiceId: state.voice.id,
      });

      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.playbackRate = state.rate;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        update((s) => ({ ...s, state: "idle", audio: null }));
      };
      audio.onpause = () => {
        if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
          update((s) => ({ ...s, state: "paused" }));
        }
      };
      audio.onplay = () => {
        update((s) => ({ ...s, state: "playing" }));
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(url);
        update((s) => ({
          ...s,
          state: "idle",
          audio: null,
          error: "Playback failed",
        }));
      };

      update((s) => ({ ...s, audio }));
      await audio.play();
    } catch (e) {
      console.error("TTS generation failed:", e);
      update((s) => ({
        ...s,
        state: "idle",
        error: `TTS failed: ${String(e)}`,
      }));
    }
  }

  function pause() {
    const state = get({ subscribe });
    state.audio?.pause();
    update((s) => ({ ...s, state: "paused" }));
  }

  function resume() {
    const state = get({ subscribe });
    state.audio?.play().catch(console.error);
    update((s) => ({ ...s, state: "playing" }));
  }

  function stop() {
    const state = get({ subscribe });
    if (state.audio) {
      state.audio.pause();
      state.audio.currentTime = 0;
    }
    update((s) => ({ ...s, state: "idle", audio: null }));
  }

  function setRate(rate: number) {
    update((s) => ({ ...s, rate: Math.max(0.5, Math.min(2.0, rate)) }));
    const state = get({ subscribe });
    if (state.audio) {
      state.audio.playbackRate = state.rate;
    }
  }

  function setVoice(voice: TtsVoice | null) {
    update((s) => ({ ...s, voice }));
  }

  function setEngine(engine: TtsEngine) {
    update((s) => ({ ...s, engine, voices: [], voice: null, error: null }));
    loadVoices(engine);
  }

  return {
    subscribe,
    loadVoices,
    initFromSettings,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
    setEngine,
    extractReadableText,
  };
}

export const ttsStore = createTtsStore();
