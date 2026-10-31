// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createAudioFeedback } from "../../src/ui/audio.js";

function fakeContext() {
  const starts: number[] = [];
  const shapes: string[] = [];
  const oscillator = () => ({
    type: "sine", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(), start: () => starts.push(1), stop: vi.fn(),
  });
  const context = {
    state: "running", currentTime: 0, destination: {},
    createOscillator: () => {
      const item = oscillator();
      shapes.push(item.type);
      return item;
    },
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }),
    resume: vi.fn(async () => undefined), close: vi.fn(async () => undefined),
  };
  return { context, starts, shapes };
}

describe("audio feedback adapter", () => {
  it("plays only requested cues, stores mute, and resumes the stored choice", () => {
    let stored: string | null = null;
    const store = { read: () => stored, write: (value: string) => { stored = value; } };
    const fake = fakeContext();
    const create = vi.fn(() => fake.context as unknown as AudioContext);
    const feedback = createAudioFeedback(store, create);
    feedback.play("card");
    feedback.play("enemy");
    feedback.play("hit");
    feedback.play("win");
    feedback.play("lose");
    expect(fake.starts).toHaveLength(5);
    expect(create).toHaveBeenCalledTimes(1);
    feedback.toggle();
    feedback.play("card");
    expect(fake.starts).toHaveLength(5);
    expect(stored).toBe("off");
    expect(createAudioFeedback(store, create).enabled).toBe(false);
    feedback.dispose();
    expect(fake.context.close).toHaveBeenCalledTimes(1);
  });

  it("keeps the game usable when audio or storage is unavailable", () => {
    const brokenStore = { read: () => { throw new Error("blocked"); }, write: () => { throw new Error("blocked"); } };
    const unavailable = createAudioFeedback(brokenStore, () => null);
    expect(() => { unavailable.play("card"); unavailable.toggle(); unavailable.play("hit"); unavailable.dispose(); }).not.toThrow();
    const failed = createAudioFeedback({ read: () => null, write: () => undefined }, () => { throw new Error("unavailable"); });
    expect(() => failed.play("win")).not.toThrow();
  });
});
