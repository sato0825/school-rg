import * as z from "zod";
import { destinationAfterUse } from "./card-keywords.js";
import { moveCombatCard } from "./card-operations.js";
import { drawCards } from "./card-piles.js";
import { requireSetting, type GameConfig } from "./config.js";
import { enqueueEffectAction, resolveDueEffects, type ActorRef, type EffectAction, type EffectEvent } from "./effect-primitives.js";
import { createEventQueue } from "./event-queue.js";
import type { ContentRegistry, Effect, RunState } from "./schema.js";
import { addCurrentTurnTime } from "./time-resource.js";
import type { MonotonicClock } from "./clock.js";

export type CardEffectSelection = { targetEnemyInstanceId: string | null };

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
const removeBlock = z.strictObject({ all: z.literal(true) });
const perTurn = z.strictObject({ amountPerTurn: z.number().int().nonnegative() });

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
    case "remove_block": {
      removeBlock.parse(effect.parameters);
      return applyAction(run, { kind: "remove_block", target: targetEnemy(run, selection.targetEnemyInstanceId) }, nowMs, config);
    }
    case "thorns": return applyAction(run, { kind: "status", target: player, status: "thorns", delta: amount.parse(effect.parameters).amount }, nowMs, config);
    case "persistent_block": return applyAction(run, { kind: "status", target: player, status: "barrier", delta: perTurn.parse(effect.parameters).amountPerTurn }, nowMs, config);
    case "persistent_strength": return applyAction(run, { kind: "status", target: player, status: "focus", delta: perTurn.parse(effect.parameters).amountPerTurn }, nowMs, config);
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
  const staged = moveCombatCard(run.combat, cardInstanceId, "resolvingPile", { maxHandSize: requireSetting(config.handLimit) }).combat;
  let current: RunState = { ...run, combat: staged };
  for (const effectId of effectIds) {
    if (current.combat?.phase === "WON" || current.combat?.phase === "LOST") break;
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) throw new RangeError(`unknown card effect: ${effectId}`);
    current = resolveEffect(current, effect, selection, clock, config);
  }
  const destination = definition.type === "power" || destinationAfterUse(current.combat!, content, cardInstanceId) === "exhaust"
    ? "exhaustPile" : "discardPile";
  return { ...current, combat: moveCombatCard(current.combat!, cardInstanceId, destination, { maxHandSize: requireSetting(config.handLimit) }).combat };
}
