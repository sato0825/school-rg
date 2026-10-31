import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { subscenePreviewForRun } from "../../src/ui/stage-subscene-experiment.js";
import { stageWingPreviewForRun } from "../../src/ui/stage-wing-preview.js";

it("keeps one candidate stage wing only on Act 3 floor 11/12 and preserves the save state", () => {
  const run = createRunSession(97, "literature-demo", demoContent).run;
  const before = JSON.stringify(run);
  for (const floor of [10, 11, 12, 13]) {
    const node = run.map.nodes.find((item) => item.act === 3 && item.floor === floor)!;
    const atNode = { ...run, act: 3 as const, map: { ...run.map, currentNodeId: node.id } };
    const base = subscenePreviewForRun(demoBattleArt, atNode, "local");
    const preview = stageWingPreviewForRun(base, atNode, true);
    expect(stageWingPreviewForRun(base, atNode, false)).toEqual(base);
    if (floor === 11 || floor === 12) {
      expect(preview).toMatchObject({ placeId: "auditorium-stage-wing", artId: "act3-paper-stage-wing-candidate-v1", subsceneId: null, proxy: false });
      expect(preview.stageUrl).not.toBe(base.stageUrl);
    } else expect(preview).toEqual(base);
    expect(stageWingPreviewForRun(base, JSON.parse(JSON.stringify(atNode)), true)).toEqual(preview);
  }
  expect(JSON.stringify(run)).toBe(before);
});
