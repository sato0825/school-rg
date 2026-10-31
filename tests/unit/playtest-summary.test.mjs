import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { summarizePlaytests, TARGET_RUN_MS } from "../../scripts/summarize-playtests.mjs";

const makeRecord = (runId, clubId, result, activeMs, battles = []) => ({
  formatVersion: 1, runId, clubId, seed: 42, ascensionLevel: 0, partial: false, activeMs,
  result, battleNodeIds: ["fight"], visits: [
    { nodeId: "a1", act: 1, kind: "start", atActiveMs: 0 },
    { nodeId: "a2", act: 2, kind: "start", atActiveMs: 1_000 },
    { nodeId: "a3", act: 3, kind: "start", atActiveMs: 2_000 },
  ], battles,
});

describe("local playtest summary", () => {
  it("deduplicates snapshots, separates incomplete runs, and excludes legacy or partial battle samples", () => {
    const complete = { nodeId: "fight", act: 1, enemyIds: ["paper-heap"], startedAtActiveMs: 100,
      endedAtActiveMs: 500, hpBefore: 60, hpAfter: 54, turns: 2, result: "won", partial: false };
    const report = summarizePlaytests([
      makeRecord("a", "literature-demo", null, 500),
      makeRecord("a", "literature-demo", "won", TARGET_RUN_MS + 5_000, [complete, { ...complete, partial: true }]),
      makeRecord("b", "literature-demo", null, 2_500),
      { ...makeRecord("c", "science-demo", "lost", 9_000), battles: undefined },
    ]);
    expect(report.uniqueRuns).toBe(3);
    expect(report.clubs["literature-demo"]).toMatchObject({ runs: 2, won: 1, lost: 0, incomplete: 1,
      completionRate: 0.5, medianWonMs: TARGET_RUN_MS + 5_000, wonGapToTargetMs: 5_000,
      battlesRecorded: 2, battlesWithHpAndTime: 1, medianBattleMs: 400, totalHpLoss: 6,
      medianActMs: [1_000, 1_000, TARGET_RUN_MS + 3_000] });
    expect(report.clubs["science-demo"]).toMatchObject({ lost: 1, battlesRecorded: 0, medianWonMs: null });
    expect(report.clubs["art-demo"].completionRate).toBeNull();
    expect(report.note).toContain("not confirmed abandonment");
    expect(() => summarizePlaytests([{ ...makeRecord("x", "art-demo", null, 0), formatVersion: 2 }])).toThrow();
  });

  it("accepts exported JSON through the CLI", () => {
    const fixture = fileURLToPath(new URL("../fixtures/playtest-report.json", import.meta.url));
    const script = fileURLToPath(new URL("../../scripts/summarize-playtests.mjs", import.meta.url));
    const report = JSON.parse(execFileSync(process.execPath, [script, fixture], { encoding: "utf8" }));
    expect(report.clubs["music-demo"].won).toBe(1);
    expect(report.targetRunMs).toBe(TARGET_RUN_MS);
  });

  it("counts repeated encounters within a run and Act while excluding incomplete samples", () => {
    const battle = (act, enemyIds, partial = false) => ({ nodeId: `a${act}-fight`, act, enemyIds,
      startedAtActiveMs: 100, endedAtActiveMs: 500, hpBefore: 40, hpAfter: 38, turns: 1, result: "won", partial });
    const complete = { ...makeRecord("variety", "literature-demo", "won", 3_600_000, [
      battle(1, ["paper-heap", "paper-scrap"]), battle(1, ["paper-scrap", "paper-heap"]),
      battle(2, ["paper-heap"]), battle(2, ["paper-heap"]), battle(3, ["closing-bell"]),
    ]), battleNodeIds: ["a1", "a1b", "a2", "a2b", "a3"], visits: [
      { nodeId: "a1-start", act: 1, kind: "start", atActiveMs: 0 },
      { nodeId: "a1-combat", act: 1, kind: "combat", atActiveMs: 1_000 },
      { nodeId: "a2-shop", act: 2, kind: "shop", atActiveMs: 2_000 },
    ] };
    const report = summarizePlaytests([
      complete,
      { ...makeRecord("unfinished", "literature-demo", null, 1_000, [battle(1, ["paper-heap"])]) },
      { ...makeRecord("partial", "literature-demo", "lost", 2_000, [battle(1, ["paper-heap"])]), partial: true },
      makeRecord("partial-battle", "literature-demo", "lost", 2_000, [battle(1, ["paper-heap"], true)]),
      { ...makeRecord("missing-battle", "literature-demo", "lost", 2_000, [battle(1, ["paper-heap"])]), battleNodeIds: ["fight", "fight-2"] },
      { ...makeRecord("legacy", "literature-demo", "won", 2_000), battles: undefined },
    ]);
    expect(report.clubs["literature-demo"].encounterVariety).toEqual({
      runsWithUsableEncounterRecords: 1, medianRepeatedBattlesPerRun: 2,
      byAct: [
        { act: 1, battles: 2, repeatedBattles: 1, distinctEnemyIds: 2 },
        { act: 2, battles: 2, repeatedBattles: 1, distinctEnemyIds: 1 },
        { act: 3, battles: 1, repeatedBattles: 0, distinctEnemyIds: 1 },
      ],
    });
    expect(report.clubs["literature-demo"].observedVisits).toEqual({
      fullRunsWithVisits: 4, visitKinds: { start: 10, combat: 1, shop: 1 },
    });
  });
});
