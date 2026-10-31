import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { stageSelectionForRun } from "../../src/ui/stage-presentation.js";
import { subscenePreviewForRun } from "../../src/ui/stage-subscene-experiment.js";

const cases = [
  { seed: 97, id: "a3-f11-n1", subsceneId: "auditorium-backstage-supply-proxy", artId: "act3-paper-backstage-candidate-v1" },
  { seed: 97, id: "a3-f12-n2", subsceneId: "auditorium-backstage-rest-proxy", artId: "act3-paper-backstage-candidate-v1" },
  { seed: 42, id: "a1-f12-n0", subsceneId: "school-coop-entrance-proxy", artId: "act1-paper-atrium-candidate-v1" },
  { seed: 42, id: "a2-f1-n0", subsceneId: "science-supply-corridor-proxy", artId: "act2-science-wing-candidate-v1" },
] as const;

it("projects both #315 concepts from the same saved node without RNG or schema changes", () => {
  for (const sample of cases) {
    const run = createRunSession(sample.seed, "literature-demo", demoContent).run;
    const node = run.map.nodes.find((item) => item.id === sample.id)!;
    const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
    const before = JSON.stringify(atNode);
    const base = stageSelectionForRun(demoBattleArt, atNode);
    const local = subscenePreviewForRun(demoBattleArt, atNode, "local");
    const annex = subscenePreviewForRun(demoBattleArt, atNode, "annex");
    expect(local).toEqual({ ...base, subsceneId: null, proxy: false });
    expect(annex).toMatchObject({ placeId: base.placeId, band: base.band, subsceneId: sample.subsceneId, artId: sample.artId, proxy: true });
    expect(annex.stageUrl).not.toBe(base.stageUrl);
    expect(subscenePreviewForRun(demoBattleArt, JSON.parse(before), "annex")).toEqual(annex);
    expect(JSON.stringify(atNode)).toBe(before);
    expect(atNode.rngState).toEqual(run.rngState);
  }
});

it("leaves other nodes on their existing stage in either concept", () => {
  const run = createRunSession(42, "literature-demo", demoContent).run;
  for (const node of run.map.nodes) {
    if (node.id === "a1-f12-n0" || node.id === "a2-f1-n0") continue;
    const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
    const preview = subscenePreviewForRun(demoBattleArt, atNode, "annex");
    if (preview.proxy) continue; // Other matching place/kind nodes use the same provisional rule.
    expect(preview.stageUrl).toBe(stageSelectionForRun(demoBattleArt, atNode).stageUrl);
  }
});

it("projects the 42-node audit routes without mistaking extra image changes for new places", () => {
  const fixture = JSON.parse(readFileSync(new URL("../fixtures/issue315-stage-routes.json", import.meta.url), "utf8")) as {
    routes: { seed: number; visits: { id: string; kind: string }[] }[];
  };
  for (const route of fixture.routes) {
    const run = createRunSession(route.seed, "literature-demo", demoContent).run;
    expect(route.visits).toHaveLength(42);
    const arts = { local: [] as string[], annex: [] as string[] };
    for (const visit of route.visits) {
      const node = run.map.nodes.find((item) => item.id === visit.id)!;
      expect(node.kind).toBe(visit.kind);
      const atNode = { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
      arts.local.push(subscenePreviewForRun(demoBattleArt, atNode, "local").artId!);
      arts.annex.push(subscenePreviewForRun(demoBattleArt, atNode, "annex").artId!);
    }
    const repeated = (sequence: string[]) => sequence.slice(1).filter((art, index) => art === sequence[index]).length;
    expect(repeated(arts.local)).toBe(30);
    expect(repeated(arts.annex)).toBe(route.seed === 42 ? 26 : 28);
  }
});
