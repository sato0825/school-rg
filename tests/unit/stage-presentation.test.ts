import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { stageCandidateUrlByAct, stageCandidateUrlByActPhase, stagePhaseForNode, stageUrlForAct, stageUrlForRun } from "../../src/ui/stage-presentation.js";

it("selects distinct Act plates and preserves a replaceable fallback", () => {
  expect(new Set(Object.values(stageCandidateUrlByAct)).size).toBe(3);
  for (const act of [1, 2, 3]) expect(stageUrlForAct(demoBattleArt, act)).toBe(stageCandidateUrlByAct[act]);
  expect(stageUrlForAct({ stageUrl: "default.png" }, 2)).toBe("default.png");
  expect(stageUrlForAct(demoBattleArt, 99)).toBe(demoBattleArt.stageUrl);
});

it("uses two distinct places per Act without changing seeded map or save data", () => {
  const session = createRunSession(42, "literature-demo", demoContent);
  const before = JSON.stringify(session.run);
  for (const act of [1, 2, 3] as const) {
    const nodes = session.run.map.nodes.filter((node) => node.act === act);
    const first = nodes.find((node) => node.floor === 1)!;
    const late = nodes.find((node) => node.floor === 7)!;
    const earlyRun = { ...session.run, act, map: { ...session.run.map, currentNodeId: first.id } };
    const lateRun = { ...session.run, act, map: { ...session.run.map, currentNodeId: late.id } };
    expect(stagePhaseForNode(first, session.run.map.nodes)).toBe("early");
    expect(stagePhaseForNode(late, session.run.map.nodes)).toBe("late");
    expect(stageUrlForRun(demoBattleArt, earlyRun)).toBe(stageCandidateUrlByActPhase[act]!.early);
    expect(stageUrlForRun(demoBattleArt, lateRun)).toBe(stageCandidateUrlByActPhase[act]!.late);
    expect(stageUrlForRun(demoBattleArt, earlyRun)).not.toBe(stageUrlForRun(demoBattleArt, lateRun));
  }
  expect(JSON.stringify(session.run)).toBe(before);
  expect(stageUrlForRun({ stageUrl: "fallback.png" }, session.run)).toBe("fallback.png");
});
