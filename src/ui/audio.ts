import type { SaveStore } from "./save-store.js";

export const AUDIO_SETTING_KEY = "school-rg-audio-v1";
export type SoundCue = "card" | "enemy" | "hit" | "block" | "status" | "win" | "lose";

/** Audio is a disposable UI adapter. No sound data enters the run state. */
export function browserAudioStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return { read: () => storage.getItem(AUDIO_SETTING_KEY), write: (value) => storage.setItem(AUDIO_SETTING_KEY, value) };
  } catch { return { read: () => null, write: () => undefined }; }
}

type Voice = {
  readonly fromHz: number;
  readonly toHz: number;
  readonly delay: number;
  readonly seconds: number;
  readonly peak: number;
  readonly wave: OscillatorType;
};
type Texture = { readonly seconds: number; readonly peak: number; readonly filter: BiquadFilterType; readonly cutoffHz: number };

/** Original, deterministic UI cues with brief, moderate-gain voices. */
export const cueVoices: Readonly<Record<SoundCue, readonly Voice[]>> = {
  card: [
    { fromHz: 620, toHz: 970, delay: 0, seconds: 0.11, peak: 0.038, wave: "sine" },
    { fromHz: 1230, toHz: 1460, delay: 0.018, seconds: 0.075, peak: 0.014, wave: "triangle" },
  ],
  enemy: [
    { fromHz: 260, toHz: 180, delay: 0, seconds: 0.16, peak: 0.025, wave: "triangle" },
    { fromHz: 110, toHz: 90, delay: 0.025, seconds: 0.13, peak: 0.014, wave: "sine" },
  ],
  hit: [
    { fromHz: 145, toHz: 70, delay: 0, seconds: 0.11, peak: 0.038, wave: "triangle" },
    { fromHz: 470, toHz: 130, delay: 0, seconds: 0.045, peak: 0.009, wave: "sawtooth" },
  ],
  block: [
    { fromHz: 410, toHz: 630, delay: 0, seconds: 0.12, peak: 0.027, wave: "triangle" },
    { fromHz: 930, toHz: 760, delay: 0.012, seconds: 0.08, peak: 0.012, wave: "sine" },
  ],
  status: [
    { fromHz: 510, toHz: 680, delay: 0, seconds: 0.11, peak: 0.02, wave: "sine" },
    { fromHz: 740, toHz: 910, delay: 0.06, seconds: 0.12, peak: 0.015, wave: "sine" },
  ],
  win: [
    { fromHz: 620, toHz: 660, delay: 0, seconds: 0.1, peak: 0.024, wave: "sine" },
    { fromHz: 784, toHz: 820, delay: 0.08, seconds: 0.11, peak: 0.022, wave: "sine" },
    { fromHz: 1046, toHz: 1110, delay: 0.16, seconds: 0.14, peak: 0.022, wave: "sine" },
  ],
  lose: [
    { fromHz: 310, toHz: 220, delay: 0, seconds: 0.15, peak: 0.025, wave: "triangle" },
    { fromHz: 220, toHz: 145, delay: 0.09, seconds: 0.18, peak: 0.017, wave: "sine" },
  ],
};

/** A little filtered noise suggests paper movement, impact, or a guarded strike. */
const cueTextures: Partial<Record<SoundCue, Texture>> = {
  card: { seconds: 0.085, peak: 0.009, filter: "highpass", cutoffHz: 2300 },
  hit: { seconds: 0.065, peak: 0.014, filter: "lowpass", cutoffHz: 650 },
  block: { seconds: 0.05, peak: 0.008, filter: "highpass", cutoffHz: 1700 },
};

/** One salient result sound per action keeps multi-target attacks intelligible. */
export function resultSoundCue(marks: readonly { kind: string }[]): SoundCue | null {
  if (marks.some((mark) => mark.kind === "damage")) return "hit";
  if (marks.some((mark) => mark.kind === "block" || mark.kind === "block-loss")) return "block";
  if (marks.some((mark) => mark.kind === "buff" || mark.kind === "debuff" || mark.kind === "heal")) return "status";
  return null;
}

export function createAudioFeedback(
  store: SaveStore = browserAudioStore(),
  createContext: () => AudioContext | null = () => {
    const Constructor = window.AudioContext;
    return Constructor ? new Constructor() : null;
  },
) {
  let enabled = true;
  try { enabled = store.read() !== "off"; } catch { /* Storage may be disabled. */ }
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  const textureBuffers = new Map<SoundCue, AudioBuffer>();
  let quiet = false;
  return {
    get enabled() { return enabled; },
    setQuiet(value: boolean) { quiet = value; },
    toggle() {
      enabled = !enabled;
      if (context && output) output.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
      try { store.write(enabled ? "on" : "off"); } catch { /* Keep the in-memory choice. */ }
      return enabled;
    },
    play(cue: SoundCue, delaySeconds = 0) {
      if (!enabled) return;
      try {
        context ??= createContext();
        if (!context) return;
        if (context.state === "suspended") void context.resume().catch(() => undefined);
        if (!output) {
          output = context.createGain();
          output.gain.setValueAtTime(1, context.currentTime);
          output.connect(context.destination);
        }
        const now = context.currentTime + Math.max(0, delaySeconds);
        for (const voice of cueVoices[cue]) {
          const start = now + voice.delay;
          const end = start + voice.seconds;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = voice.wave;
          oscillator.frequency.setValueAtTime(voice.fromHz, start);
          oscillator.frequency.exponentialRampToValueAtTime(voice.toHz, end);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(voice.peak * (quiet ? 0.4 : 1), start + Math.min(0.012, voice.seconds / 3));
          gain.gain.exponentialRampToValueAtTime(0.0001, end);
          oscillator.connect(gain);
          gain.connect(output);
          oscillator.start(start);
          oscillator.stop(end);
        }
        const texture = cueTextures[cue];
        if (texture) try {
          let buffer = textureBuffers.get(cue);
          if (!buffer) {
            const frameCount = Math.ceil(context.sampleRate * texture.seconds);
            buffer = context.createBuffer(1, frameCount, context.sampleRate);
            const samples = buffer.getChannelData(0);
            let seed = [...cue].reduce((value, char) => (value * 33 + char.charCodeAt(0)) >>> 0, 5381);
            for (let frame = 0; frame < frameCount; frame++) {
              seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
              samples[frame] = seed / 0xffffffff * 2 - 1;
            }
            textureBuffers.set(cue, buffer);
          }
          const source = context.createBufferSource();
          const filter = context.createBiquadFilter();
          const gain = context.createGain();
          source.buffer = buffer;
          filter.type = texture.filter;
          filter.frequency.value = texture.cutoffHz;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(texture.peak * (quiet ? 0.4 : 1), now + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + texture.seconds);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(output);
          source.start(now);
          source.stop(now + texture.seconds);
        } catch { /* The pitched cue still works when buffer audio is unavailable. */ }
      } catch { /* Audio failure must not interrupt input or the game clock. */ }
    },
    dispose() { if (context) void context.close().catch(() => undefined); },
  };
}
