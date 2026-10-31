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
      completionRate: 0.5, medianWonMs: TARGET_RUN_MS + 5_000,
      rangeWonMs: { min: TARGET_RUN_MS + 5_000, max: TARGET_RUN_MS + 5_000 }, wonGapToTargetMs: 5_000,
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

  it("summarizes complete v2 exposure by Act and source while excluding old, partial, and malformed samples", () => {
    const base = makeRecord("content", "science-demo", "won", 5_000);
    const event = (eventId, nodeId, act, source, kind, action, contentId, atActiveMs) => ({ eventId, nodeId, act,
      source, kind, action, contentId, offerId: contentId, available: true, atActiveMs });
    const complete = { ...base, formatVersion: 2, contentPartial: false, visits: [
      { nodeId: "r1", act: 1, kind: "combat", atActiveMs: 100 },
      { nodeId: "r2", act: 1, kind: "combat", atActiveMs: 200 },
      { nodeId: "s1", act: 2, kind: "shop", atActiveMs: 1_000 },
    ], contentEvents: [
      event("1", "r1", 1, "reward", "card", "offered", "card-a", 100),
      event("2", "r1", 1, "reward", "card", "selected", "card-a", 101),
      event("3", "r1", 1, "reward", "card", "acquired", "card-a", 102),
      event("4", "r2", 1, "reward", "card", "offered", "card-a", 200),
      event("5", "s1", 2, "shop", "potion", "offered", "potion-a", 1_000),
      event("6", "s1", 2, "shop", "potion", "skipped", "potion-a", 1_200),
    ] };
    const report = summarizePlaytests([complete,
      { ...makeRecord("legacy", "science-demo", "won", 1_000) },
      { ...complete, runId: "partial", contentPartial: true },
      { ...complete, runId: "unfinished", result: null },
      { ...complete, runId: "broken", contentEvents: [complete.contentEvents[0], complete.contentEvents[0]] },
      { ...complete, runId: "missing", contentEvents: [{ ...complete.contentEvents[0], available: undefined }] },
    ]);
    const exposure = report.clubs["science-demo"].contentExposure;
    expect(exposure.runsWithUsableContentRecords).toBe(1);
    expect(exposure.byAct[0]).toMatchObject({ offered: 2, availableOffers: 2, selected: 1, acquired: 1, repeatedOffers: 1, selectionRate: 0.5,
      bySource: { reward: { offered: 2, selected: 1, acquired: 1, repeatedOffers: 1, selectionRate: 0.5 } } });
    expect(exposure.byAct[1]).toMatchObject({ offered: 1, skipped: 1, selectionRate: 0,
      bySource: { shop: { offered: 1, skipped: 1, selectionRate: 0 } } });
    expect(exposure.byAct[2].selectionRate).toBeNull();
  });

  it("counts separate choices in one event as distinct offers, then detects actual re-exposure", () => {
    const base = makeRecord("events", "art-demo", "won", 3_000);
    const event = (eventId, nodeId, offerId) => ({ eventId, nodeId, act: 1, source: "event", kind: "event_choice",
      action: "offered", contentId: "after-school-board", offerId, available: true, atActiveMs: 1_000 });
    const record = { ...base, formatVersion: 2, contentPartial: false, visits: [
      { nodeId: "event-1", act: 1, kind: "event", atActiveMs: 1_000 },
      { nodeId: "event-2", act: 1, kind: "event", atActiveMs: 2_000 },
    ], contentEvents: [event("help-1", "event-1", "help"), event("borrow-1", "event-1", "borrow"),
      event("help-2", "event-2", "help")] };
    const summary = summarizePlaytests([record]);
    expect(summary.clubs["art-demo"].contentExposure.byAct[0]).toMatchObject({ offered: 3, repeatedOffers: 1,
      eventsShown: 2, repeatedEvents: 1 });
    expect(summary.clubs["art-demo"].rangeWonMs).toEqual({ min: 3_000, max: 3_000 });
  });
});
