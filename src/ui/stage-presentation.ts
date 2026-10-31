import type { MapNode, RunState } from "../domain/schema.js";

/** Environment plates stay separate from characters, enemies, effects and game rules. */
export const stageCandidateUrlByAct: Readonly<Record<number, string>> = {
  1: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  2: new URL("../assets/stages/act2-science-wing-candidate-v1.png", import.meta.url).href,
  3: new URL("../assets/stages/act3-auditorium-foyer-candidate-v1.png", import.meta.url).href,
};

export const stagePhases = ["early", "middle", "late", "final"] as const;
export type StagePhase = (typeof stagePhases)[number];

/** Four replaceable locations per Act; the first and third retain #179's plates. */
export const stageCandidateUrlByActPhase: Readonly<Record<number, Readonly<Record<StagePhase, string>>>> = {
  1: { early: stageCandidateUrlByAct[1]!, middle: new URL("../assets/stages/act1-music-room-candidate-v1.png", import.meta.url).href, late: new URL("../assets/stages/act1-library-entrance-candidate-v1.png", import.meta.url).href, final: new URL("../assets/stages/act1-covered-courtyard-candidate-v1.png", import.meta.url).href },
  2: { early: stageCandidateUrlByAct[2]!, middle: new URL("../assets/stages/act2-physics-room-candidate-v1.png", import.meta.url).href, late: new URL("../assets/stages/act2-biology-room-candidate-v1.png", import.meta.url).href, final: new URL("../assets/stages/act2-observation-terrace-candidate-v1.png", import.meta.url).href },
  3: { early: stageCandidateUrlByAct[3]!, middle: new URL("../assets/stages/act3-assembly-courtyard-candidate-v1.png", import.meta.url).href, late: new URL("../assets/stages/act3-backstage-candidate-v1.png", import.meta.url).href, final: new URL("../assets/stages/act3-auditorium-stage-candidate-v1.png", import.meta.url).href },
};

/** Floor fractions can be changed without touching map generation or save data. */
export const stagePhaseBoundaries: readonly number[] = [0.25, 0.5, 0.75];

export type StageArt = {
  stageUrl: string;
  stageUrlByAct?: Readonly<Record<number, string>>;
  stageUrlByActPhase?: Readonly<Record<number, Partial<Readonly<Record<StagePhase, string>>>>>;
};

export function stageUrlForAct(art: StageArt, act: number): string {
  return art.stageUrlByAct?.[act] ?? art.stageUrl;
}

export function stagePhaseForNode(node: MapNode, nodes: readonly MapNode[], boundaries: readonly number[] = stagePhaseBoundaries): StagePhase {
  const boss = nodes.find((item) => item.act === node.act && item.kind === "boss");
  if (!boss) return "early";
  const lastRegularFloor = Math.max(0, boss.floor - 1);
  if (node.kind === "boss") return "final";
  if (lastRegularFloor <= 2) return node.floor === 1 ? "early" : "late";
  const progress = Math.max(0, Math.min(1, node.floor / lastRegularFloor));
  const index = boundaries.findIndex((boundary) => progress <= boundary);
  return stagePhases[index < 0 ? stagePhases.length - 1 : index]!;
}

/** Visual selection consumes no RNG and adds nothing to the save schema. */
export function stageUrlForRun(art: StageArt, run: RunState): string {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) return stageUrlForAct(art, run.act);
  const phase = stagePhaseForNode(node, run.map.nodes);
  const actPlates = art.stageUrlByActPhase?.[node.act];
  const legacyPhase = phase === "middle" ? "early" : phase === "final" ? "late" : phase;
  return actPlates?.[phase] ?? actPlates?.[legacyPhase] ?? stageUrlForAct(art, node.act);
}
