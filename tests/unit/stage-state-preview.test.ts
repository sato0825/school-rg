import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { stageSelectionForRun } from "../../src/ui/stage-presentation.js";
import { stageStatePreviewForRun } from "../../src/ui/stage-state-preview.js";

it("derives the same layer from the arrived node after serialization without drawing RNG", () => {
  const session = createRunSession(97, "literature-demo", demoContent);
  const node = session.run.map.nodes.find((item) => item.id === "a3-f11-n1")!;
  const run = { ...session.run, act: node.act, map: { ...session.run.map, currentNodeId: node.id } };
  const before = JSON.stringify(run);
  expect(stageStatePreviewForRun(run)).toEqual({ light: "late", activity: "service", bossApproach: true });
  expect(stageStatePreviewForRun(JSON.parse(before))).toEqual(stageStatePreviewForRun(run));
  expect(JSON.stringify(run)).toBe(before);
  expect(run.rngState).toEqual(session.run.rngState);
});

it("reduces identical plate and light states on both 42-node routes without moving places", () => {
  const fixture = JSON.parse(readFileSync(new URL("../fixtures/issue315-stage-routes.json", import.meta.url), "utf8")) as {
    routes: { seed: number; visits: { id: string; kind: string }[] }[];
  };
  for (const route of fixture.routes) {
    const run = createRunSession(route.seed, "literature-demo", demoContent).run;
    const plate: string[] = [];
    const plateAndLayer: string[] = [];
    for (const visit of route.visits) {
      const node = run.map.nodes.find((item) => item.id === visit.id)!;
      expect(node.kind).toBe(visit.kind);
      const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
      const selection = stageSelectionForRun(demoBattleArt, atNode);
      const state = stageStatePreviewForRun(atNode)!;
      plate.push(selection.artId!);
      plateAndLayer.push(`${selection.artId}:${state.light}:${state.bossApproach}`);
    }
    const repeats = (sequence: string[]) => sequence.slice(1).filter((value, index) => value === sequence[index]).length;
    expect(plate).toHaveLength(42);
    expect(repeats(plate)).toBe(30);
    expect(repeats(plateAndLayer)).toBe(21);
  }
});
