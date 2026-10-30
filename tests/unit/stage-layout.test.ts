import { describe, expect, it } from "vitest";
import { stageLayout } from "../../src/ui/stage-layout.js";

describe("stage layout slots", () => {
  it("keeps allies and enemies in separate horizontal regions for 1–3 allies", () => {
    for (const count of [1, 2, 3]) {
      const layout = stageLayout(count, 3);
      expect(layout.allies).toHaveLength(count);
      expect(layout.allies.at(-1)!.xPercent).toBeLessThan(layout.enemies[0]!.xPercent);
      expect(layout.allies.every((slot) => slot.xPercent > 0 && slot.xPercent < 50)).toBe(true);
      expect(layout.enemies.every((slot) => slot.xPercent > 50 && slot.xPercent < 100)).toBe(true);
    }
    expect(stageLayout(1, 0).enemies).toEqual([]);
    expect(() => stageLayout(0, 1)).toThrow(RangeError);
    expect(() => stageLayout(4, 1)).toThrow(RangeError);
  });
});
