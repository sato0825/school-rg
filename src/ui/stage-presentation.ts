import type { MapNode, RunState } from "../domain/schema.js";

/** Environment plates stay separate from characters, enemies, effects and rules. */
export const stageCandidateUrlByAct: Readonly<Record<number, string>> = {
  1: new URL("../assets/stages/act1-paper-atrium-candidate-v1.png", import.meta.url).href,
  2: new URL("../assets/stages/act2-science-wing-candidate-v1.png", import.meta.url).href,
  3: new URL("../assets/stages/act3-auditorium-foyer-candidate-v1.png", import.meta.url).href,
};

/** Legacy two-band art is retained for custom presentations and existing previews. */
export const stageCandidateUrlByActPhase: Readonly<Record<number, Readonly<{ early: string; late: string }>>> = {
  1: { early: stageCandidateUrlByAct[1]!, late: new URL("../assets/stages/act1-library-entrance-candidate-v1.png", import.meta.url).href },
  2: { early: stageCandidateUrlByAct[2]!, late: new URL("../assets/stages/act2-biology-room-candidate-v1.png", import.meta.url).href },
  3: { early: stageCandidateUrlByAct[3]!, late: new URL("../assets/stages/act3-backstage-candidate-v1.png", import.meta.url).href },
};

export type StagePlaceCandidate = Readonly<{ placeId: string; artId: string; url: string }>;
/** #281 provisional itinerary. Place IDs remain stable when candidate art is replaced. */
export const stagePlaceCandidatesByAct: Readonly<Record<number, readonly StagePlaceCandidate[]>> = {
  1: [
    { placeId: "school-atrium", artId: "act1-paper-atrium-candidate-v1", url: stageCandidateUrlByAct[1]! },
    { placeId: "school-library", artId: "act1-paper-library-candidate-v2", url: new URL("../assets/stages/act1-paper-library-candidate-v2.png", import.meta.url).href },
    { placeId: "school-music-room", artId: "act1-paper-music-room-candidate-v1", url: new URL("../assets/stages/act1-paper-music-room-candidate-v1.png", import.meta.url).href },
    { placeId: "school-covered-courtyard", artId: "act1-paper-covered-courtyard-candidate-v1", url: new URL("../assets/stages/act1-paper-covered-courtyard-candidate-v1.png", import.meta.url).href },
  ],
  2: [
    { placeId: "science-entry", artId: "act2-paper-science-entry-candidate-v2", url: new URL("../assets/stages/act2-paper-science-entry-candidate-v2.png", import.meta.url).href },
    { placeId: "science-physics-room", artId: "act2-paper-physics-candidate-v1", url: new URL("../assets/stages/act2-paper-physics-candidate-v1.png", import.meta.url).href },
    { placeId: "science-biology-room", artId: "act2-paper-biology-room-candidate-v1", url: new URL("../assets/stages/act2-paper-biology-room-candidate-v1.png", import.meta.url).href },
    { placeId: "science-observation-terrace", artId: "act2-paper-observation-terrace-candidate-v1", url: new URL("../assets/stages/act2-paper-observation-terrace-candidate-v1.png", import.meta.url).href },
  ],
  3: [
    { placeId: "auditorium-plaza", artId: "act3-paper-auditorium-plaza-candidate-v1", url: new URL("../assets/stages/act3-paper-auditorium-plaza-candidate-v1.png", import.meta.url).href },
    { placeId: "auditorium-foyer", artId: "act3-paper-auditorium-foyer-candidate-v1", url: new URL("../assets/stages/act3-paper-auditorium-foyer-candidate-v1.png", import.meta.url).href },
    { placeId: "auditorium-backstage", artId: "act3-paper-backstage-candidate-v1", url: new URL("../assets/stages/act3-paper-backstage-candidate-v1.png", import.meta.url).href },
    { placeId: "auditorium-stage", artId: "act3-paper-auditorium-stage-candidate-v1", url: new URL("../assets/stages/act3-paper-auditorium-stage-candidate-v1.png", import.meta.url).href },
  ],
};

export const stageCandidateUrlByPlaceId: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(stagePlaceCandidatesByAct).flat().map(({ placeId, url }) => [placeId, url]),
);
export const stageCandidateArtIdByPlaceId: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(stagePlaceCandidatesByAct).flat().map(({ placeId, artId }) => [placeId, artId]),
);

export type StageArt = {
  stageUrl: string;
  stageUrlByAct?: Readonly<Record<number, string>>;
  stageUrlByActPhase?: Readonly<Record<number, Readonly<{ early: string; late: string }>>>;
  stageUrlByPlaceId?: Readonly<Record<string, string>>;
  stageArtIdByPlaceId?: Readonly<Record<string, string>>;
};
export type StageSelection = Readonly<{ placeId: string | null; artId: string | null; band: number | null; stageUrl: string }>;

export function stageUrlForAct(art: StageArt, act: number): string {
  return art.stageUrlByAct?.[act] ?? art.stageUrl;
}

/** Legacy coarse hook; the actual itinerary uses four bands. */
export function stagePhaseForNode(node: MapNode, nodes: readonly MapNode[]): "early" | "late" {
  const boss = nodes.find((item) => item.act === node.act && item.kind === "boss");
  if (!boss) return "early";
  const lastRegularFloor = Math.max(0, boss.floor - 1);
  return node.floor <= Math.ceil(lastRegularFloor / 2) ? "early" : "late";
}

/** Pure floor-to-place mapping. Lanes and encounter kinds never change a place. */
export function stageBandForNode(node: MapNode, nodes: readonly MapNode[]): number {
  if (node.kind === "boss") return 3;
  if (node.floor === 0) return 0;
  const boss = nodes.find((item) => item.act === node.act && item.kind === "boss");
  const regularFloors = (boss?.floor ?? 1) - 1;
  if (regularFloors < 1) return 0;
  return Math.max(0, Math.min(3, Math.floor((node.floor - 1) * 4 / regularFloors)));
}

export function stageSelectionForRun(art: StageArt, run: RunState): StageSelection {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) return { placeId: null, artId: null, band: null, stageUrl: stageUrlForAct(art, run.act) };
  const band = stageBandForNode(node, run.map.nodes);
  const candidate = stagePlaceCandidatesByAct[node.act]?.[band];
  const url = candidate ? art.stageUrlByPlaceId?.[candidate.placeId] : undefined;
  return {
    placeId: candidate?.placeId ?? null,
    artId: url && candidate ? (art.stageArtIdByPlaceId?.[candidate.placeId] ?? null) : null,
    band,
    stageUrl: url ?? stageUrlForAct(art, node.act),
  };
}

/** Visual selection consumes no RNG and adds nothing to the save schema. */
export function stageUrlForRun(art: StageArt, run: RunState): string {
  return stageSelectionForRun(art, run).stageUrl;
}
