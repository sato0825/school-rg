import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, chooseRunReward, createRunSession, enterRunNode, settleRunCombat, type RunSession } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import { parseRunState } from "../../src/domain/validate.js";

const mapOptions = { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function replay(seed: number, reloadAtActTwo: boolean, ascensionLevel = 0, clubId = "literature-demo"): { session: RunSession; trace: string[] } {
  let session = createRunSession(seed, clubId, demoContent, mapOptions, undefined, ascensionLevel);
  const trace: string[] = [];
  let battles = 0;
  for (let step = 0; step < 20 && session.screen !== "won"; step++) {
    const node = availableRunNodes(session)[0];
    if (!node) throw new Error(`run stopped at step ${step}`);
    session = enterRunNode(session, node.id, demoContent, demoEnemyAi, demoEncounterTable);
    if (session.run.combat && ascensionLevel > 0) {
      const enemy = session.run.combat.enemies[0]!;
      const baseHp = demoContent.enemies.find((item) => item.id === enemy.enemyId)!.maxHp;
      expect(enemy.maxHp).toBe(Math.ceil(baseHp * 1.2));
    }
    trace.push(`${node.id}:${node.kind}:${session.run.rngState}:${session.run.combat?.enemies[0]?.enemyId ?? "-"}:${session.run.combat?.enemies[0]?.intentId ?? "-"}`);
    if (session.screen === "combat") {
      battles++;
      const won: RunSession = { ...session, run: { ...session.run, combat: { ...session.run.combat!, phase: "WON", enemies: session.run.combat!.enemies.map((enemy) => ({ ...enemy, hp: 0 })) } } };
      session = settleRunCombat(won, demoContent);
      trace.push(`reward:${session.rewardCardIds.join(",")}:${session.run.gold}`);
      if (session.screen === "reward") session = chooseRunReward(session, null);
    }
    expect(parseRunState(session.run, demoContent)).toEqual(session.run);
    if (reloadAtActTwo && node.act === 2 && node.kind === "start") {
      const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
      session = deserializeRunSession(saved, demoContent, { nowMs: () => 10_000 });
    }
  }
  expect(session.screen).toBe("won");
  expect(battles).toBe(9);
  return { session, trace };
}

describe("seeded full-run replay", () => {
  it("reproduces all three Acts, including a save/load boundary", () => {
    const original = replay(142, false);
    expect(original.trace.filter((line) => line.includes(":boss:"))).toEqual(expect.arrayContaining([
      expect.stringContaining(":final-exam:"),
      expect.stringContaining(":club-auditor:"),
      expect.stringContaining(":closing-bell:"),
    ]));
    expect(replay(142, false)).toEqual(original);
    expect(replay(142, true)).toEqual(original);
    expect(replay(143, false).trace).not.toEqual(original.trace);
  });

  it("replays cumulative Ascension rules across three Acts and save/load", () => {
    const original = replay(142, false, 2);
    expect(original.session.run.player.maxHp).toBe(35);
    expect(original.session.run.ascensionLevel).toBe(2);
    expect(replay(142, true, 2)).toEqual(original);
  });

  it("reproduces a science run across all three Acts and save/load", () => {
    const original = replay(142, false, 0, "science-demo");
    expect(original.session.run.clubId).toBe("science-demo");
    expect(replay(142, true, 0, "science-demo")).toEqual(original);
    expect(replay(143, false, 0, "science-demo").trace).not.toEqual(original.trace);
  });

  it("reproduces a kendo run across all three Acts and save/load", () => {
    const original = replay(142, false, 0, "kendo-demo");
    expect(original.session.run.clubId).toBe("kendo-demo");
    expect(replay(142, true, 0, "kendo-demo")).toEqual(original);
    expect(replay(143, false, 0, "kendo-demo").trace).not.toEqual(original.trace);
  });

  it("reproduces a music run across all three Acts and save/load", () => {
    const original = replay(142, false, 0, "music-demo");
    expect(original.session.run.clubId).toBe("music-demo");
    expect(replay(142, true, 0, "music-demo")).toEqual(original);
    expect(replay(143, false, 0, "music-demo").trace).not.toEqual(original.trace);
  });

  it("reproduces an art run across all three Acts and save/load", () => {
    const original = replay(142, false, 0, "art-demo");
    expect(original.session.run.clubId).toBe("art-demo");
    expect(replay(142, true, 0, "art-demo")).toEqual(original);
    expect(replay(143, false, 0, "art-demo").trace).not.toEqual(original.trace);
  });
});
