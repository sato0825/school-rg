import type { RunState } from "../domain/schema.js";
import { stageLayout } from "./stage-layout.js";

export type ResultFxMark = { xPercent: number; kind: "damage" | "heal" | "block" | "block-loss"; label: string };
export type ResultFx = { startedAtMs: number; marks: readonly ResultFxMark[] };

/** Read actual resolved deltas, including block and relic reactions, before defeated actors disappear. */
export function resultFxForTransition(before: RunState, after: RunState, allyCount: number, startedAtMs: number): ResultFx | null {
  if (!before.combat || !after.combat) return null;
  const living = before.combat.enemies.filter((enemy) => enemy.hp > 0);
  const layout = stageLayout(allyCount, living.length);
  const marks: ResultFxMark[] = [];
  const add = (xPercent: number, hpBefore: number, hpAfter: number, blockBefore: number, blockAfter: number) => {
    if (hpAfter < hpBefore) marks.push({ xPercent, kind: "damage", label: `−${hpBefore - hpAfter}` });
    else if (hpAfter > hpBefore) marks.push({ xPercent, kind: "heal", label: `+${hpAfter - hpBefore}` });
    if (blockAfter > blockBefore) marks.push({ xPercent, kind: "block", label: `◇ +${blockAfter - blockBefore}` });
    else if (blockAfter < blockBefore) marks.push({ xPercent, kind: "block-loss", label: `◇ −${blockBefore - blockAfter}` });
  };
  add(layout.allies[0]!.xPercent, before.player.hp, after.player.hp, before.player.block, after.player.block);
  living.forEach((enemy, index) => {
    const next = after.combat!.enemies.find((item) => item.instanceId === enemy.instanceId);
    if (next) add(layout.enemies[index]!.xPercent, enemy.hp, next.hp, enemy.block, next.block);
  });
  return marks.length ? { startedAtMs, marks } : null;
}
