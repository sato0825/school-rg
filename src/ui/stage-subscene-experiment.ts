import type { RunState } from "../domain/schema.js";
import { stageCandidateUrlByAct, stageSelectionForRun, type StageArt, type StageSelection } from "./stage-presentation.js";

/** #315 comparison only. Existing plates proxy connected rooms; none is approved subscene art. */
export type SubsceneConcept = "local" | "annex";
export type SubscenePreview = StageSelection & Readonly<{ subsceneId: string | null; proxy: boolean }>;

const annexProxyByPlaceAndKind: Readonly<Record<string, Readonly<{ subsceneId: string; artId: string; url: string }>>> = {
  "school-covered-courtyard:shop": {
    subsceneId: "school-coop-entrance-proxy", artId: "act1-paper-atrium-candidate-v1", url: stageCandidateUrlByAct[1]!,
  },
  "science-entry:shop": {
    subsceneId: "science-supply-corridor-proxy", artId: "act2-science-wing-candidate-v1", url: stageCandidateUrlByAct[2]!,
  },
  "auditorium-stage:shop": {
    subsceneId: "auditorium-backstage-supply-proxy", artId: "act3-paper-backstage-candidate-v1",
    url: new URL("../assets/stages/act3-paper-backstage-candidate-v1.png", import.meta.url).href,
  },
  "auditorium-stage:rest": {
    subsceneId: "auditorium-backstage-rest-proxy", artId: "act3-paper-backstage-candidate-v1",
    url: new URL("../assets/stages/act3-paper-backstage-candidate-v1.png", import.meta.url).href,
  },
};

/** Deterministic projection from the current node; no new save field or RNG draw. */
export function subscenePreviewForRun(art: StageArt, run: RunState, concept: SubsceneConcept): SubscenePreview {
  const base = stageSelectionForRun(art, run);
  if (concept === "local") return { ...base, subsceneId: null, proxy: false };
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  const proxy = node && base.placeId ? annexProxyByPlaceAndKind[`${base.placeId}:${node.kind}`] : undefined;
  if (!proxy) return { ...base, subsceneId: null, proxy: false };
  return { ...base, artId: proxy.artId, stageUrl: proxy.url, subsceneId: proxy.subsceneId, proxy: true };
}
