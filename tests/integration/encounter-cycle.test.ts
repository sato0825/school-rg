import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { chooseRunReward, createRunSession, enterRunNode, settleRunCombat, type EncounterTable, type RunSession } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

function corridor(act: 1 | 2 | 3, seed = 42): RunSession {
  const combatCount = ("byAct" in demoEncounterTable ? demoEncounterTable.byAct[act].combat : demoEncounterTable.combat).length + 1;
  const nodes: MapNode[] = Array.from({ length: combatCount + 1 }, (_, index) => ({
    id: `cycle-${act}-${index}`, act, floor: index, kind: index === 0 ? "start" : "combat",
    nextIds: index < combatCount ? [`cycle-${act}-${index + 1}`] : [],
  }));
  const start = createRunSession(seed, "literature-demo", demoContent);
  return { ...start, run: { ...start.run, act, map: { nodes, currentNodeId: nodes[0]!.id } }, completedNodeIds: [nodes[0]!.id] };
}

function skipWonCombat(session: RunSession): RunSession {
  const won = { ...session, run: { ...session.run, combat: { ...session.run.combat!, phase: "WON" as const } } };
  return chooseRunReward(settleRunCombat(won, demoContent), null);
}

describe("Act encounter cycle", () => {
  for (const act of [1, 2, 3] as const) {
    it(`draws each Act ${act} combat candidate before repeating and survives a save`, () => {
      let session = corridor(act);
      const candidateCount = ("byAct" in demoEncounterTable ? demoEncounterTable.byAct[act].combat : demoEncounterTable.combat).length;
      const firstCycle: string[] = [];
      for (let index = 1; index <= candidateCount + 1; index++) {
        const entered = enterRunNode(session, `cycle-${act}-${index}`, demoContent, demoEnemyAi, demoEncounterTable);
        expect(enterRunNode(session, `cycle-${act}-${index}`, demoContent, demoEnemyAi, demoEncounterTable)).toEqual(entered);
        firstCycle.push(entered.run.combat!.enemies.map((enemy) => enemy.enemyId).join("+"));
        if (index === 1) {
          const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
          session = deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 });
          expect(session.encounterHistory).toEqual(entered.encounterHistory);
        } else session = entered;
        session = skipWonCombat(session);
      }
      expect(new Set(firstCycle.slice(0, candidateCount)).size).toBe(candidateCount);
      expect(firstCycle.slice(0, candidateCount).includes(firstCycle[candidateCount]!)).toBe(true);
      expect(session.encounterHistory?.[`${act}:combat`]).toHaveLength(1);
    });
  }

  it("keeps legacy version-one saves and injected uniform pools usable", () => {
    const start = corridor(1);
    const raw = JSON.parse(serializeRunSession(start, demoContent, { nowMs: () => 0 }, () => "discard"));
    delete raw.session.encounterHistory;
    const restored = deserializeRunSession(JSON.stringify(raw), demoContent, { nowMs: () => 1_000 });
    expect(restored.encounterHistory).toEqual({});
    const uniform = { combat: ["paper-heap"], elite: ["hall-monitor"], boss: ["final-exam"] } as const;
    const entered = enterRunNode(restored, "cycle-1-1", demoContent, demoEnemyAi, uniform);
    expect(entered.run.combat!.enemies[0]!.enemyId).toBe("paper-heap");
    expect(entered.encounterHistory).toEqual({});
  });

  it("cycles formation IDs while preserving formation order", () => {
    if (!("byAct" in demoEncounterTable)) throw new Error("Act table is required");
    const table: EncounterTable = { selectionPolicy: "cycle", byAct: {
      1: { combat: [{ id: "hall-and-scrap", enemyIds: ["hall-monitor", "paper-scrap"] }, "paper-heap"], elite: ["hall-monitor"], boss: ["final-exam"] },
      2: demoEncounterTable.byAct[2], 3: demoEncounterTable.byAct[3],
    } };
    let session = corridor(1);
    const seen = new Set<string>();
    for (let index = 1; index <= 2; index++) {
      const entered = enterRunNode(session, `cycle-1-${index}`, demoContent, demoEnemyAi, table);
      seen.add(entered.encounterHistory!["1:combat"]!.at(-1)!);
      if (entered.encounterHistory!["1:combat"]!.at(-1) === "hall-and-scrap") {
        expect(entered.run.combat!.enemies.map((enemy) => enemy.enemyId)).toEqual(["hall-monitor", "paper-scrap"]);
      }
      session = skipWonCombat(entered);
    }
    expect(seen).toEqual(new Set(["hall-and-scrap", "paper-heap"]));
  });
});
