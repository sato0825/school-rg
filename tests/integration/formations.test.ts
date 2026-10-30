import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { resolveEnemyIntents } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { availableRunNodes, createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";

const eliteMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 1, event: 0, shop: 0, rest: 0, treasure: 0 } };
const formationPool: EncounterPool = { combat: ["paper-heap"], elite: [{ id: "hall-and-scrap", enemyIds: ["hall-monitor", "paper-scrap"] }], boss: ["final-exam"] };

describe("formation encounters", () => {
  it("preserves ordered enemies, Intents and the encounter after save/load", () => {
    const start = createRunSession(42, "literature-demo", demoContent, eliteMap);
    const node = availableRunNodes(start)[0]!;
    const entered = enterRunNode(start, node.id, demoContent, demoEnemyAi, formationPool);
    const enemies = entered.run.combat!.enemies;
    expect(enemies.map((enemy) => [enemy.instanceId, enemy.enemyId, enemy.intentId])).toEqual([
      ["enemy-1", "hall-monitor", "hall-intent-hit"],
      ["enemy-2", "paper-scrap", "scrap-intent-hit"],
    ]);
    expect(enterRunNode(start, node.id, demoContent, demoEnemyAi, formationPool)).toEqual(entered);
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 10_000 });
    expect(restored.run.combat?.enemies).toEqual(enemies);
    expect(restored.run.rngState).toBe(entered.run.rngState);
    expect(restored.screen).toBe("combat");
    const enemyPhase = { ...entered.run, combat: { ...entered.run.combat!, phase: "ENEMY_PHASE" as const } };
    const acted = resolveEnemyIntents(enemyPhase, demoEnemyAi, demoContent, (run, enemyId, intent) =>
      executeEnemyIntentEffects(run, enemyId, intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG));
    expect(acted.player.hp).toBe(34);
    expect(acted.combat?.enemies.map((enemy) => enemy.intentHistoryIds)).toEqual([["hall-intent-hit"], ["scrap-intent-hit"]]);
  });

  it("rejects empty, oversized and unknown enemy formations", () => {
    const start = createRunSession(42, "literature-demo", demoContent, eliteMap);
    const node = availableRunNodes(start)[0]!;
    const pool = (enemyIds: string[]): EncounterPool => ({ combat: ["paper-heap"], elite: [{ id: "test", enemyIds }], boss: ["final-exam"] });
    expect(() => enterRunNode(start, node.id, demoContent, demoEnemyAi, pool([]))).toThrow(/1–5/);
    expect(() => enterRunNode(start, node.id, demoContent, demoEnemyAi, pool(Array(6).fill("paper-scrap")))).toThrow(/1–5/);
    expect(() => enterRunNode(start, node.id, demoContent, demoEnemyAi, pool(["unknown"]))).toThrow(/unknown encounter enemy/);
  });
});
