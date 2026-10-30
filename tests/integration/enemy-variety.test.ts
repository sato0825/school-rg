import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { extraEnemies } from "../../src/content/extra-enemies.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { selectEnemyIntent } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

function encounter(act: 1 | 2 | 3, kind: "combat" | "elite", enemyId: string, seed = 42) {
  const base = createRunSession(seed, "literature-demo", demoContent);
  const from: MapNode = { id: "variety-start", act, floor: 0, kind: "start", nextIds: ["variety-fight"] };
  const node: MapNode = { id: "variety-fight", act, floor: 1, kind, nextIds: [] };
  const mapped = { ...base, run: { ...base.run, act, map: { currentNodeId: from.id, nodes: [from, node] } }, completedNodeIds: [from.id] };
  const pool = { combat: [enemyId], elite: [enemyId], boss: [enemyId] };
  return enterRunNode(mapped, node.id, demoContent, demoEnemyAi, pool);
}

describe("additional school enemies", () => {
  it("registers six enemies in Act pools with stable visible Intents and saved state", () => {
    expect(extraEnemies).toHaveLength(6);
    for (const [act, kind, id] of [
      [1, "combat", "lost-homework"], [1, "elite", "school-gate"],
      [2, "combat", "lab-magnet"], [2, "elite", "library-index"],
      [3, "combat", "empty-desk"], [3, "elite", "last-bus"],
    ] as const) {
      const pool = "byAct" in demoEncounterTable ? demoEncounterTable.byAct[act][kind] : demoEncounterTable[kind];
      expect(pool).toContain(id);
      const opened = encounter(act, kind, id);
      expect(opened.run.combat?.enemies[0]?.enemyId).toBe(id);
      const intentId = opened.run.combat!.enemies[0]!.intentId;
      expect(extraEnemies.find((enemy) => enemy.id === id)?.intentIds).toContain(intentId);
      expect(encounter(act, kind, id)).toEqual(opened);
      const saved = serializeRunSession(opened, demoContent, { nowMs: () => 0 }, () => "discard");
      expect(deserializeRunSession(saved, demoContent, { nowMs: () => 1000 })).toEqual(opened);
    }
  });

  it("uses conditional turns, HP and player status to select the announced action", () => {
    const gate = encounter(1, "elite", "school-gate").run;
    expect(gate.combat!.enemies[0]!.intentId).toBe("gate-intent-brace");
    expect(selectEnemyIntent(gate, "enemy-1", demoEnemyAi, demoContent, 3).combat!.enemies[0]!.intentId).toBe("gate-intent-heavy");
    const index = encounter(2, "elite", "library-index").run;
    expect(index.combat!.enemies[0]!.intentId).toBe("index-intent-brace");
    const injured = { ...index, combat: { ...index.combat!, enemies: index.combat!.enemies.map((enemy) => ({ ...enemy, hp: 18 })) } };
    expect(selectEnemyIntent(injured, "enemy-1", demoEnemyAi, demoContent).combat!.enemies[0]!.intentId).toBe("index-intent-heavy");
    const bus = encounter(3, "elite", "last-bus").run;
    expect(bus.combat!.enemies[0]!.intentId).toBe("bus-intent-weak");
    const weakened = { ...bus, combat: { ...bus.combat!, statuses: { ...bus.combat!.statuses, player: { weak: 1 } } } };
    const announced = selectEnemyIntent(weakened, "enemy-1", demoEnemyAi, demoContent);
    expect(announced.combat!.enemies[0]!.intentId).toBe("bus-intent-double");
    const intent = demoContent.intents.find((item) => item.id === announced.combat!.enemies[0]!.intentId)!;
    const acting = { ...announced, combat: { ...announced.combat!, phase: "ENEMY_PHASE" as const } };
    const resolved = executeEnemyIntentEffects(acting, "enemy-1", intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG);
    expect(resolved.player.hp).toBe(30);
  });

  it("draws weighted Intent from the seed and resolves mixed attack then block", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 96; seed++) {
      const first = encounter(2, "combat", "lab-magnet", seed);
      expect(encounter(2, "combat", "lab-magnet", seed)).toEqual(first);
      seen.add(first.run.combat!.enemies[0]!.intentId);
    }
    expect(seen).toEqual(new Set(["magnet-intent-hit", "magnet-intent-focus"]));
    const gate = encounter(1, "elite", "school-gate").run;
    const intent = demoContent.intents.find((item) => item.id === gate.combat!.enemies[0]!.intentId)!;
    const acting = { ...gate, combat: { ...gate.combat!, phase: "ENEMY_PHASE" as const } };
    const resolved = executeEnemyIntentEffects(acting, "enemy-1", intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG);
    expect(resolved.player.hp).toBe(gate.player.hp - 4);
    expect(resolved.combat!.enemies[0]!.block).toBe(3);
  });
});
