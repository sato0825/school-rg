import * as z from "zod";
import type { MonotonicClock } from "./clock.js";
import { requireSetting, type GameConfig } from "./config.js";
import { enqueueEffectAction, resolveDueEffects, type EffectAction, type EffectEvent } from "./effect-primitives.js";
import { createEventQueue } from "./event-queue.js";
import type { ContentRegistry, RunState } from "./schema.js";
import { recordCombatAction } from "./combat-action-log.js";
import { addCurrentTurnTime } from "./time-resource.js";
import { advanceSelectionTime, tickPlayerTurn, type TurnEndDisposition } from "./turn-state.js";
import { chooseTypingCard, chooseTypingEnemyTarget, createTypingState, pressTypingKey, type SelectionResult, type TypableCard, type TypingKeyEvent } from "./typing.js";

const amount = z.strictObject({ amount: z.number().int().nonnegative() });
const time = z.strictObject({ amountMs: z.number().int().nonnegative() });

function choices(run: RunState, content: ContentRegistry): TypableCard[] {
  return run.potionIds.map((potionId, index) => {
    const potion = content.potions.find((item) => item.id === potionId);
    if (!potion) throw new RangeError(`unknown owned potion: ${potionId}`);
    return { instanceId: `potion-${index}`, word: potion.input.text, target: potion.target };
  });
}

function potionIndex(instanceId: string, run: RunState): number {
  const match = /^potion-(0|[1-9]\d*)$/.exec(instanceId);
  const index = match ? Number(match[1]) : -1;
  if (!Number.isSafeInteger(index) || index < 0 || index >= run.potionIds.length) throw new RangeError(`unknown potion slot: ${instanceId}`);
  return index;
}

export function collectPotion(run: RunState, potionId: string, content: ContentRegistry, config: GameConfig): RunState {
  if (!content.potions.some((potion) => potion.id === potionId)) throw new RangeError(`unknown potion: ${potionId}`);
  if (run.potionIds.length >= requireSetting(config.potionSlots)) throw new RangeError("potion slots are full");
  return { ...run, potionIds: [...run.potionIds, potionId] };
}

export function discardPotion(run: RunState, slotIndex: number): RunState {
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || slotIndex >= run.potionIds.length) throw new RangeError("invalid potion slot");
  return { ...run, potionIds: run.potionIds.filter((_, index) => index !== slotIndex), combat: run.combat ? { ...run.combat, potionControl: undefined } : null };
}

function applyPotion(run: RunState, instanceId: string, targetEnemyInstanceId: string | null, clock: MonotonicClock, config: GameConfig, content: ContentRegistry): RunState {
  if (run.combat?.phase !== "PLAYER_INPUT" || run.combat.clock.paused) throw new Error("potion requires active player input");
  const index = potionIndex(instanceId, run);
  const potion = content.potions.find((item) => item.id === run.potionIds[index])!;
  if (potion.target === "enemy" && (!targetEnemyInstanceId || !run.combat.enemies.some((enemy) => enemy.instanceId === targetEnemyInstanceId && enemy.hp > 0))) {
    throw new RangeError("living enemy potion target is required");
  }
  let current = run;
  for (const effectId of potion.effectIds) {
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) throw new RangeError(`unknown potion effect: ${effectId}`);
    if (effect.kind === "add_time") {
      current = addCurrentTurnTime(current, time.parse(effect.parameters).amountMs, clock, config);
      continue;
    }
    let action: EffectAction;
    const target = potion.target === "enemy" ? { side: "enemy" as const, instanceId: targetEnemyInstanceId! } : { side: "player" as const };
    if (effect.kind === "heal") action = { kind: "heal", target, amount: amount.parse(effect.parameters).amount };
    else if (effect.kind === "block") action = { kind: "block", target, amount: amount.parse(effect.parameters).amount };
    else if (effect.kind === "damage" && (potion.target === "enemy" || potion.target === "all_enemies")) {
      action = { kind: "attack", source: { side: "player" }, target: potion.target === "all_enemies" ? "all_enemies" : target, amount: amount.parse(effect.parameters).amount, hits: 1, pierceBlock: false };
    } else throw new RangeError(`unsupported potion effect: ${effect.kind}`);
    const queue = enqueueEffectAction(createEventQueue<EffectEvent>(), current, current.combat!.clock.lastEventAtMs, action);
    current = resolveDueEffects(current, queue, current.combat!.clock.lastEventAtMs, config).run;
  }
  const resolved = { ...current, potionIds: current.potionIds.filter((_, position) => position !== index) };
  return recordCombatAction(run, resolved, { kind: "potion", actionId: potion.id, actorEnemyInstanceId: null, targetEnemyInstanceId });
}

