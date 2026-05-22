import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

export type TtsState = "idle" | "loading" | "playing" | "paused";

export interface EdgeVoice {
  Name: string;
  ShortName: string;
  FriendlyName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  Status: string;
  VoiceTag: {
    ContentCategories: string[];
    VoicePersonalities: string[];
  };
}

interface TtsStore {
  state: TtsState;
  voice: EdgeVoice | null;
  rate: number;
  voices: EdgeVoice[];
  audio: HTMLAudioElement | null;
  error: string | null;
}

function createTtsStore() {
  const { subscribe, set, update } = writable<TtsStore>({
    state: "idle",
    voice: null,
    rate: 1.0,
    voices: [],
    audio: null,
    error: null,
  });

  async function loadVoices() {
    try {
      const voices = (await invoke("edge_tts_get_voices")) as EdgeVoice[];
      if (!Array.isArray(voices)) {
        update((s) => ({ ...s, error: "Failed to load voices" }));
        return;
      }
      const sorted = voices.sort((a, b) => {
        const aEn = a.Locale.startsWith("en") ? 0 : 1;
        const bEn = b.Locale.startsWith("en") ? 0 : 1;
        if (aEn !== bEn) return aEn - bEn;
        return a.FriendlyName.localeCompare(b.FriendlyName);
      });
      update((s) => {
        const preferred =
          s.voice && sorted.find((v) => v.ShortName === s.voice!.ShortName)
            ? s.voice
            : sorted.find((v) => v.ShortName.includes("AriaNeural")) ||
              sorted.find((v) => v.Locale.startsWith("en")) ||
              sorted[0] ||
              null;
        return { ...s, voices: sorted, voice: preferred, error: null };
      });
    } catch (e) {
      update((s) => ({ ...s, error: String(e) }));
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
      update((s) => ({ ...s, error: "No voice selected" }));
      return;
    }
    if (!text.trim()) return;

    update((s) => ({ ...s, state: "loading", error: null }));

    try {
      const ratePercent = `${state.rate >= 1 ? "+" : ""}${Math.round((state.rate - 1) * 100)}%`;
      const b64 = await invoke<string>("edge_tts_speak", {
        text,
        voice: state.voice.ShortName,
        rate: ratePercent,
        pitch: "+0Hz",
        volume: "+0%",
      });

      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
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
  }

  function setVoice(voice: EdgeVoice | null) {
    update((s) => ({ ...s, voice }));
  }

  return {
    subscribe,
    loadVoices,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
    extractReadableText,
  };
}

export const ttsStore = createTtsStore();
