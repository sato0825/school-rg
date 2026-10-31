import type { RunState } from "../domain/schema.js";
import type { SubscenePreview } from "./stage-subscene-experiment.js";

export const stageWingCandidateUrl = new URL("../assets/stages/act3-paper-stage-wing-candidate-v1.png", import.meta.url).href;

/** #340 preview only: floor 11/12 connects the auditorium to the stage boss. */
export function stageWingPreviewForRun(base: SubscenePreview, run: RunState, enabled: boolean): SubscenePreview {
  if (!enabled) return base;
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node || node.act !== 3 || (node.floor !== 11 && node.floor !== 12)) return base;
  return {
    ...base,
    placeId: "auditorium-stage-wing",
    artId: "act3-paper-stage-wing-candidate-v1",
    stageUrl: stageWingCandidateUrl,
    subsceneId: null,
    proxy: false,
  };
}
