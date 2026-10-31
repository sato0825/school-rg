import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { generateRunMap } from "../../src/domain/map-generation.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { stageCandidateUrlByAct, stageCandidateUrlByActPhase, stagePhaseForNode, stagePhases, stageUrlForAct, stageUrlForRun } from "../../src/ui/stage-presentation.js";

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

it("uses the same early/late rule for the short development run", () => {
  const session = createRunSession(42, "literature-demo", demoContent);
  const shortMap = generateRunMap(42, {
    floorsPerAct: 2, lanes: 4,
    kindWeights: { combat: 1, elite: 0, event: 1, shop: 1, rest: 1, treasure: 1 },
  });
  const first = shortMap.nodes.find((node) => node.act === 1 && node.floor === 1)!;
  const second = shortMap.nodes.find((node) => node.act === 1 && node.floor === 2)!;
  const withNode = (currentNodeId: string) => ({ ...session.run, map: { nodes: shortMap.nodes, currentNodeId } });
  expect(stageUrlForRun(demoBattleArt, withNode(first.id))).toBe(stageCandidateUrlByActPhase[1]!.early);
  expect(stageUrlForRun(demoBattleArt, withNode(second.id))).toBe(stageCandidateUrlByActPhase[1]!.late);
});

it("uses four distinct places per Act across a normal run and assigns its boss the final place", () => {
  const session = createRunSession(42, "literature-demo", demoContent);
  const before = JSON.stringify(session.run);
  for (const act of [1, 2, 3] as const) {
    const nodes = session.run.map.nodes.filter((node) => node.act === act);
    const boss = nodes.find((node) => node.kind === "boss")!;
    const chosen = [1, 4, 7, 10].map((floor) => nodes.find((node) => node.floor === floor)!);
    expect(chosen.map((node) => stagePhaseForNode(node, nodes))).toEqual(stagePhases);
    expect(stagePhaseForNode(boss, nodes)).toBe("final");
    const urls = chosen.map((node) => stageUrlForRun(demoBattleArt, { ...session.run, act, map: { ...session.run.map, currentNodeId: node.id } }));
    expect(new Set(urls).size).toBe(4);
    expect(urls).toEqual(stagePhases.map((phase) => stageCandidateUrlByActPhase[act]![phase]));
    expect(stageUrlForRun(demoBattleArt, { ...session.run, act, map: { ...session.run.map, currentNodeId: boss.id } })).toBe(urls[3]);
  }
  expect(JSON.stringify(session.run)).toBe(before);
});

it("keeps two-phase art packs replaceable and allows configured cut points", () => {
  const session = createRunSession(42, "literature-demo", demoContent);
  const nodes = session.run.map.nodes.filter((node) => node.act === 1);
  const fourth = nodes.find((node) => node.floor === 4)!;
  expect(stagePhaseForNode(fourth, nodes, [0.1, 0.2, 0.3])).toBe("final");
  const run = { ...session.run, map: { ...session.run.map, currentNodeId: fourth.id } };
  expect(stageUrlForRun({ stageUrl: "default", stageUrlByActPhase: { 1: { early: "a", late: "b" } } }, run)).toBe("a");
});
