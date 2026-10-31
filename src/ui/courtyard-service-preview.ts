import type { RunState } from "../domain/schema.js";
import type { SubscenePreview } from "./stage-subscene-experiment.js";

export const courtyardServiceCandidateUrl = new URL("../assets/stages/act1-paper-courtyard-service-candidate-v1.png", import.meta.url).href;

/** #356 preview only: the courtyard's service arcade connects floor 11/12 to the boss approach. */
export function courtyardServicePreviewForRun(base: SubscenePreview, run: RunState, enabled: boolean): SubscenePreview {
  if (!enabled) return base;
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node || node.act !== 1 || (node.floor !== 11 && node.floor !== 12)) return base;
  return {
    ...base,
    placeId: "school-courtyard-service",
    artId: "act1-paper-courtyard-service-candidate-v1",
    stageUrl: courtyardServiceCandidateUrl,
    subsceneId: null,
    proxy: false,
  };
}
