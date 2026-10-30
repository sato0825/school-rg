import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { ascensionEnemyHp, ascensionStartingHp, emptyProgression, parseProgression, unlockAfterVictory, unlockedLevel } from "../../src/domain/ascension.js";
import { createRunSession } from "../../src/domain/run-flow.js";

describe("provisional cumulative Ascension rules", () => {
  it("validates levels and applies cumulative HP modifiers", () => {
    expect(ascensionEnemyHp(26, 0)).toBe(26);
    expect(ascensionEnemyHp(26, 1)).toBe(32);
    expect(ascensionEnemyHp(26, 2)).toBe(32);
    expect(ascensionStartingHp(40, 1)).toBe(40);
    expect(ascensionStartingHp(40, 2)).toBe(35);
    expect(() => createRunSession(42, "literature-demo", demoContent, undefined, undefined, 3)).toThrow(/invalid Ascension/);
  });

  it("unlocks only the next level after a full victory at the highest unlocked level", () => {
    const base = emptyProgression();
    const start = createRunSession(42, "literature-demo", demoContent);
    const finalNode = start.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
    const level0 = { ...start, run: { ...start.run, act: 3 as const, map: { ...start.run.map, currentNodeId: finalNode.id } }, screen: "won" as const, completedNodeIds: [...start.completedNodeIds, finalNode.id] };
    expect(() => unlockAfterVictory(base, start)).toThrow(/three-Act victory/);
    const first = unlockAfterVictory(base, level0);
    expect(unlockedLevel(first, level0.run.clubId)).toBe(1);
    expect(unlockAfterVictory(first, level0)).toEqual(first);
    const level1 = { ...level0, run: { ...level0.run, ascensionLevel: 1 } };
    const second = unlockAfterVictory(first, level1);
    expect(unlockedLevel(second, level0.run.clubId)).toBe(2);
    expect(unlockAfterVictory(second, { ...level0, run: { ...level0.run, ascensionLevel: 2 } })).toEqual(second);
    expect(unlockedLevel(second, "another-club")).toBe(0);
    expect(parseProgression(second, demoContent)).toEqual(second);
    expect(() => parseProgression({ formatVersion: 1, unlockedByClub: { missing: 1 } }, demoContent)).toThrow(/unknown progression club/);
  });
});
