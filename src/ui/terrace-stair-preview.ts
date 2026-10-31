import type { RunState } from "../domain/schema.js";
import type { SubscenePreview } from "./stage-subscene-experiment.js";

export const terraceStairCandidateUrl = new URL("../assets/stages/act2-paper-terrace-stair-candidate-v1.png", import.meta.url).href;

/** #357 comparison only: the middle of the terrace approach gains one distinct landing. */
export function terraceStairPreviewForRun(base: SubscenePreview, run: RunState, enabled: boolean): SubscenePreview {
  if (!enabled) return base;
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node || node.act !== 2 || (node.floor !== 11 && node.floor !== 12)) return base;
  return {
    ...base,
    placeId: "science-terrace-stair-landing",
    artId: "act2-paper-terrace-stair-candidate-v1",
    stageUrl: terraceStairCandidateUrl,
    subsceneId: null,
    proxy: false,
  };
}
