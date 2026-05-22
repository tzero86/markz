declare module "edge-tts-browser" {
  interface VoiceParams {
    text?: string;
    voice?: string;
    rate?: string;
    volume?: string;
    pitch?: string;
  }

  class TTS {
    voice: string;
    text: string;
    fileType: { ext: string; mimeType: string };
    setVoiceParams(params: VoiceParams): void;
    generateCommand(): string;
    generateSSML(): string;
  }

  export default class EdgeTTSBrowser {
    tts: TTS;
    file: Uint8Array;
    constructor(tts?: Partial<VoiceParams>);
    static getVoices(): Promise<unknown[]>;
    static fileTypes: Record<string, { ext: string; mimeType: string }>;
    ttsToFile(fileName?: string): Promise<Blob>;
  }
}
