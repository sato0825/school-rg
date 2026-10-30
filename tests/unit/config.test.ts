import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, parseGameConfig, requireSetting } from "../../src/domain/config.js";

describe("provisional game configuration", () => {
  it("exposes a testable initial turn duration without claiming approval", () => {
    expect(DEFAULT_GAME_CONFIG.playerTurnMs.status).toBe("provisional");
    expect(requireSetting(DEFAULT_GAME_CONFIG.playerTurnMs)).toBe(10_000);
    const revised = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      playerTurnMs: { ...DEFAULT_GAME_CONFIG.playerTurnMs, value: 12_000 },
    });
    expect(requireSetting(revised.playerTurnMs)).toBe(12_000);
    expect(requireSetting(DEFAULT_GAME_CONFIG.playerTurnMs)).toBe(10_000);
  });

  it("refuses unresolved decisions and invalid config values", () => {
    expect(() => requireSetting(DEFAULT_GAME_CONFIG.handLimit)).toThrow("issue #8");
    expect(() => parseGameConfig({ ...DEFAULT_GAME_CONFIG, handLimit: { status: "provisional", value: 0, source: DEFAULT_GAME_CONFIG.handLimit.source, ownerIssue: 7 } })).toThrow();
    expect(() => parseGameConfig({ ...DEFAULT_GAME_CONFIG, clubNames: { status: "provisional", value: ["one"], source: DEFAULT_GAME_CONFIG.clubNames.source, ownerIssue: 12 } })).toThrow();
  });

  it("preserves decision status and source through serialization", () => {
    expect(parseGameConfig(JSON.parse(JSON.stringify(DEFAULT_GAME_CONFIG)))).toEqual(DEFAULT_GAME_CONFIG);
    expect(DEFAULT_GAME_CONFIG.energyEquivalentMs.status).toBe("confirmed");
  });
});
