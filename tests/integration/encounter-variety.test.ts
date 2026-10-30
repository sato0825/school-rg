import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi, demoEncounterTable } from "../../src/content/demo-battle.js";
import { resolveEnemyIntents } from "../../src/domain/enemy-ai.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const expected = {
  1: { combat: ["paper-heap", "late-pass"], elite: ["hall-monitor", "notice-board"] },
  2: { combat: ["chalk-cloud", "safety-sign"], elite: ["library-cart", "stairwell-echo"] },
  3: { combat: ["night-announcement", "window-shadow"], elite: ["lost-and-found", "night-locker"] },
} as const;

describe("Act encounter variety", () => {
  for (const act of [1, 2, 3] as const) for (const kind of ["combat", "elite"] as const) {
    it(`reaches both Act ${act} ${kind} candidates with replayable Intents and saves`, () => {
      const found = new Set<string>();
      for (let seed = 0; seed < 100 && found.size < 2; seed++) {
        const start = createRunSession(seed, "literature-demo", demoContent);
        const from: MapNode = { id: "test-start", act, floor: 0, kind: "start", nextIds: ["test-fight"] };
        const fight: MapNode = { id: "test-fight", act, floor: 1, kind, nextIds: [] };
        const session = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
        const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, demoEncounterTable);
        const enemy = entered.run.combat!.enemies[0]!;
        found.add(enemy.enemyId);
        expect(expected[act][kind]).toContain(enemy.enemyId);
        expect(enterRunNode(session, fight.id, demoContent, demoEnemyAi, demoEncounterTable)).toEqual(entered);
        const intent = demoContent.intents.find((item) => item.id === enemy.intentId);
        expect(intent).toBeDefined();
        const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
        const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 });
        expect(restored.run.combat?.enemies).toEqual(entered.run.combat?.enemies);
        const active = { ...entered.run, combat: { ...entered.run.combat!, phase: "ENEMY_PHASE" as const } };
        const acted = resolveEnemyIntents(active, demoEnemyAi, demoContent, (run, id, next) =>
          executeEnemyIntentEffects(run, id, next, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG));
        expect(acted.combat?.enemies[0]?.intentHistoryIds[0]).toBe(enemy.intentId);
      }
      expect(found).toEqual(new Set(expected[act][kind]));
    });
  }
});
