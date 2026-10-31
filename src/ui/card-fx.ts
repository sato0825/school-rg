import type { Card, Effect, RunState } from "../domain/schema.js";
import { stageLayout } from "./stage-layout.js";

export type CardFx = {
  kind: "attack" | "support";
  visualAction?: "retain" | "copy" | "transform";
  sourceXPercent: number;
  targetXPercents: readonly number[];
  startedAtMs: number;
};

/** Presentation coordinates captured before the card resolves, so a defeated target still receives its flash. */
export function cardFxForUse(card: Card, run: RunState, targetEnemyInstanceId: string | null, allyCount: number, startedAtMs: number, effects: readonly Effect[] = []): CardFx {
  const enemies = run.combat?.enemies.filter((enemy) => enemy.hp > 0) ?? [];
  const layout = stageLayout(allyCount, enemies.length);
  const sourceXPercent = layout.allies[0]!.xPercent;
  const effectKinds = new Set(effects.filter((effect) => card.effectIds.includes(effect.id)).map((effect) => effect.kind));
  const visualAction = effectKinds.has("transform_card") ? "transform"
    : effectKinds.has("copy_card") ? "copy"
      : card.keywordIds.includes("retain") ? "retain" : null;
  const action = visualAction ? { visualAction } : {};
  if (card.type !== "attack") return { kind: "support", sourceXPercent, targetXPercents: [sourceXPercent], startedAtMs, ...action };
  const targetXPercents = card.target === "all_enemies"
    ? layout.enemies.map((slot) => slot.xPercent)
    : [layout.enemies[Math.max(0, enemies.findIndex((enemy) => enemy.instanceId === targetEnemyInstanceId))]?.xPercent].filter((value): value is number => value !== undefined);
  return { kind: "attack", sourceXPercent, targetXPercents, startedAtMs, ...action };
}
