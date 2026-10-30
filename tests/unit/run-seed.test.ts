import { describe, expect, it } from "vitest";
import { newRunSeed } from "../../src/ui/run-seed.js";

describe("new run seed", () => {
  it("uses explicit development seeds without drawing random data", () => {
    for (const seed of [0, 42, 0xffffffff]) {
      expect(newRunSeed(`?seed=${seed}`, () => { throw new Error("unexpected draw"); }, true)).toBe(seed);
    }
  });

  it("draws for ordinary runs, invalid overrides, and production builds", () => {
    expect(newRunSeed("", () => 123, true)).toBe(123);
    for (const search of ["?seed=-1", "?seed=1.5", "?seed=4294967296", "?seed=abc", "?seed=01"]) {
      expect(newRunSeed(search, () => 456, true)).toBe(456);
    }
    expect(newRunSeed("?seed=42", () => 789, false)).toBe(789);
    expect(() => newRunSeed("", () => -1, false)).toThrow(RangeError);
  });
});
