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
});
