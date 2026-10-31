import type { Card, RunState } from "../domain/schema.js";
import { stageLayout } from "./stage-layout.js";

export type CardFx = {
  kind: "attack" | "support";
  cardId: string;
  sourceXPercent: number;
  targetXPercents: readonly number[];
  startedAtMs: number;
};

/** Presentation coordinates captured before the card resolves, so a defeated target still receives its flash. */
export function cardFxForUse(card: Card, run: RunState, targetEnemyInstanceId: string | null, allyCount: number, startedAtMs: number): CardFx {
  const enemies = run.combat?.enemies.filter((enemy) => enemy.hp > 0) ?? [];
  const layout = stageLayout(allyCount, enemies.length);
  const sourceXPercent = layout.allies[0]!.xPercent;
  if (card.type !== "attack") return { kind: "support", cardId: card.id, sourceXPercent, targetXPercents: [sourceXPercent], startedAtMs };
  const targetXPercents = card.target === "all_enemies"
    ? layout.enemies.map((slot) => slot.xPercent)
    : [layout.enemies[Math.max(0, enemies.findIndex((enemy) => enemy.instanceId === targetEnemyInstanceId))]?.xPercent].filter((value): value is number => value !== undefined);
  return { kind: "attack", cardId: card.id, sourceXPercent, targetXPercents, startedAtMs };
}
