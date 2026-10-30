import * as z from "zod";
import { destinationAfterUse } from "./card-keywords.js";
import { duplicateCombatCard, moveCombatCard, recoverCombatCard } from "./card-operations.js";
import { drawCards } from "./card-piles.js";
import { requireSetting, type GameConfig } from "./config.js";
import { enqueueEffectAction, resolveDueEffects, type ActorRef, type EffectAction, type EffectEvent } from "./effect-primitives.js";
import { createEventQueue } from "./event-queue.js";
import type { ContentRegistry, Effect, RunState } from "./schema.js";
import { addCurrentTurnTime } from "./time-resource.js";
import type { MonotonicClock } from "./clock.js";
import { clearStatus, statusAmount } from "./status-engine.js";

export type CardEffectSelection = {
  targetEnemyInstanceId: string | null;
  targetHandInstanceId?: string | null;
  targetDiscardInstanceId?: string | null;
  targetDebuff?: "weak" | "vulnerable" | "frail" | "poison" | null;
};

const amount = z.strictObject({ amount: z.number().int().nonnegative() });
const multi = z.strictObject({ amount: z.number().int().nonnegative(), hits: z.number().int().positive() });
const count = z.strictObject({ count: z.number().int().nonnegative() });
const weak = z.strictObject({ turns: z.number().int().nonnegative() });
const time = z.strictObject({ amountMs: z.number().int().nonnegative() });
const conditional = z.strictObject({
  amount: z.number().int().nonnegative(),
  conditionalAmount: z.number().int().nonnegative(),
  condition: z.literal("target_hp_at_most_percent"),
  thresholdPercent: z.number().int().min(0).max(100),
});
const conditionalStatus = z.strictObject({
  status: z.enum(["poison", "weak"]),
  amount: z.number().int().nonnegative(),
  conditionalAmount: z.number().int().nonnegative(),
});
const removeBlock = z.strictObject({ all: z.literal(true) });
const perTurn = z.strictObject({ amountPerTurn: z.number().int().nonnegative() });
const payment = z.strictObject({ hpCost: z.number().int().nonnegative(), drawCount: z.number().int().nonnegative() });

function requireOne(countValue: number): void {
  if (countValue !== 1) throw new RangeError("this card effect requires exactly one selected target");
}

function selectedHandCard(run: RunState, usedCardInstanceId: string, selection: CardEffectSelection): string {
  const target = selection.targetHandInstanceId;
  if (!target || target === usedCardInstanceId || !run.combat?.hand.includes(target)) {
    throw new RangeError("another hand card must be selected");
  }
  return target;
}

function selectedDiscardCard(run: RunState, selection: CardEffectSelection): string {
  const target = selection.targetDiscardInstanceId;
  if (!target || !run.combat?.discardPile.includes(target)) throw new RangeError("a discard card must be selected");
  return target;
}

function selectedDebuff(run: RunState, selection: CardEffectSelection): NonNullable<CardEffectSelection["targetDebuff"]> {
  const target = selection.targetDebuff;
  if (!target || statusAmount(run, { side: "player" }, target) === 0) throw new RangeError("an active player debuff must be selected");
  return target;
}

function targetEnemy(run: RunState, instanceId: string | null): ActorRef {
  if (!instanceId) throw new RangeError("enemy target selection is required");
  const enemy = run.combat?.enemies.find((item) => item.instanceId === instanceId);
  if (!enemy || enemy.hp === 0) throw new RangeError(`invalid living enemy target: ${instanceId}`);
  return { side: "enemy", instanceId };
}

function applyAction(run: RunState, action: EffectAction, nowMs: number, config: GameConfig): RunState {
  const queue = enqueueEffectAction(createEventQueue<EffectEvent>(), run, nowMs, action);
  return resolveDueEffects(run, queue, nowMs, config).run;
}

