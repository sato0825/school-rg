import { expect, it } from "vitest";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { stageCandidateUrlByAct, stageUrlForAct } from "../../src/ui/stage-presentation.js";

it("selects distinct Act plates and preserves a replaceable fallback", () => {
  expect(new Set(Object.values(stageCandidateUrlByAct)).size).toBe(3);
  for (const act of [1, 2, 3]) expect(stageUrlForAct(demoBattleArt, act)).toBe(stageCandidateUrlByAct[act]);
  expect(stageUrlForAct({ stageUrl: "default.png" }, 2)).toBe("default.png");
  expect(stageUrlForAct(demoBattleArt, 99)).toBe(demoBattleArt.stageUrl);
});
