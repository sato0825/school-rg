import type { SaveStore } from "./save-store.js";

export const AUDIO_SETTING_KEY = "school-rg-audio-v1";
export type SoundCue = "card" | "enemy" | "hit" | "win" | "lose";

/** Audio is a disposable UI adapter. No sound data enters the run state. */
export function browserAudioStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return { read: () => storage.getItem(AUDIO_SETTING_KEY), write: (value) => storage.setItem(AUDIO_SETTING_KEY, value) };
  } catch { return { read: () => null, write: () => undefined }; }
}

const tones: Record<SoundCue, readonly [number, number, number, OscillatorType]> = {
  card: [540, 880, 0.14, "sine"],
  enemy: [230, 165, 0.19, "triangle"],
  hit: [170, 78, 0.16, "sawtooth"],
  win: [620, 1040, 0.3, "sine"],
  lose: [260, 110, 0.32, "triangle"],
};

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
  return {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { store.write(enabled ? "on" : "off"); } catch { /* Keep the in-memory choice. */ }
      return enabled;
    },
    play(cue: SoundCue) {
      if (!enabled) return;
      try {
        context ??= createContext();
        if (!context) return;
        if (context.state === "suspended") void context.resume().catch(() => undefined);
        const [startHz, endHz, duration, shape] = tones[cue];
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = shape;
        oscillator.frequency.setValueAtTime(startHz, now);
        oscillator.frequency.exponentialRampToValueAtTime(endHz, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(cue === "hit" ? 0.045 : 0.07, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch { /* Audio failure must not interrupt input or the game clock. */ }
    },
    dispose() { if (context) void context.close().catch(() => undefined); },
  };
}
