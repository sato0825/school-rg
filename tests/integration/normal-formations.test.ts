import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { normalFormationsByAct } from "../../src/content/normal-formations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { resolveEnemyIntents } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode, type EncounterTable } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

function fightAt(act: 1 | 2 | 3, floor: number, seed = 42) {
  const start = createRunSession(seed, "literature-demo", demoContent);
  const nodes: MapNode[] = [
    { id: "start", act, floor: floor - 1, kind: "start", nextIds: ["fight"] },
    { id: "fight", act, floor, kind: "combat", nextIds: [] },
  ];
  return { ...start, run: { ...start.run, act, map: { nodes, currentNodeId: "start" } }, completedNodeIds: ["start"] };
}

describe("normal encounter formations", () => {
  for (const act of [1, 2, 3] as const) {
    it(`unlocks the three Act ${act} pairs by floor and keeps Intents and saves consistent`, () => {
      const candidates = normalFormationsByAct[act];
      expect(candidates).toHaveLength(3);
      for (const candidate of candidates) {
        if (typeof candidate === "string" || candidate.minFloor === undefined) throw new Error("expected gated formation");
        const table: EncounterTable = { byAct: {
          1: { combat: [candidate], elite: ["hall-monitor"], boss: ["final-exam"] },
          2: { combat: [candidate], elite: ["library-cart"], boss: ["club-auditor"] },
          3: { combat: [candidate], elite: ["lost-and-found"], boss: ["closing-bell"] },
        } };
        expect(() => enterRunNode(fightAt(act, candidate.minFloor! - 1), "fight", demoContent, demoEnemyAi, table)).toThrow(/no encounter eligible/);
        const source = fightAt(act, candidate.minFloor);
        const entered = enterRunNode(source, "fight", demoContent, demoEnemyAi, table);
        expect(enterRunNode(source, "fight", demoContent, demoEnemyAi, table)).toEqual(entered);
        const enemies = entered.run.combat!.enemies;
        expect(enemies.map((enemy) => enemy.enemyId)).toEqual(candidate.enemyIds);
        expect(enemies).toHaveLength(2);
        for (const enemy of enemies) {
          const definition = demoContent.enemies.find((item) => item.id === enemy.enemyId)!;
          expect(definition.intentIds).toContain(enemy.intentId);
          expect(demoContent.intents.some((item) => item.id === enemy.intentId)).toBe(true);
        }
        const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
        const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 });
        expect(restored.run.combat?.enemies).toEqual(enemies);
        const active = { ...entered.run, combat: { ...entered.run.combat!, phase: "ENEMY_PHASE" as const } };
        const acted = resolveEnemyIntents(active, demoEnemyAi, demoContent, (run, id, intent) =>
          executeEnemyIntentEffects(run, id, intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG));
        expect(acted.combat?.enemies.map((enemy) => enemy.intentHistoryIds[0])).toEqual(enemies.map((enemy) => enemy.intentId));
      }
    });
  }

  it("rejects invalid formation floor gates", () => {
    const table: EncounterTable = { combat: [{ id: "invalid", enemyIds: ["paper-heap"], minFloor: 0 }], elite: ["hall-monitor"], boss: ["final-exam"] };
    expect(() => enterRunNode(fightAt(1, 1), "fight", demoContent, demoEnemyAi, table)).toThrow(/invalid minimum floor/);
  });
});
