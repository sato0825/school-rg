import * as z from "zod";
import { advanceTurnClock, type MonotonicClock } from "./clock.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { ContentRegistry, RunState, TurnClockState } from "./schema.js";

export type XTimeResult = { run: RunState; units: number; observedMs: number; spentMs: number };

function nonnegative(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a nonnegative safe integer`);
}

function liveClock(run: RunState, clock: MonotonicClock, config: GameConfig): TurnClockState {
  if (run.combat?.phase !== "PLAYER_INPUT") throw new Error("time resource requires PLAYER_INPUT");
  if (run.combat.clock.paused) throw new Error("time resource cannot be used while paused");
  const previous = run.combat.clock;
  const advanced = advanceTurnClock(previous, clock);
  const elapsed = advanced.lastEventAtMs - previous.lastEventAtMs;
  const exactTie = elapsed === previous.remainingMs && requireSetting(config.deadlineTiePolicy) === "input_wins";
  const alreadyAcceptedTie = previous.remainingMs === 0 && elapsed === 0 && requireSetting(config.deadlineTiePolicy) === "input_wins";
  if (elapsed > previous.remainingMs || (advanced.remainingMs === 0 && !exactTie && !alreadyAcceptedTie)) throw new Error("turn time expired");
  return advanced;
}

/** A time potion and a card time effect share this operation. */
export function addCurrentTurnTime(run: RunState, amountMs: number, clock: MonotonicClock, config: GameConfig): RunState {
  nonnegative(amountMs, "time bonus");
  const advanced = liveClock(run, clock, config);
  const remainingMs = Math.min(requireSetting(config.timeCapMs), advanced.remainingMs + amountMs);
  if (!Number.isSafeInteger(remainingMs)) throw new RangeError("time bonus overflow");
  return { ...run, combat: { ...run.combat!, clock: { ...advanced, remainingMs } } };
}

export function addNextTurnTime(run: RunState, amountMs: number, config: GameConfig): RunState {
  nonnegative(amountMs, "next-turn time bonus");
  if (!run.combat || run.combat.phase === "WON" || run.combat.phase === "LOST") throw new Error("active combat is required");
  const nextTurnBonusMs = Math.min(requireSetting(config.timeCapMs), run.combat.nextTurnBonusMs + amountMs);
  if (!Number.isSafeInteger(nextTurnBonusMs)) throw new RangeError("next-turn time overflow");
  return { ...run, combat: { ...run.combat, nextTurnBonusMs } };
}

/** Reads the completed card's own X policy; no global consume rule is assumed. */
export function resolveXTime(
  run: RunState,
  cardInstanceId: string,
  content: ContentRegistry,
  clock: MonotonicClock,
  config: GameConfig,
): XTimeResult {
  const advanced = liveClock(run, clock, config);
  const instance = run.combat!.cards.find((card) => card.instanceId === cardInstanceId);
  const definition = instance && content.cards.find((card) => card.id === instance.cardId);
  if (!definition?.xTimePolicy) throw new RangeError(`card has no X-time policy: ${cardInstanceId}`);
  const observedMs = advanced.remainingMs;
  const equivalent = requireSetting(config.energyEquivalentMs);
  const rounding = definition.xTimePolicy.rounding === "default" ? requireSetting(config.xRoundingPolicy) : definition.xTimePolicy.rounding;
  const ratio = observedMs / equivalent;
  const units = rounding === "floor" ? Math.floor(ratio) : rounding === "ceil" ? Math.ceil(ratio) : Math.round(ratio);
  const spentMs = definition.xTimePolicy.consume === "none" ? 0
    : definition.xTimePolicy.consume === "all" ? observedMs : Math.min(observedMs, units * equivalent);
  if (!Number.isSafeInteger(units) || !Number.isSafeInteger(spentMs)) throw new RangeError("X-time overflow");
  return {
    run: { ...run, combat: { ...run.combat!, clock: { ...advanced, remainingMs: observedMs - spentMs } } },
    units,
    observedMs,
    spentMs,
  };
}

const timePotionParameters = z.strictObject({ amountMs: z.number().int().nonnegative() });

/** Consumes one inventory copy only after its time effect succeeds. */
export function useTimeExtensionPotion(
  run: RunState,
  potionId: string,
  content: ContentRegistry,
  clock: MonotonicClock,
  config: GameConfig,
): RunState {
  if (!run.potionIds.includes(potionId)) throw new RangeError(`potion is not in inventory: ${potionId}`);
  const potion = content.potions.find((item) => item.id === potionId);
  if (!potion || potion.effectIds.length !== 1) throw new RangeError("not a single-effect time potion");
  const effect = content.effects.find((item) => item.id === potion.effectIds[0]);
  if (effect?.kind !== "add_time") throw new RangeError("potion has no add_time effect");
  const parameters = timePotionParameters.parse(effect.parameters);
  const updated = addCurrentTurnTime(run, parameters.amountMs, clock, config);
  const index = run.potionIds.indexOf(potionId);
  return { ...updated, potionIds: run.potionIds.filter((_, position) => position !== index) };
}
