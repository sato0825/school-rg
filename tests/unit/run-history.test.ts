import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { appendRunHistory, emptyRunHistory, historyCounts, legacyTerminalRunId, parseRunHistory, terminalRunEntry } from "../../src/domain/run-history.js";
import { createRunSession } from "../../src/domain/run-flow.js";

describe("run history", () => {
  const start = createRunSession(42, "literature-demo", demoContent);
  const finalNode = start.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
  const won = {
    ...start, runId: "run-a", screen: "won" as const,
    completedNodeIds: [...start.completedNodeIds, finalNode.id],
    run: { ...start.run, act: 3 as const, map: { ...start.run.map, currentNodeId: finalNode.id } },
  };

  it("records terminal facts once per run ID and counts clubs separately", () => {
    const victory = terminalRunEntry(won);
    expect(victory).toMatchObject({ runId: "run-a", clubId: "literature-demo", seed: 42, result: "won", act: 3, floor: finalNode.floor, reachedNodes: 2 });
    const defeat = terminalRunEntry({ ...start, runId: "run-b", screen: "lost", run: { ...start.run, player: { ...start.run.player, hp: 0 } } });
    expect(defeat).toMatchObject({ result: "lost", hp: 0, reachedNodes: 1 });
    const first = appendRunHistory(emptyRunHistory(), victory);
    expect(appendRunHistory(first, victory)).toBe(first);
    const second = appendRunHistory(first, defeat);
    expect(historyCounts(second, "literature-demo")).toEqual({ won: 1, lost: 1 });
    expect(historyCounts(second, "science-demo")).toEqual({ won: 0, lost: 0 });
    expect(parseRunHistory(JSON.parse(JSON.stringify(second)))).toEqual(second);
  });

  it("rejects nonterminal and invalid persisted histories", () => {
    expect(() => terminalRunEntry({ ...start, runId: "run-a" })).toThrow(/terminal/);
    expect(() => terminalRunEntry({ ...won, runId: undefined })).toThrow(/terminal/);
    const entry = terminalRunEntry(won);
    expect(() => parseRunHistory({ formatVersion: 1, entries: [entry, entry] })).toThrow(/duplicate/);
    expect(() => parseRunHistory({ formatVersion: 2, entries: [] })).toThrow();
    expect(() => parseRunHistory({ formatVersion: 1, entries: [{ ...entry, hp: -1 }] })).toThrow();
  });

  it("uses a stable legacy terminal identity across reloads", () => {
    expect(legacyTerminalRunId("older save")).toBe(legacyTerminalRunId("older save"));
    expect(legacyTerminalRunId("older save")).not.toBe(legacyTerminalRunId("another save"));
  });
});
