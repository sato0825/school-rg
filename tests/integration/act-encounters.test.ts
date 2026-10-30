import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi, createDemoBattle } from "../../src/content/demo-battle.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import type { MapNode } from "../../src/domain/schema.js";

describe("Act-specific encounters", () => {
  const expected = {
    1: { combat: "paper-heap", elite: "hall-monitor", boss: "final-exam" },
    2: { combat: "chalk-cloud", elite: "library-cart", boss: "club-auditor" },
    3: { combat: "night-announcement", elite: "lost-and-found", boss: "closing-bell" },
  } as const;

  for (const act of [1, 2, 3] as const) {
    for (const kind of ["combat", "elite", "boss"] as const) {
      it(`selects Act ${act} ${kind} with a registered visible Intent`, () => {
        const start = createRunSession(14, "literature-demo", demoContent);
        const from: MapNode = { id: `test-a${act}-start`, act, floor: 0, kind: "start", nextIds: [`test-a${act}-fight`] };
        const fight: MapNode = { id: `test-a${act}-fight`, act, floor: 1, kind, nextIds: [] };
        const session = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
        const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, demoEncounterTable);
        const enemy = entered.run.combat?.enemies[0];
        expect(enemy?.enemyId).toBe(expected[act][kind]);
        if (act === 1 && kind === "elite") expect(entered.run.combat?.enemies.map((item) => item.enemyId)).toEqual(["hall-monitor", "paper-scrap"]);
        expect(demoContent.enemies.find((item) => item.id === enemy?.enemyId)?.intentIds).toContain(enemy?.intentId);
        expect(demoContent.intents.find((item) => item.id === enemy?.intentId)).toBeDefined();
        expect(enterRunNode(session, fight.id, demoContent, demoEnemyAi, demoEncounterTable)).toEqual(entered);
      });
    }
  }

  it("keeps legacy replaceable pools usable", () => {
    const start = createRunSession(14, "literature-demo", demoContent, { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } });
    const oldPool: EncounterPool = { combat: ["paper-heap"], elite: ["final-exam"], boss: ["final-exam"] };
    const entered = enterRunNode(start, start.run.map.nodes[0]!.nextIds[0]!, demoContent, demoEnemyAi, oldPool);
    expect(entered.run.combat?.enemies[0]?.enemyId).toBe("paper-heap");
  });

  it("resolves new buff and debuff Intents as their labels announce", () => {
    const base = createDemoBattle();
    for (const [intentId, status, side] of [
      ["chalk-intent-weak", "weak", "player"],
      ["auditor-intent-focus", "strength", "enemy"],
      ["announcement-intent-frail", "frail", "player"],
    ] as const) {
      const run = { ...base, combat: { ...base.combat!, phase: "ENEMY_PHASE" as const } };
      const intent = demoContent.intents.find((item) => item.id === intentId)!;
      const acted = executeEnemyIntentEffects(run, "paper-1", intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG);
      const bag = side === "player" ? acted.combat!.statuses.player : acted.combat!.statuses.enemies["paper-1"];
      expect(bag?.[status]).toBe(1);
    }
  });
});
