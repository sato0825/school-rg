import type { MapNode, RunState } from "../domain/schema.js";

/** Environment plates stay separate from characters, enemies, effects and game rules. */
export const stageCandidateUrlByAct: Readonly<Record<number, string>> = {
  1: new URL("../assets/stages/act1-paper-atrium-candidate-v1.png", import.meta.url).href,
  2: new URL("../assets/stages/act2-science-wing-candidate-v1.png", import.meta.url).href,
  3: new URL("../assets/stages/act3-auditorium-foyer-candidate-v1.png", import.meta.url).href,
};

export const stageCandidateUrlByActPhase: Readonly<Record<number, Readonly<{ early: string; late: string }>>> = {
  1: { early: stageCandidateUrlByAct[1]!, late: new URL("../assets/stages/act1-library-entrance-candidate-v1.png", import.meta.url).href },
  2: { early: stageCandidateUrlByAct[2]!, late: new URL("../assets/stages/act2-biology-room-candidate-v1.png", import.meta.url).href },
  3: { early: stageCandidateUrlByAct[3]!, late: new URL("../assets/stages/act3-backstage-candidate-v1.png", import.meta.url).href },
};

export type StageArt = {
  stageUrl: string;
  stageUrlByAct?: Readonly<Record<number, string>>;
  stageUrlByActPhase?: Readonly<Record<number, Readonly<{ early: string; late: string }>>>;
};

export function stageUrlForAct(art: StageArt, act: number): string {
  return art.stageUrlByAct?.[act] ?? art.stageUrl;
}

export function stagePhaseForNode(node: MapNode, nodes: readonly MapNode[]): "early" | "late" {
  const boss = nodes.find((item) => item.act === node.act && item.kind === "boss");
  if (!boss) return "early";
  const lastRegularFloor = Math.max(0, boss.floor - 1);
  return node.floor <= Math.ceil(lastRegularFloor / 2) ? "early" : "late";
}

/** Visual selection consumes no RNG and adds nothing to the save schema. */
export function stageUrlForRun(art: StageArt, run: RunState): string {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) return stageUrlForAct(art, run.act);
  const phase = stagePhaseForNode(node, run.map.nodes);
  return art.stageUrlByActPhase?.[node.act]?.[phase] ?? stageUrlForAct(art, node.act);
}