function resolveEffect(
  run: RunState,
  usedCardInstanceId: string,
  effect: Effect,
  selection: CardEffectSelection,
  clock: MonotonicClock,
  config: GameConfig,
): RunState {
  const player: ActorRef = { side: "player" };
  const nowMs = clock.nowMs();
  switch (effect.kind) {
    case "damage":
    case "damage_multi":
    case "damage_all":
    case "damage_pierce": {
      const parameters = effect.kind === "damage_multi" ? multi.parse(effect.parameters) : amount.parse(effect.parameters);
      const target = effect.kind === "damage_all" ? "all_enemies" : targetEnemy(run, selection.targetEnemyInstanceId);
      return applyAction(run, {
        kind: "attack", source: player, target, amount: parameters.amount,
        hits: effect.kind === "damage_multi" ? (parameters as z.infer<typeof multi>).hits : 1,
        pierceBlock: effect.kind === "damage_pierce",
      }, nowMs, config);
    }
    case "block": return applyAction(run, { kind: "block", target: player, amount: amount.parse(effect.parameters).amount }, nowMs, config);
    case "heal": return applyAction(run, { kind: "heal", target: player, amount: amount.parse(effect.parameters).amount }, nowMs, config);
    case "draw": {
      const drawn = drawCards(run.combat!, run.rngState, count.parse(effect.parameters).count, requireSetting(config.handLimit));
      return { ...run, rngState: drawn.rngState, combat: drawn.combat };
    }
    case "apply_strength": return applyAction(run, { kind: "status", target: player, status: "strength", delta: amount.parse(effect.parameters).amount }, nowMs, config);
    case "apply_weak": return applyAction(run, { kind: "status", target: targetEnemy(run, selection.targetEnemyInstanceId), status: "weak", delta: weak.parse(effect.parameters).turns }, nowMs, config);
    case "apply_poison": return applyAction(run, { kind: "status", target: targetEnemy(run, selection.targetEnemyInstanceId), status: "poison", delta: amount.parse(effect.parameters).amount }, nowMs, config);
    case "add_time": return addCurrentTurnTime(run, time.parse(effect.parameters).amountMs, clock, config);
    case "conditional_damage": {
      const parameters = conditional.parse(effect.parameters);
      const target = targetEnemy(run, selection.targetEnemyInstanceId);
      const enemy = run.combat!.enemies.find((item) => item.instanceId === selection.targetEnemyInstanceId)!;
      const active = enemy.hp * 100 <= enemy.maxHp * parameters.thresholdPercent;
      return applyAction(run, { kind: "attack", source: player, target, amount: active ? parameters.conditionalAmount : parameters.amount, hits: 1, pierceBlock: false }, nowMs, config);
    }
    case "damage_if_status": {
      const parameters = conditionalStatus.parse(effect.parameters);
      const target = targetEnemy(run, selection.targetEnemyInstanceId);
      const active = statusAmount(run, target, parameters.status) > 0;
      return applyAction(run, { kind: "attack", source: player, target, amount: active ? parameters.conditionalAmount : parameters.amount, hits: 1, pierceBlock: false }, nowMs, config);
    }
    case "remove_block": {
      removeBlock.parse(effect.parameters);
      return applyAction(run, { kind: "remove_block", target: targetEnemy(run, selection.targetEnemyInstanceId) }, nowMs, config);
    }
    case "thorns": return applyAction(run, { kind: "status", target: player, status: "thorns", delta: amount.parse(effect.parameters).amount }, nowMs, config);
    case "persistent_block": return applyAction(run, { kind: "status", target: player, status: "barrier", delta: perTurn.parse(effect.parameters).amountPerTurn }, nowMs, config);
    case "persistent_strength": return applyAction(run, { kind: "status", target: player, status: "focus", delta: perTurn.parse(effect.parameters).amountPerTurn }, nowMs, config);
    case "retrieve_discard": {
      requireOne(count.parse(effect.parameters).count);
      const result = recoverCombatCard(run.combat!, selectedDiscardCard(run, selection), "hand", { maxHandSize: requireSetting(config.handLimit) });
      return { ...run, combat: result.combat };
    }
    case "exhaust_card": {
      requireOne(count.parse(effect.parameters).count);
      const result = moveCombatCard(run.combat!, selectedHandCard(run, usedCardInstanceId, selection), "exhaustPile", { maxHandSize: requireSetting(config.handLimit) });
      return { ...run, combat: result.combat };
    }
    case "copy_card": {
      requireOne(count.parse(effect.parameters).count);
      const result = duplicateCombatCard(run.combat!, selectedHandCard(run, usedCardInstanceId, selection), "hand", { maxHandSize: requireSetting(config.handLimit) });
      return { ...run, combat: result.combat };
    }
    case "remove_debuff": {
      requireOne(count.parse(effect.parameters).count);
      return clearStatus(run, player, selectedDebuff(run, selection));
    }
    case "pay_hp_draw": {
      const parameters = payment.parse(effect.parameters);
      if (run.player.hp <= parameters.hpCost) throw new RangeError("insufficient HP for card payment");
      const paid = { ...run, player: { ...run.player, hp: run.player.hp - parameters.hpCost } };
      const drawn = drawCards(paid.combat!, paid.rngState, parameters.drawCount, requireSetting(config.handLimit));
      return { ...paid, rngState: drawn.rngState, combat: drawn.combat };
    }
    default: throw new RangeError(`unsupported card effect kind: ${effect.kind}`);
  }
}

