import { describe, expect, it } from "vitest";
import { resultFxForTransition } from "../../src/ui/result-fx.js";
import { validRun } from "../fixtures/domain.js";

describe("resolved combat feedback", () => {
  it("keeps a defeated enemy's position and reports actual health and block changes", () => {
    const before = structuredClone(validRun);
    before.player.block = 5;
    const after = structuredClone(before);
    after.player.hp = 37;
    after.player.block = 0;
    after.combat!.enemies[0]!.hp = 0;
    expect(resultFxForTransition(before, after, 1, 120)?.marks).toEqual([
      { xPercent: 22, kind: "damage", label: "−3" },
      { xPercent: 22, kind: "block-loss", label: "◇ −5" },
      { xPercent: 76, kind: "damage", label: "−20" },
    ]);
  });

  it("uses healing and block gain, and omits transitions without visible value changes", () => {
    const before = structuredClone(validRun);
    before.player.hp = 30;
    const after = structuredClone(before);
    after.player.hp = 34;
    after.player.block = 6;
    expect(resultFxForTransition(before, after, 1, 5)?.marks).toEqual([
      { xPercent: 22, kind: "heal", label: "+4" },
      { xPercent: 22, kind: "block", label: "◇ +6" },
    ]);
    expect(resultFxForTransition(before, before, 1, 5)).toBeNull();
  });

  it("shows resolved buffs and debuffs at their targets without showing expiring turns as attacks", () => {
    const before = structuredClone(validRun);
    before.combat!.statuses.player.weak = 2;
    const after = structuredClone(before);
    after.combat!.statuses.player.weak = 1;
    after.combat!.statuses.player.strength = 3;
    after.combat!.statuses.enemies["enemy-1"] = { poison: 2 };
    expect(resultFxForTransition(before, after, 1, 7)?.marks).toEqual([
      { xPercent: 22, kind: "buff", label: "↑ 力 +3" },
      { xPercent: 76, kind: "debuff", label: "↓ 毒 +2" },
    ]);
  });
});
