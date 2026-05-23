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

interface StreamController {
  cancelled: boolean;
  resolveCurrent?: () => void;
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

  let _streamCtrl: StreamController | null = null;

  async function loadVoices(engine: TtsEngine) {
    const current = get({ subscribe });
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

  /** Split text into sentence-sized chunks for streaming synthesis */
  function splitIntoChunks(text: string, maxLen = 350): string[] {
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return [];

    const chunks: string[] = [];
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentence = match[0].trim();
      if (sentence.length <= maxLen) {
        chunks.push(sentence);
      } else {
        chunks.push(...splitByWordBoundary(sentence, maxLen));
      }
      lastIndex = sentenceRegex.lastIndex;
    }

    const remainder = text.slice(lastIndex).trim();
    if (remainder) {
      if (remainder.length <= maxLen) {
        chunks.push(remainder);
      } else {
        chunks.push(...splitByWordBoundary(remainder, maxLen));
      }
    }

    return chunks.filter((c) => c.length > 0);
  }

  function splitByWordBoundary(text: string, maxLen: number): string[] {
    const parts: string[] = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let splitAt = remaining.lastIndexOf(" ", maxLen);
      if (splitAt <= 0) splitAt = maxLen;
      parts.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trimStart();
    }
    if (remaining) parts.push(remaining);
    return parts;
  }

  function createAudioFromBase64(b64: string, rate: number): HTMLAudioElement {
    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    return audio;
  }

  async function synthesizeChunk(
    text: string,
    engine: TtsEngine,
    voiceId: string,
    rate: number,
    ctrl: StreamController
  ): Promise<HTMLAudioElement | null> {
    if (ctrl.cancelled) return null;
    try {
      const b64 = await invoke<string>("tts_speak", { engine, text, voiceId });
      if (ctrl.cancelled) return null;
      return createAudioFromBase64(b64, rate);
    } catch (e) {
      console.error("TTS chunk synthesis failed:", e);
      return null;
    }
  }

  function playAudioChunk(audio: HTMLAudioElement, ctrl: StreamController): Promise<void> {
    return new Promise((resolve) => {
      if (ctrl.cancelled) {
        resolve();
        return;
      }
      ctrl.resolveCurrent = resolve;

      audio.onended = () => {
        ctrl.resolveCurrent = undefined;
        resolve();
      };
      audio.onerror = () => {
        ctrl.resolveCurrent = undefined;
        resolve();
      };
      audio.onpause = () => {
        if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
          update((s) => ({ ...s, state: "paused" }));
        }
      };
      audio.onplay = () => {
        update((s) => ({ ...s, state: "playing" }));
      };

      audio.play().catch(() => {
        ctrl.resolveCurrent = undefined;
        resolve();
      });
    });
  }

  async function speak(text: string) {
    stop();

    const state = get({ subscribe });
    if (!state.voice) {
      console.warn("TTS: No voice selected");
      return;
    }
    if (!text.trim()) return;

    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) return;

    update((s) => ({ ...s, state: "loading", error: null }));

    const ctrl: StreamController = { cancelled: false };
    _streamCtrl = ctrl;

    try {
      // Synthesize first chunk immediately
      const firstAudio = await synthesizeChunk(
        chunks[0],
        state.engine,
        state.voice.id,
        state.rate,
        ctrl
      );
      if (ctrl.cancelled) return;

      if (!firstAudio) {
        update((s) => ({ ...s, state: "idle", error: "TTS synthesis failed" }));
        return;
      }

      update((s) => ({ ...s, state: "playing" }));

      // Queue for prefetching
      const audioQueue: (HTMLAudioElement | null)[] = new Array(chunks.length).fill(null);
      audioQueue[0] = firstAudio;

      const prefetchWindow = 2;
      async function prefetch(from: number, to: number) {
        for (let i = from; i < Math.min(to, chunks.length); i++) {
          if (ctrl.cancelled) break;
          if (!audioQueue[i]) {
            audioQueue[i] = await synthesizeChunk(
              chunks[i],
              state.engine,
              state.voice!.id,
              state.rate,
              ctrl
            );
          }
        }
      }

      // Prefetch next window in background
      prefetch(1, 1 + prefetchWindow);

      // Play chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (ctrl.cancelled) break;

        // Wait for chunk to be ready
        while (!audioQueue[i] && !ctrl.cancelled) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (ctrl.cancelled) break;

        const audio = audioQueue[i];
        if (!audio) continue;

        update((s) => ({ ...s, audio }));
        await playAudioChunk(audio, ctrl);

        // Prefetch more ahead
        const nextPrefetch = i + 1 + prefetchWindow;
        if (nextPrefetch < chunks.length && !audioQueue[nextPrefetch]) {
          prefetch(nextPrefetch, nextPrefetch + 1);
        }
      }

      if (!ctrl.cancelled) {
        update((s) => ({ ...s, state: "idle", audio: null }));
      }
    } catch (e) {
      if (!ctrl.cancelled) {
        console.error("TTS streaming failed:", e);
        update((s) => ({
          ...s,
          state: "idle",
          audio: null,
          error: `TTS failed: ${String(e)}`,
        }));
      }
    } finally {
      if (_streamCtrl === ctrl) {
        _streamCtrl = null;
      }
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
    if (_streamCtrl) {
      _streamCtrl.cancelled = true;
      _streamCtrl.resolveCurrent?.();
      _streamCtrl = null;
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