function applySelection(run: RunState, result: SelectionResult, clock: MonotonicClock, config: GameConfig, content: ContentRegistry, disposition: TurnEndDisposition): RunState {
  let current: RunState = { ...run, combat: { ...run.combat!, potionControl: { active: true, typing: result.typing } } };
  if (result.completedCardInstanceId) {
    current = applyPotion(current, result.completedCardInstanceId, result.completedTargetEnemyInstanceId, clock, config, content);
    current = { ...current, combat: { ...current.combat!, potionControl: undefined } };
  }
  return current.combat?.clock.remainingMs === 0 && current.combat.phase === "PLAYER_INPUT" ? tickPlayerTurn(current, clock, disposition) : current;
}

export function setPotionInputActive(run: RunState, active: boolean, clock: MonotonicClock, content: ContentRegistry, disposition: TurnEndDisposition): RunState {
  const current = tickPlayerTurn(run, clock, disposition);
  if (current.combat?.phase !== "PLAYER_INPUT" || current.combat.clock.paused) return current;
  return { ...current, combat: { ...current.combat, potionControl: { active, typing: createTypingState(choices(current, content)) } } };
}

export function submitPotionKey(run: RunState, event: TypingKeyEvent, clock: MonotonicClock, config: GameConfig, content: ContentRegistry, disposition: TurnEndDisposition): RunState {
  if (run.combat?.phase !== "PLAYER_INPUT" || !run.combat.potionControl?.active) throw new Error("potion input is not active");
  const list = choices(run, content);
  const input = pressTypingKey(run.combat.potionControl.typing, run.combat.clock, list, event, clock, config, requireSetting(config.deadlineTiePolicy), run.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId));
  const current: RunState = { ...run, combat: { ...run.combat, clock: input.clock } };
  if (event.key === requireSetting(config.inputCancelKey)) return setPotionInputActive(current, false, clock, content, disposition);
  return applySelection(current, input, clock, config, content, disposition);
}

export function selectPotionSlot(run: RunState, instanceId: string, clock: MonotonicClock, config: GameConfig, content: ContentRegistry, disposition: TurnEndDisposition): RunState {
  const current = advanceSelectionTime(run, clock, config, disposition);
  if (current.combat?.phase !== "PLAYER_INPUT" || !current.combat.potionControl?.active) return current;
  const list = choices(current, content);
  const selection = chooseTypingCard(current.combat.potionControl.typing, list, instanceId, current.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId), config);
  return applySelection(current, selection, clock, config, content, disposition);
}

export function selectPotionEnemy(run: RunState, enemyInstanceId: string, clock: MonotonicClock, config: GameConfig, content: ContentRegistry, disposition: TurnEndDisposition): RunState {
  const current = advanceSelectionTime(run, clock, config, disposition);
  if (current.combat?.phase !== "PLAYER_INPUT" || !current.combat.potionControl?.active) return current;
  const list = choices(current, content);
  const selection = chooseTypingEnemyTarget(current.combat.potionControl.typing, list, enemyInstanceId, current.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId), config);
  return applySelection(current, selection, clock, config, content, disposition);
}
