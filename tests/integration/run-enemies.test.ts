import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { runEnemies } from "../../src/content/run-enemies.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { selectEnemyIntent } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const cases = [
  [1, "hall-mop"], [1, "folded-school-map"],
  [2, "beaker-mist"], [2, "lab-coil"],
  [3, "stage-spotlight"], [3, "archive-clock"],
] as const;

function openEnemy(act: 1 | 2 | 3, enemyId: string, seed = 42) {
  const start = createRunSession(seed, "literature-demo", demoContent);
  const from: MapNode = { id: "run-start", act, floor: 0, kind: "start", nextIds: ["run-fight"] };
  const fight: MapNode = { id: "run-fight", act, floor: 1, kind: "combat", nextIds: [] };
  const session = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
  return enterRunNode(session, fight.id, demoContent, demoEnemyAi, { combat: [enemyId], elite: [enemyId], boss: [enemyId] });
}

function useIntent(run: ReturnType<typeof openEnemy>["run"]) {
  const enemy = run.combat!.enemies[0]!;
  const intent = demoContent.intents.find((item) => item.id === enemy.intentId)!;
  return executeEnemyIntentEffects({ ...run, combat: { ...run.combat!, phase: "ENEMY_PHASE" } },
    enemy.instanceId, intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG);
}

describe("additional normal encounters for three Acts", () => {
  it("registers six Act-specific candidates with announced actions and save compatibility", () => {
    expect(runEnemies).toHaveLength(6);
    if (!("byAct" in demoEncounterTable)) throw new Error("Act encounter table is required");
    for (const [act, enemyId] of cases) {
      expect(demoEncounterTable.byAct[act].combat).toContain(enemyId);
      const entered = openEnemy(act, enemyId);
      expect(openEnemy(act, enemyId)).toEqual(entered);
      const enemy = entered.run.combat!.enemies[0]!;
      expect(enemy.enemyId).toBe(enemyId);
      expect(runEnemies.find((item) => item.id === enemyId)?.intentIds).toContain(enemy.intentId);
      expect(demoContent.intents.find((item) => item.id === enemy.intentId)).toBeDefined();
      const restored = deserializeRunSession(serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard"),
        demoContent, { nowMs: () => 0 });
      expect(restored.run.combat!.enemies).toEqual(entered.run.combat!.enemies);
    }
  });

  it("makes the folded map summon only while it has no living ally", () => {
    const opened = openEnemy(1, "folded-school-map").run;
    expect(opened.combat!.enemies[0]!.intentId).toBe("map-intent-call");
    const summoned = useIntent(opened);
    expect(summoned.combat!.enemies.map((enemy) => enemy.enemyId)).toEqual(["folded-school-map", "paper-scrap"]);
    expect(selectEnemyIntent(summoned, "enemy-1", demoEnemyAi, demoContent).combat!.enemies[0]!.intentId).toBe("map-intent-hit");
  });

  it("changes the coil and spotlight Intents when their visible conditions change", () => {
    const coil = openEnemy(2, "lab-coil").run;
    expect(coil.combat!.enemies[0]!.intentId).toBe("coil-intent-brace");
    const braced = useIntent(coil);
    expect(braced.combat!.enemies[0]!.block).toBe(4);
    expect(braced.player.hp).toBe(coil.player.hp - 3);
    const injured = { ...coil, combat: { ...coil.combat!, enemies: coil.combat!.enemies.map((enemy) => ({ ...enemy, hp: 15 })) } };
    expect(selectEnemyIntent(injured, "enemy-1", demoEnemyAi, demoContent).combat!.enemies[0]!.intentId).toBe("coil-intent-burst");

    const light = openEnemy(3, "stage-spotlight").run;
    expect(light.combat!.enemies[0]!.intentId).toBe("spotlight-intent-glare");
    const exposed = useIntent(light);
    expect(exposed.combat!.statuses.player.vulnerable).toBe(1);
    expect(selectEnemyIntent(exposed, "enemy-1", demoEnemyAi, demoContent).combat!.enemies[0]!.intentId).toBe("spotlight-intent-hit");
  });

  it("uses timed sequence and weighted actions without decoupling Intent from resolution", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) seen.add(openEnemy(1, "hall-mop", seed).run.combat!.enemies[0]!.intentId);
    expect(seen).toEqual(new Set(["mop-intent-sweep", "mop-intent-hit"]));

    const mist = openEnemy(2, "beaker-mist").run;
    expect(mist.combat!.enemies[0]!.intentId).toBe("mist-intent-poison");
    expect(useIntent(mist).combat!.statuses.player.poison).toBe(1);
    const clock = openEnemy(3, "archive-clock").run;
    expect(clock.combat!.enemies[0]!.intentId).toBe("clock-intent-prepare");
    const prepared = useIntent(clock);
    expect(prepared.combat!.statuses.enemies["enemy-1"]?.strength).toBe(1);
    expect(prepared.combat!.enemies[0]!.block).toBe(5);
  });
});
