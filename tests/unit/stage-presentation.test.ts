import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { generateRunMap } from "../../src/domain/map-generation.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode, RunState } from "../../src/domain/schema.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import {
  stageBandForNode, stageCandidateUrlByAct, stagePlaceCandidatesByAct,
  stageSelectionForRun, stageUrlForAct, stageUrlForRun,
} from "../../src/ui/stage-presentation.js";

const clock = { nowMs: () => 1000 };
const runAt = (run: RunState, node: MapNode): RunState => ({ ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } });

it("maps the default 12 floors and boss to four candidate places in each Act", () => {
  const run = createRunSession(42, "literature-demo", demoContent).run;
  expect(new Set(Object.values(stageCandidateUrlByAct)).size).toBe(3);
  for (const act of [1, 2, 3] as const) {
    const itinerary = stagePlaceCandidatesByAct[act]!;
    expect(itinerary).toHaveLength(4);
    for (const [floor, band] of [[0, 0], [1, 0], [3, 0], [4, 1], [6, 1], [7, 2], [9, 2], [10, 3], [12, 3], [13, 3]] as const) {
      const node = run.map.nodes.find((item) => item.act === act && item.floor === floor)!;
      const selected = stageSelectionForRun(demoBattleArt, runAt(run, node));
      expect(stageBandForNode(node, run.map.nodes)).toBe(band);
      expect(selected).toEqual({ placeId: itinerary[band]!.placeId, artId: itinerary[band]!.artId, band, stageUrl: itinerary[band]!.url });
    }
  }
});

it("keeps all encounter kinds and lanes on the same floor in the same place", () => {
  const run = createRunSession(51, "literature-demo", demoContent).run;
  const base = run.map.nodes.find((node) => node.act === 2 && node.floor === 7)!;
  for (const kind of ["combat", "elite", "event", "shop", "rest", "treasure"] as const) {
    const node = { ...base, kind };
    const nodes = run.map.nodes.map((item) => item.id === base.id ? node : item);
    expect(stageSelectionForRun(demoBattleArt, { ...run, act: 2, map: { nodes, currentNodeId: node.id } }).placeId).toBe("science-biology-room");
  }
  for (const lane of run.map.nodes.filter((node) => node.act === 2 && node.floor === 7)) {
    expect(stageSelectionForRun(demoBattleArt, runAt(run, lane)).placeId).toBe("science-biology-room");
  }
});

it("handles short runs, Act transitions and missing art without consuming RNG", () => {
  for (const floorsPerAct of [1, 2, 5]) {
    const run = createRunSession(42, "literature-demo", demoContent, {
      floorsPerAct, lanes: 4,
      kindWeights: { combat: 1, elite: 0, event: 1, shop: 1, rest: 1, treasure: 1 },
    }).run;
    const before = JSON.stringify(run);
    for (const act of [1, 2, 3] as const) {
      const chosen = run.map.nodes.filter((node) => node.act === act && (node.kind === "start" || node.kind === "boss" || (node.floor > 0 && node.floor <= floorsPerAct && node.id.endsWith("-n0"))));
      const bands = chosen.map((node) => stageSelectionForRun(demoBattleArt, runAt(run, node)).band!);
      expect(bands).toEqual([...bands].sort((a, b) => a - b));
      expect(bands[0]).toBe(0);
      expect(bands.at(-1)).toBe(3);
    }
    expect(JSON.stringify(run)).toBe(before);
    expect(run.rngState).toEqual(JSON.parse(before).rngState);
  }
  const run = createRunSession(42, "literature-demo", demoContent).run;
  const atMissingNode = { ...run, map: { ...run.map, currentNodeId: "missing" } };
  expect(stageSelectionForRun(demoBattleArt, atMissingNode)).toEqual({ placeId: null, artId: null, band: null, stageUrl: stageUrlForAct(demoBattleArt, 1) });
  const noCandidate = { stageUrl: "fallback.png", stageUrlByAct: { 1: "act-one.png" } };
  expect(stageSelectionForRun(noCandidate, run).stageUrl).toBe("act-one.png");
  expect(stageSelectionForRun(noCandidate, run).artId).toBeNull();
  expect(stageUrlForAct({ stageUrl: "fallback.png" }, 99)).toBe("fallback.png");
});

it("returns the same location after a save/load round trip and for the same seed", () => {
  const first = createRunSession(42, "literature-demo", demoContent);
  const again = createRunSession(42, "literature-demo", demoContent);
  const node = first.run.map.nodes.find((item) => item.act === 3 && item.floor === 10)!;
  const atNode = { ...first, run: runAt(first.run, node), completedNodeIds: [node.id] };
  const selection = stageSelectionForRun(demoBattleArt, atNode.run);
  const saved = serializeRunSession(atNode, demoContent, clock, () => "discard");
  const restored = deserializeRunSession(saved, demoContent, clock);
  expect(stageSelectionForRun(demoBattleArt, restored.run)).toEqual(selection);
  expect(stageUrlForRun(demoBattleArt, runAt(again.run, again.run.map.nodes.find((item) => item.id === node.id)!))).toBe(selection.stageUrl);
  expect(JSON.stringify(saved)).not.toContain("stagePlace");
});

it("preserves the generated map and post-map RNG state for the same seed", () => {
  const first = generateRunMap(42);
  const again = generateRunMap(42);
  expect(first).toEqual(again);
  const run = createRunSession(42, "literature-demo", demoContent).run;
  const originalRng = structuredClone(run.rngState);
  for (const node of run.map.nodes) stageSelectionForRun(demoBattleArt, runAt(run, node));
  expect(run.rngState).toEqual(originalRng);
});
