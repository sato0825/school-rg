import type { RunState } from "../domain/schema.js";
import { stageLayout } from "./stage-layout.js";

export type ResultFxMark = { xPercent: number; kind: "damage" | "heal" | "block" | "block-loss" | "buff" | "debuff"; label: string };
export type ResultFx = { startedAtMs: number; marks: readonly ResultFxMark[] };

const statusVisual: Record<string, { name: string; kind: "buff" | "debuff" }> = {
  strength: { name: "力", kind: "buff" }, barrier: { name: "結界", kind: "buff" },
  focus: { name: "集中", kind: "buff" }, thorns: { name: "反撃", kind: "buff" },
  weak: { name: "弱体", kind: "debuff" }, vulnerable: { name: "脆弱", kind: "debuff" },
  frail: { name: "虚弱", kind: "debuff" }, poison: { name: "毒", kind: "debuff" },
};

/** Read actual resolved deltas, including block and relic reactions, before defeated actors disappear. */
export function resultFxForTransition(before: RunState, after: RunState, allyCount: number, startedAtMs: number): ResultFx | null {
  if (!before.combat || !after.combat) return null;
  const living = before.combat.enemies.filter((enemy) => enemy.hp > 0);
  const layout = stageLayout(allyCount, living.length);
  const marks: ResultFxMark[] = [];
  const add = (xPercent: number, hpBefore: number, hpAfter: number, blockBefore: number, blockAfter: number, statusBefore: Record<string, number>, statusAfter: Record<string, number>) => {
    if (hpAfter < hpBefore) marks.push({ xPercent, kind: "damage", label: `−${hpBefore - hpAfter}` });
    else if (hpAfter > hpBefore) marks.push({ xPercent, kind: "heal", label: `+${hpAfter - hpBefore}` });
    if (blockAfter > blockBefore) marks.push({ xPercent, kind: "block", label: `◇ +${blockAfter - blockBefore}` });
    else if (blockAfter < blockBefore) marks.push({ xPercent, kind: "block-loss", label: `◇ −${blockBefore - blockAfter}` });
    for (const [status, amount] of Object.entries(statusAfter)) {
      const increase = amount - (statusBefore[status] ?? 0);
      if (increase <= 0) continue;
      const visual = statusVisual[status] ?? { name: status, kind: "debuff" as const };
      marks.push({ xPercent, kind: visual.kind, label: `${visual.kind === "buff" ? "↑" : "↓"} ${visual.name} +${increase}` });
    }
  };
  add(layout.allies[0]!.xPercent, before.player.hp, after.player.hp, before.player.block, after.player.block, before.combat.statuses.player, after.combat.statuses.player);
  living.forEach((enemy, index) => {
    const next = after.combat!.enemies.find((item) => item.instanceId === enemy.instanceId);
    if (next) add(layout.enemies[index]!.xPercent, enemy.hp, next.hp, enemy.block, next.block,
      before.combat!.statuses.enemies[enemy.instanceId] ?? {}, after.combat!.statuses.enemies[enemy.instanceId] ?? {});
  });
  return marks.length ? { startedAtMs, marks } : null;
}
