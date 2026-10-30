import { DEFAULT_GAME_CONFIG } from "../domain/config.js";
import type { RelicRule } from "../domain/relic-hooks.js";
import type { Effect, Potion, Relic } from "../domain/schema.js";
import { addCurrentTurnTime } from "../domain/time-resource.js";

/** Additional #118 content. Values remain provisional until the full-run balance pass. */
export const extraConsumableBalance = {
  stampAcquiredGold: 6,
  stampCombatGold: 3,
  lunchHeal: 2,
  bandageHitHeal: 1,
  timerCardMs: 400,
  guardPotionBlock: 8,
  splashPotionDamage: 4,
  teaPotionHeal: 3,
  teaPotionMs: 1_000,
} as const;

const b = extraConsumableBalance;

export const extraConsumableEffects: Effect[] = [
  { id: "potion-guard-effect", kind: "block", parameters: { amount: b.guardPotionBlock } },
  { id: "potion-splash-effect", kind: "damage", parameters: { amount: b.splashPotionDamage } },
  { id: "potion-tea-heal-effect", kind: "heal", parameters: { amount: b.teaPotionHeal } },
  { id: "potion-tea-time-effect", kind: "add_time", parameters: { amountMs: b.teaPotionMs } },
];

export const extraRelics: Relic[] = [
  { id: "attendance-stamp", name: "出席のスタンプ", triggerIds: ["stamp-acquired", "stamp-combat-end"], effectIds: [] },
  { id: "lunch-coupon", name: "学食の引換券", triggerIds: ["coupon-combat-end"], effectIds: [] },
  { id: "pocket-bandage", name: "予備の絆創膏", triggerIds: ["bandage-hit-taken"], effectIds: [] },
  { id: "practice-timer", name: "練習用タイマー", triggerIds: ["timer-card-used"], effectIds: [] },
];

export const extraPotions: Potion[] = [
  { id: "potion-guard", name: "厚紙の盾", input: { text: "shield", locale: "en" }, target: "self", effectIds: ["potion-guard-effect"] },
  { id: "potion-splash", name: "色水の小瓶", input: { text: "splash", locale: "en" }, target: "all_enemies", effectIds: ["potion-splash-effect"] },
  { id: "potion-tea", name: "温かいお茶", input: { text: "tea", locale: "en" }, target: "self", effectIds: ["potion-tea-heal-effect", "potion-tea-time-effect"] },
];

export const extraRelicRules: RelicRule[] = [
  { id: "stamp-acquired", on: "acquired", priority: 0, stackMode: "aggregate", apply: (run) => ({ ...run, gold: run.gold + b.stampAcquiredGold }) },
  { id: "stamp-combat-end", on: "combat_end", priority: 0, stackMode: "each", apply: (run, _event, stacks) => ({ ...run, gold: run.gold + b.stampCombatGold * stacks }) },
  { id: "coupon-combat-end", on: "combat_end", priority: 1, stackMode: "each", condition: (run) => run.player.hp > 0, apply: (run, _event, stacks) => ({ ...run, player: { ...run.player, hp: Math.min(run.player.maxHp, run.player.hp + b.lunchHeal * stacks) } }) },
  { id: "bandage-hit-taken", on: "hit_taken", priority: 0, stackMode: "each", condition: (run, event) => (event.hpLost ?? 0) > 0 && run.player.hp > 0, apply: (run, _event, stacks) => ({ ...run, player: { ...run.player, hp: Math.min(run.player.maxHp, run.player.hp + b.bandageHitHeal * stacks) } }) },
  { id: "timer-card-used", on: "card_used", priority: 2, stackMode: "each", condition: (run) => run.combat?.phase === "PLAYER_INPUT", apply: (run, _event, stacks) =>
    addCurrentTurnTime(run, b.timerCardMs * stacks, { nowMs: () => run.combat!.clock.lastEventAtMs }, DEFAULT_GAME_CONFIG) },
];
