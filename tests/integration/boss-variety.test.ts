import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { extraBosses } from "../../src/content/extra-bosses.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { selectEnemyIntent } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode, RunState } from "../../src/domain/schema.js";

function bossEncounter(act: 1 | 2 | 3, enemyId: string, seed = 42) {
  const start = createRunSession(seed, "literature-demo", demoContent);
  const from: MapNode = { id: "boss-start", act, floor: 0, kind: "start", nextIds: ["boss-fight"] };
  const fight: MapNode = { id: "boss-fight", act, floor: 1, kind: "boss", nextIds: [] };
  const mapped = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
  return enterRunNode(mapped, fight.id, demoContent, demoEnemyAi, { combat: [enemyId], elite: [enemyId], boss: [enemyId] });
}

function executeVisible(run: RunState): RunState {
  const enemy = run.combat!.enemies[0]!;
  const intent = demoContent.intents.find((item) => item.id === enemy.intentId)!;
  return executeEnemyIntentEffects({ ...run, combat: { ...run.combat!, phase: "ENEMY_PHASE" } }, enemy.instanceId, intent, demoEnemyAi, demoContent, DEFAULT_GAME_CONFIG);
}

describe("alternate Act bosses", () => {
  it("registers one additional boss per Act with a reproducible Intent and save", () => {
    expect(extraBosses).toHaveLength(3);
    for (const [act, id] of [[1, "gym-scoreboard"], [2, "lab-ventilation"], [3, "graduation-curtain"]] as const) {
      const pool = "byAct" in demoEncounterTable ? demoEncounterTable.byAct[act].boss : demoEncounterTable.boss;
      expect(pool).toContain(id);
      const opened = bossEncounter(act, id);
      expect(opened.run.combat!.enemies[0]!.enemyId).toBe(id);
      expect(extraBosses.find((enemy) => enemy.id === id)?.intentIds).toContain(opened.run.combat!.enemies[0]!.intentId);
      expect(bossEncounter(act, id)).toEqual(opened);
      const saved = serializeRunSession(opened, demoContent, { nowMs: () => 0 }, () => "discard");
      expect(deserializeRunSession(saved, demoContent, { nowMs: () => 0 }).run).toEqual(opened.run);
    }
  });

  it("executes the displayed preparation before the next attack Intent", () => {
    const score = bossEncounter(1, "gym-scoreboard").run;
    expect(score.combat!.enemies[0]!.intentId).toBe("scoreboard-intent-prepare");
    const scored = executeVisible(score);
    expect(scored.combat!.enemies[0]!.block).toBe(5);
    expect(scored.combat!.statuses.enemies["enemy-1"]?.strength).toBe(1);
    const next = { ...scored, combat: { ...scored.combat!, enemies: scored.combat!.enemies.map((enemy) => ({ ...enemy, intentHistoryIds: ["scoreboard-intent-prepare"] })) } };
    expect(selectEnemyIntent(next, "enemy-1", demoEnemyAi, demoContent, 2).combat!.enemies[0]!.intentId).toBe("scoreboard-intent-hit");

    const vent = bossEncounter(2, "lab-ventilation").run;
    expect(vent.combat!.enemies[0]!.intentId).toBe("vent-intent-pressure");
    const pressured = executeVisible(vent);
    expect(pressured.combat!.statuses.player.frail).toBe(1);
    expect(pressured.combat!.enemies[0]!.block).toBe(5);
    const announced = selectEnemyIntent(pressured, "enemy-1", demoEnemyAi, demoContent, 2);
    expect(announced.combat!.enemies[0]!.intentId).toBe("vent-intent-hit");
    expect(executeVisible(announced).player.hp).toBe(vent.player.hp - 8);
  });

  it("uses seeded weighted choices and resolves either published effect", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 96; seed++) {
      const opened = bossEncounter(3, "graduation-curtain", seed);
      expect(bossEncounter(3, "graduation-curtain", seed)).toEqual(opened);
      seen.add(opened.run.combat!.enemies[0]!.intentId);
      const acted = executeVisible(opened.run);
      if (opened.run.combat!.enemies[0]!.intentId === "curtain-intent-hit") expect(acted.player.hp).toBe(opened.run.player.hp - 10);
      else {
        expect(acted.combat!.enemies[0]!.block).toBe(7);
        expect(acted.combat!.statuses.enemies["enemy-1"]?.strength).toBe(1);
      }
    }
    expect(seen).toEqual(new Set(["curtain-intent-hit", "curtain-intent-prepare"]));
  });
});
