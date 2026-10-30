import { describe, expect, it } from "vitest";
import { actionDelayMs, loopDelayMs, MOTION_MS } from "../../src/ui/motion-timing.js";

describe("battle animation time axis", () => {
  it("restores the same idle phase after each DOM redraw", () => {
    expect(loopDelayMs(3_200, MOTION_MS.heroIdle)).toBe(-100);
    expect(loopDelayMs(6_300, MOTION_MS.heroIdle)).toBe(-100);
    expect(loopDelayMs(3_600, MOTION_MS.enemyIdle)).toBe(-100);
  });

  it("continues a short action from its original trigger and clamps after completion", () => {
    expect(actionDelayMs(1_170, 1_000, MOTION_MS.hero)).toBe(-170);
    expect(actionDelayMs(1_360, 1_000, MOTION_MS.hero)).toBe(-360);
    expect(actionDelayMs(1_500, 1_000, MOTION_MS.hero)).toBe(-380);
    expect(actionDelayMs(900, 1_000, MOTION_MS.hit)).toBe(0);
    expect(() => loopDelayMs(1, 0)).toThrow();
  });
});
