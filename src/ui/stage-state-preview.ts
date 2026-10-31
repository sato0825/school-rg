import type { RunState } from "../domain/schema.js";

/** #315 C concept: visual state derived from the arrived node, never from a timer. */
export type StageStatePreview = Readonly<{
  light: "early" | "middle" | "late";
  activity: "ordinary" | "service" | "rest" | "event" | "treasure" | "boss";
  bossApproach: boolean;
}>;

export function stageStatePreviewForRun(run: RunState): StageStatePreview | null {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) return null;
  const light = node.floor <= 4 ? "early" : node.floor <= 8 ? "middle" : "late";
  const activity = node.kind === "shop" ? "service"
    : node.kind === "rest" ? "rest"
      : node.kind === "event" ? "event"
        : node.kind === "treasure" ? "treasure"
          : node.kind === "boss" ? "boss" : "ordinary";
  return { light, activity, bossApproach: node.floor >= 11 };
}
