import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { finishPlaytest, observePlaytest, parsePlaytestRecord, recordPlaytestBattle, resumePlaytest, startPlaytest, visitPlaytestNode } from "../../src/ui/playtest-metrics.js";

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
    tracker = visitPlaytestNode(visitPlaytestNode(tracker, startNode), startNode);
    tracker = recordPlaytestBattle(recordPlaytestBattle(tracker, "battle-node"), "battle-node");
    expect(tracker.record.visits).toHaveLength(1);
    expect(tracker.record.battleNodeIds).toEqual(["battle-node"]);
    expect(() => resumePlaytest(tracker.record, { ...run, clubId: "art-demo" }, "run-b", 1)).toThrow(/does not match/);
    expect(() => resumePlaytest(tracker.record, run, "another-run", 1)).toThrow(/does not match/);
    expect(() => parsePlaytestRecord({ ...tracker.record, activeMs: -1 })).toThrow();
  });
});
