import { describe, expect, it } from "vitest";
import { COMBAT_INPUT_MODE } from "../../src/domain/index.js";

describe("game mode", () => {
  it("starts with typing combat as the domain contract", () => {
    expect(COMBAT_INPUT_MODE).toBe("typing");
  });
});
