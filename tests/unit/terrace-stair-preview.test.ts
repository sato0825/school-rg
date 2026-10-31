import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { subscenePreviewForRun } from "../../src/ui/stage-subscene-experiment.js";
import { terraceStairPreviewForRun } from "../../src/ui/terrace-stair-preview.js";

it("uses one stair landing on Act 2 floors 11/12 without changing the run", () => {
  for (const seed of [42, 97]) {
    const run = createRunSession(seed, "literature-demo", demoContent).run;
    const before = JSON.stringify(run);
    for (const floor of [10, 11, 12, 13]) {
      const node = run.map.nodes.find((item) => item.act === 2 && item.floor === floor)!;
      const atNode = { ...run, act: 2 as const, map: { ...run.map, currentNodeId: node.id } };
      const base = subscenePreviewForRun(demoBattleArt, atNode, "local");
      const preview = terraceStairPreviewForRun(base, atNode, true);
      expect(terraceStairPreviewForRun(base, atNode, false)).toEqual(base);
      if (floor === 11 || floor === 12) {
        expect(preview).toMatchObject({ placeId: "science-terrace-stair-landing", artId: "act2-paper-terrace-stair-candidate-v1", subsceneId: null, proxy: false });
        expect(preview.stageUrl).not.toBe(base.stageUrl);
      } else expect(preview).toEqual(base);
      expect(terraceStairPreviewForRun(base, JSON.parse(JSON.stringify(atNode)), true)).toEqual(preview);
    }
    expect(JSON.stringify(run)).toBe(before);
  }
});

it("breaks the Act 2 f10–13 run of one plate on both audited 42-node routes", () => {
  const fixture = JSON.parse(readFileSync(new URL("../fixtures/issue315-stage-routes.json", import.meta.url), "utf8")) as {
    routes: { seed: number; visits: { id: string; kind: string }[] }[];
  };
  for (const route of fixture.routes) {
    const run = createRunSession(route.seed, "literature-demo", demoContent).run;
    const before: string[] = [];
    const stairs: string[] = [];
    for (const visit of route.visits) {
      const node = run.map.nodes.find((item) => item.id === visit.id)!;
      expect(node.kind).toBe(visit.kind);
      const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
      const base = subscenePreviewForRun(demoBattleArt, atNode, "local");
      before.push(base.artId!);
      stairs.push(terraceStairPreviewForRun(base, atNode, true).artId!);
    }
    const repeats = (sequence: string[]) => sequence.slice(1).filter((value, index) => value === sequence[index]).length;
    expect(before).toHaveLength(42);
    expect(repeats(before)).toBe(30);
    expect(repeats(stairs)).toBe(28);
  }
});