/** Runs a completed typed card while keeping it out of reshuffles until effects finish. */
export function useCardEffects(
  run: RunState,
  cardInstanceId: string,
  selection: CardEffectSelection,
  config: GameConfig,
  content: ContentRegistry,
): RunState {
  if (run.combat?.phase !== "PLAYER_INPUT") throw new Error("expected PLAYER_INPUT");
  const eventAtMs = run.combat.clock.lastEventAtMs;
  const clock: MonotonicClock = { nowMs: () => eventAtMs };
  if (!run.combat.hand.includes(cardInstanceId)) throw new RangeError(`card is not in hand: ${cardInstanceId}`);
  const instance = run.combat.cards.find((card) => card.instanceId === cardInstanceId)!;
  const definition = content.cards.find((card) => card.id === instance.cardId);
  if (!definition) throw new RangeError(`unknown card definition: ${instance.cardId}`);
  if (definition.target === "enemy") targetEnemy(run, selection.targetEnemyInstanceId);
  const effectIds = instance.upgraded && definition.upgradeEffectIds ? definition.upgradeEffectIds : definition.effectIds;
  for (const effectId of effectIds) {
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) throw new RangeError(`unknown card effect: ${effectId}`);
    if (effect.kind === "exhaust_card" || effect.kind === "copy_card") selectedHandCard(run, cardInstanceId, selection);
    if (effect.kind === "retrieve_discard") selectedDiscardCard(run, selection);
    if (effect.kind === "remove_debuff") selectedDebuff(run, selection);
    if (effect.kind === "pay_hp_draw" && run.player.hp <= payment.parse(effect.parameters).hpCost) throw new RangeError("insufficient HP for card payment");
  }
  const staged = moveCombatCard(run.combat, cardInstanceId, "resolvingPile", { maxHandSize: requireSetting(config.handLimit) }).combat;
  let current: RunState = { ...run, combat: staged };
  for (const effectId of effectIds) {
    if (current.combat?.phase === "WON" || current.combat?.phase === "LOST") break;
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) throw new RangeError(`unknown card effect: ${effectId}`);
    current = resolveEffect(current, cardInstanceId, effect, selection, clock, config);
  }
  const destination = definition.type === "power" || destinationAfterUse(current.combat!, content, cardInstanceId) === "exhaust"
    ? "exhaustPile" : "discardPile";
  return { ...current, combat: moveCombatCard(current.combat!, cardInstanceId, destination, { maxHandSize: requireSetting(config.handLimit) }).combat };
}
