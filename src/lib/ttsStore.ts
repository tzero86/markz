import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import {
  chunkRanges,
  clearReading,
  collectSegments,
  highlightReading,
  setActiveBlock,
  wordRangeAt,
  type TtsSegment,
} from "./ttsHighlight";

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

/** One synthesised clip: a span of a segment's text, plus the offsets needed to
 *  highlight it while it plays. */
interface TtsChunk {
  text: string;
  segmentIndex: number;
  start: number;
  end: number;
}

/** `Promise.withResolvers` needs Chromium 119+ / WebKit 17.4+; older WebViews
 *  (macOS, Linux) fall back to the executor form. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  const factory = Promise as unknown as {
    withResolvers?: <V>() => { promise: Promise<V>; resolve: (value: V) => void };
  };
  if (typeof factory.withResolvers === "function") {
    return factory.withResolvers<T>();
  }
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, resolve: settle };
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

  /** Turn segments into the clip list: one clip per sentence, carrying the
   *  offsets that map the clip back onto the segment text. */
  function buildChunks(segments: TtsSegment[]): TtsChunk[] {
    const chunks: TtsChunk[] = [];
    segments.forEach((segment, segmentIndex) => {
      for (const range of chunkRanges(segment.text)) {
        chunks.push({
          text: segment.text.slice(range.start, range.end),
          segmentIndex,
          start: range.start,
          end: range.end,
        });
      }
    });
    return chunks;
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

  function playAudioChunk(
    audio: HTMLAudioElement,
    ctrl: StreamController,
    onProgress: (audio: HTMLAudioElement) => void
  ): Promise<void> {
    const { promise, resolve } = deferred<void>();
    if (ctrl.cancelled) {
      resolve();
      return promise;
    }
    ctrl.resolveCurrent = resolve;

    audio.ontimeupdate = () => onProgress(audio);

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
    return promise;
  }

  /** Synthesise and play `chunks` in order, highlighting `segments` as they are
   *  spoken. */
  async function speakChunks(chunks: TtsChunk[], segments: TtsSegment[]) {
    stop();

    const state = get({ subscribe });
    if (!state.voice) {
      console.warn("TTS: No voice selected");
      return;
    }
    if (chunks.length === 0) return;

    update((s) => ({ ...s, state: "loading", error: null }));

    const ctrl: StreamController = { cancelled: false };
    _streamCtrl = ctrl;

    try {
      // Synthesize first chunk immediately
      const firstAudio = await synthesizeChunk(
        chunks[0].text,
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
              chunks[i].text,
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

        const chunk = chunks[i];
        const segment = segments[chunk.segmentIndex];
        if (segment) {
          setActiveBlock(segment.element);
          highlightReading(segment, chunk, "sentence");
        }

        update((s) => ({ ...s, audio }));
        await playAudioChunk(audio, ctrl, (playing) => {
          if (!segment) return;
          const progress =
            Number.isFinite(playing.duration) && playing.duration > 0
              ? playing.currentTime / playing.duration
              : 0;
          highlightReading(
            segment,
            wordRangeAt(segment.text, chunk, progress),
            "word"
          );
        });

        // Prefetch more ahead
        const nextPrefetch = i + 1 + prefetchWindow;
        if (nextPrefetch < chunks.length && !audioQueue[nextPrefetch]) {
          prefetch(nextPrefetch, nextPrefetch + 1);
        }
      }

      if (!ctrl.cancelled) {
        clearReading();
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
    clearReading();
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

  /** Read a preview container aloud, highlighting the sentence and word being
   *  spoken as a visual guide. */
  async function speakElement(container: HTMLElement) {
    const segments = collectSegments(container);
    await speakChunks(buildChunks(segments), segments);
  }

  /** Read a plain string aloud; there is no DOM to highlight. */
  async function speak(text: string) {
    const pseudo: TtsSegment = {
      element: document.createElement("div"),
      text: text.replace(/\s+/g, " ").trim(),
      pieces: [],
    };
    await speakChunks(buildChunks([pseudo]), [pseudo]);
  }

  return {
    subscribe,
    loadVoices,
    initFromSettings,
    speak,
    speakElement,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
    setEngine,
  };
}

export const ttsStore = createTtsStore();
