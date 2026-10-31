import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { subscenePreviewForRun } from "../../src/ui/stage-subscene-experiment.js";
import { stageWingPreviewForRun } from "../../src/ui/stage-wing-preview.js";
import { courtyardServicePreviewForRun } from "../../src/ui/courtyard-service-preview.js";

it("uses the service arcade only for Act 1 floor 11/12 without changing the run", () => {
  const run = createRunSession(97, "literature-demo", demoContent).run;
  const before = JSON.stringify(run);
  for (const floor of [10, 11, 12, 13]) {
    const node = run.map.nodes.find((item) => item.act === 1 && item.floor === floor)!;
    const atNode = { ...run, map: { ...run.map, currentNodeId: node.id } };
    const base = subscenePreviewForRun(demoBattleArt, atNode, "local");
    const preview = courtyardServicePreviewForRun(base, atNode, true);
    expect(courtyardServicePreviewForRun(base, atNode, false)).toEqual(base);
    if (floor === 11 || floor === 12) {
      expect(preview).toMatchObject({ placeId: "school-courtyard-service", artId: "act1-paper-courtyard-service-candidate-v1", subsceneId: null, proxy: false });
      expect(preview.stageUrl).not.toBe(base.stageUrl);
    } else expect(preview).toEqual(base);
    expect(courtyardServicePreviewForRun(base, JSON.parse(JSON.stringify(atNode)), true)).toEqual(preview);
  }
  expect(JSON.stringify(run)).toBe(before);
});

it("breaks two repeated transitions per seed, while keeping candidate stages separate", () => {
  const fixture = JSON.parse(readFileSync(new URL("../fixtures/issue315-stage-routes.json", import.meta.url), "utf8")) as {
    routes: { seed: number; visits: { id: string; kind: string }[] }[];
  };
  const repeats = (sequence: string[]) => sequence.slice(1).filter((value, index) => value === sequence[index]).length;
  for (const route of fixture.routes) {
    const run = createRunSession(route.seed, "literature-demo", demoContent).run;
    const baseline: string[] = [];
    const service: string[] = [];
    const withStageWing: string[] = [];
    for (const visit of route.visits) {
      const node = run.map.nodes.find((item) => item.id === visit.id)!;
      expect(node.kind).toBe(visit.kind);
      const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
      const base = subscenePreviewForRun(demoBattleArt, atNode, "local");
      baseline.push(base.artId!);
      service.push(courtyardServicePreviewForRun(base, atNode, true).artId!);
      withStageWing.push(courtyardServicePreviewForRun(stageWingPreviewForRun(base, atNode, true), atNode, true).artId!);
    }
    expect(baseline).toHaveLength(42);
    expect(repeats(baseline)).toBe(30);
    expect(repeats(service)).toBe(28);
    expect(repeats(withStageWing)).toBe(26);
  }
});
