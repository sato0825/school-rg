// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createAudioFeedback, cueVoices, resultSoundCue } from "../../src/ui/audio.js";

function fakeContext() {
  const starts: number[] = [];
  const textureStarts: number[] = [];
  const gains: number[] = [];
  const oscillator = () => ({
    type: "sine", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(), start: () => starts.push(1), stop: vi.fn(),
  });
  const context = {
    state: "running", currentTime: 0, sampleRate: 44100, destination: {},
    createOscillator: oscillator,
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: (value: number) => gains.push(value) }, connect: vi.fn() }),
    createBuffer: (_channels: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) }),
    createBufferSource: () => ({ buffer: null, connect: vi.fn(), start: () => textureStarts.push(1), stop: vi.fn() }),
    createBiquadFilter: () => ({ type: "lowpass", frequency: { value: 0 }, connect: vi.fn() }),
    resume: vi.fn(async () => undefined), close: vi.fn(async () => undefined),
  };
  return { context, starts, textureStarts, gains };
}

describe("audio feedback adapter", () => {
  it("plays only requested cues, stores mute, and resumes the stored choice", () => {
    let stored: string | null = null;
    const store = { read: () => stored, write: (value: string) => { stored = value; } };
    const fake = fakeContext();
    const create = vi.fn(() => fake.context as unknown as AudioContext);
    const feedback = createAudioFeedback(store, create);
    feedback.activate();
    feedback.play("card");
    feedback.play("enemy");
    feedback.play("hit");
    feedback.play("block");
    feedback.play("status");
    feedback.play("win");
    feedback.play("lose");
    feedback.play("route");
    feedback.play("reward");
    expect(fake.starts).toHaveLength(18);
    expect(fake.textureStarts).toHaveLength(3);
    expect(create).toHaveBeenCalledTimes(1);
    feedback.toggle();
    feedback.play("card");
    expect(fake.starts).toHaveLength(18);
    expect(fake.textureStarts).toHaveLength(3);
    expect(stored).toBe("off");
    expect(createAudioFeedback(store, create).enabled).toBe(false);
    feedback.dispose();
    expect(fake.context.close).toHaveBeenCalledTimes(1);
  });

  it("keeps every cue short and bounds the summed peak of its voices", () => {
    for (const voices of Object.values(cueVoices)) {
      expect(Math.max(...voices.map((voice) => voice.delay + voice.seconds))).toBeLessThanOrEqual(0.301);
      expect(voices.reduce((sum, voice) => sum + voice.peak, 0)).toBeLessThanOrEqual(0.07);
      expect(voices.every((voice) => voice.fromHz > 0 && voice.toHz > 0 && voice.seconds > 0)).toBe(true);
    }
  });

  it("uses one priority cue per action and reduces peaks in quiet mode", () => {
    expect(resultSoundCue([{ kind: "block" }, { kind: "damage" }, { kind: "debuff" }])).toBe("hit");
    expect(resultSoundCue([{ kind: "block-loss" }, { kind: "buff" }])).toBe("block");
    expect(resultSoundCue([{ kind: "heal" }])).toBe("status");
    expect(resultSoundCue([])).toBeNull();
    const fake = fakeContext();
    const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => fake.context as unknown as AudioContext);
    feedback.activate();
    feedback.play("card");
    feedback.setQuiet(true);
    feedback.play("card");
    const peaks = fake.gains.filter((value) => value > 0.001);
    expect(peaks.slice(3)).toEqual(peaks.slice(0, 3).map((value) => value * 0.4));
  });

  it("keeps the game usable when audio or storage is unavailable", () => {
    const brokenStore = { read: () => { throw new Error("blocked"); }, write: () => { throw new Error("blocked"); } };
    const unavailable = createAudioFeedback(brokenStore, () => null);
    expect(() => { unavailable.play("card"); unavailable.toggle(); unavailable.play("hit"); unavailable.dispose(); }).not.toThrow();
    const failed = createAudioFeedback({ read: () => null, write: () => undefined }, () => { throw new Error("unavailable"); });
    failed.activate();
    expect(() => failed.play("win")).not.toThrow();
  });

  it("does not create audio on restore and drops stale cues after a delayed unlock", async () => {
    const fake = fakeContext();
    fake.context.state = "suspended";
    let unlock!: () => void;
    fake.context.resume = vi.fn(() => new Promise<void>((resolve) => { unlock = resolve; }));
    const create = vi.fn(() => fake.context as unknown as AudioContext);
    const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, create);
    feedback.play("lose");
    expect(create).not.toHaveBeenCalled();
    feedback.activate();
    feedback.play("card");
    expect(fake.starts).toHaveLength(0);
    fake.context.state = "running";
    unlock();
    await Promise.resolve();
    expect(fake.starts).toHaveLength(2);
    feedback.toggle();
    feedback.play("win");
    expect(fake.starts).toHaveLength(2);
  });
});
