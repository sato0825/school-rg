import { describe, expect, it } from "vitest";
import { createDemoBattle, demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { finishPlaytest, finishPlaytestBattle, observePlaytest, parsePlaytestRecord, recordPlaytestBattle, recordPlaytestContent, resumePlaytest, startPlaytest, visitPlaytestNode } from "../../src/ui/playtest-metrics.js";

const run = createRunSession(42, "science-demo", demoContent).run;
const startNode = run.map.nodes.find((node) => node.id === run.map.currentNodeId)!;

describe("opt-in playtest metrics", () => {
  it("counts only active intervals across pause, reload and terminal state", () => {
    let tracker = startPlaytest(run, "run-a", 100);
    tracker = observePlaytest(tracker, 1_100, true);
    tracker = observePlaytest(tracker, 2_100, false);
    tracker = observePlaytest(tracker, 5_100, true);
    expect(tracker.record.activeMs).toBe(2_000);
    const saved = parsePlaytestRecord(JSON.parse(JSON.stringify(tracker.record)));
    tracker = resumePlaytest(saved, run, "run-a", 10_000, false);
    tracker = observePlaytest(tracker, 20_000, true);
    expect(tracker.record.activeMs).toBe(2_000);
    tracker = finishPlaytest(tracker, "won", 21_500);
    expect(tracker.record.activeMs).toBe(3_500);
    expect(observePlaytest(tracker, 30_000, true).record.activeMs).toBe(3_500);
    expect(() => observePlaytest(tracker, 10_000, true)).toThrow(/backwards/);
  });

  it("deduplicates visits and battles and rejects mismatched records", () => {
    let tracker = startPlaytest(run, "run-b", 0);
    const combat = createDemoBattle();
    tracker = visitPlaytestNode(visitPlaytestNode(tracker, startNode), startNode);
    tracker = recordPlaytestBattle(recordPlaytestBattle(tracker, combat), combat);
    expect(tracker.record.visits).toHaveLength(1);
    expect(tracker.record.battleNodeIds).toEqual(["demo-battle"]);
    expect(tracker.record.battles).toHaveLength(1);
    expect(tracker.record.battles[0]?.enemyIds).toEqual(["paper-heap"]);
    tracker = observePlaytest(tracker, 3_000, true);
    tracker = finishPlaytestBattle(tracker, { ...combat, player: { ...combat.player, hp: combat.player.hp - 5 }, combat: { ...combat.combat!, turn: 3 } }, "won");
    expect(tracker.record.battles[0]).toMatchObject({ startedAtActiveMs: 0, endedAtActiveMs: 3_000,
      hpBefore: combat.player.hp, hpAfter: combat.player.hp - 5, turns: 3, result: "won", partial: false });
    expect(finishPlaytestBattle(tracker, combat, "won").record.battles).toEqual(tracker.record.battles);
    expect(() => resumePlaytest(tracker.record, { ...run, clubId: "art-demo" }, "run-b", 1)).toThrow(/does not match/);
    expect(() => resumePlaytest(tracker.record, run, "another-run", 1)).toThrow(/does not match/);
    expect(() => parsePlaytestRecord({ ...tracker.record, activeMs: -1 })).toThrow();
  });

  it("loads legacy records and labels a resumed battle's missing start as partial", () => {
    const combat = createDemoBattle();
    const old = startPlaytest(combat, "old", 0).record;
    const { battles: _omitted, contentPartial: _contentPartial, contentEvents: _contentEvents, ...legacyFields } = old;
    const legacy = { ...legacyFields, formatVersion: 1 };
    expect(_omitted).toEqual([]);
    expect(_contentPartial).toBe(false);
    expect(_contentEvents).toEqual([]);
    const migrated = parsePlaytestRecord(legacy);
    expect(migrated).toMatchObject({ formatVersion: 2, contentPartial: true, contentEvents: [] });
    let tracker = resumePlaytest(migrated, combat, "old", 1_000);
    tracker = recordPlaytestBattle(tracker, combat, true);
    tracker = finishPlaytestBattle(tracker, combat, "lost");
    expect(tracker.record.battles[0]).toMatchObject({ partial: true, result: "lost" });
  });

  it("preserves content events across save and resume and rejects conflicting duplicate IDs", () => {
    const input = { eventId: "offer-1", nodeId: startNode.id, act: startNode.act, source: "reward" as const,
      kind: "card" as const, action: "offered" as const, contentId: "card-a", offerId: "card-a", available: true };
    let tracker = startPlaytest(run, "content", 0);
    tracker = recordPlaytestContent(tracker, input);
    const first = tracker;
    tracker = observePlaytest(tracker, 1_000, true);
    expect(recordPlaytestContent(tracker, input).record.contentEvents).toEqual(first.record.contentEvents);
    expect(() => recordPlaytestContent(tracker, { ...input, contentId: "card-b" })).toThrow(/conflicting/);
    const saved = parsePlaytestRecord(JSON.parse(JSON.stringify(tracker.record)));
    expect(resumePlaytest(saved, run, "content", 2_000).record.contentEvents).toEqual(first.record.contentEvents);
    expect(() => parsePlaytestRecord({ ...saved, contentEvents: [{ ...saved.contentEvents[0], contentId: "" }] })).toThrow();
  });
});
