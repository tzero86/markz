import { writable, get } from "svelte/store";

export type TtsState = "idle" | "playing" | "paused";

interface TtsStore {
  state: TtsState;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  voices: SpeechSynthesisVoice[];
  currentUtterance: SpeechSynthesisUtterance | null;
}

function createTtsStore() {
  const { subscribe, set, update } = writable<TtsStore>({
    state: "idle",
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    voices: [],
    currentUtterance: null,
  });

  function loadVoices() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const allVoices = synth.getVoices();
    // Prefer Edge/Natural voices, then local, then fallback
    const edgeVoices = allVoices.filter(
      (v) =>
        v.name.includes("Microsoft") ||
        v.name.includes("Natural") ||
        v.name.includes("Online") ||
        v.name.includes("Premium")
    );
    const otherVoices = allVoices.filter(
      (v) => !edgeVoices.includes(v)
    );
    const sorted = [...edgeVoices, ...otherVoices];

    update((s) => {
      const preferred =
        s.voice && sorted.find((v) => v.voiceURI === s.voice!.voiceURI)
          ? s.voice
          : sorted.find((v) => v.lang.startsWith("en")) ||
            sorted[0] ||
            null;
      return { ...s, voices: sorted, voice: preferred };
    });
  }

  // Voices may load asynchronously
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  function extractReadableText(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement;
    // Remove elements that shouldn't be read aloud
    const selectors = [
      "pre", "code", ".mermaid-diagram", "svg", "img",
      "table", "hr", "script", "style"
    ];
    selectors.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });
    // Get text and clean up whitespace
    return clone.textContent
      ?.replace(/\n+/g, "\n")
      .replace(/\s+/g, " ")
      .trim() || "";
  }

  function speak(text: string) {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn("Speech synthesis not supported");
      return;
    }

    stop();

    const state = get({ subscribe });
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = state.voice;
    utter.rate = state.rate;
    utter.pitch = state.pitch;

    utter.onstart = () => update((s) => ({ ...s, state: "playing" }));
    utter.onend = () => update((s) => ({ ...s, state: "idle", currentUtterance: null }));
    utter.onerror = (e) => {
      console.error("TTS error:", e);
      update((s) => ({ ...s, state: "idle", currentUtterance: null }));
    };
    utter.onpause = () => update((s) => ({ ...s, state: "paused" }));
    utter.onresume = () => update((s) => ({ ...s, state: "playing" }));

    update((s) => ({ ...s, currentUtterance: utter }));
    synth.speak(utter);
  }

  function pause() {
    window.speechSynthesis?.pause();
    update((s) => ({ ...s, state: "paused" }));
  }

  function resume() {
    window.speechSynthesis?.resume();
    update((s) => ({ ...s, state: "playing" }));
  }

  function stop() {
    window.speechSynthesis?.cancel();
    update((s) => ({ ...s, state: "idle", currentUtterance: null }));
  }

  function setRate(rate: number) {
    update((s) => ({ ...s, rate: Math.max(0.5, Math.min(2.0, rate)) }));
  }

  function setVoice(voice: SpeechSynthesisVoice | null) {
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
