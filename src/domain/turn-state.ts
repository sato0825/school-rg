import { settleHandAtTurnEnd, drawCards, type CardDisposition } from "./card-piles.js";
import { prepareOpeningHand } from "./card-keywords.js";
import { createTurnClock, pauseTurnClock, resumeTurnClock, advanceTurnClock, type MonotonicClock } from "./clock.js";
import { assessCombatOutcome } from "./combat-outcome.js";
import { requireSetting, type GameConfig } from "./config.js";
import { tickStatuses } from "./status-engine.js";
import type { ContentRegistry, RunState } from "./schema.js";
import { chooseTypingCard, chooseTypingEnemyTarget, chooseTypingHandTarget, pressTypingKey, type SelectionResult, type TypableCard, type TypingKeyEvent } from "./typing.js";

export type TurnEndDisposition = (instanceId: string, combat: NonNullable<RunState["combat"]>) => CardDisposition;
export type UseTypedCard = (run: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null) => RunState;
export type ResolveEnemyActions = (run: RunState) => RunState;

function requirePhase(run: RunState, phase: NonNullable<RunState["combat"]>["phase"]): NonNullable<RunState["combat"]> {
  if (!run.combat || run.combat.phase !== phase) throw new Error(`expected combat phase ${phase}`);
  return run.combat;
}

function typableHand(run: RunState, content: ContentRegistry): TypableCard[] {
  const combat = requirePhase(run, "PLAYER_INPUT");
  const instances = new Map(combat.cards.map((card) => [card.instanceId, card]));
  const definitions = new Map(content.cards.map((card) => [card.id, card]));
  return combat.hand.map((instanceId) => {
    const card = instances.get(instanceId);
    const definition = card && definitions.get(card.cardId);
    if (!definition) throw new Error(`missing input word for card ${instanceId}`);
    return { instanceId, word: definition.input.text, target: definition.target };
  });
}

function endExpiredTurn(run: RunState, dispositionFor: TurnEndDisposition): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  return { ...run, combat: { ...settleHandAtTurnEnd(combat, dispositionFor), phase: "PLAYER_END", potionControl: undefined } };
}

function applyCompletedInput(run: RunState, result: SelectionResult, useCard: UseTypedCard, dispositionFor: TurnEndDisposition): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  let updated: RunState = { ...run, combat: { ...combat, typing: result.typing } };
  if (result.completedCardInstanceId) {
    updated = useCard(updated, result.completedCardInstanceId, result.completedTargetEnemyInstanceId, result.completedTargetHandInstanceId);
    if (updated.combat?.hand.includes(result.completedCardInstanceId)) throw new Error("card use must move the completed card out of hand");
    if (!updated.combat || !["PLAYER_INPUT", "WON", "LOST"].includes(updated.combat.phase)) throw new Error("card use returned an invalid phase");
    updated = assessCombatOutcome(updated);
  }
  if (updated.combat?.phase === "WON" || updated.combat?.phase === "LOST") return updated;
  return updated.combat?.clock.remainingMs === 0 ? endExpiredTurn(updated, dispositionFor) : updated;
}

export function advanceSelectionTime(run: RunState, clock: MonotonicClock, config: GameConfig, dispositionFor: TurnEndDisposition): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  const eventAtMs = clock.nowMs();
  const fixedClock = { nowMs: () => eventAtMs };
  const exactDeadline = !combat.clock.paused && combat.clock.remainingMs > 0
    && eventAtMs - combat.clock.lastEventAtMs === combat.clock.remainingMs;
  if (exactDeadline && requireSetting(config.deadlineTiePolicy) === "input_wins") {
    return { ...run, combat: { ...combat, clock: advanceTurnClock(combat.clock, fixedClock) } };
  }
  return tickPlayerTurn(run, fixedClock, dispositionFor);
}

export function beginPlayerTurn(run: RunState, clock: MonotonicClock, config: GameConfig, content: ContentRegistry): RunState {
  requirePhase(run, "PLAYER_START");
  const reset = { ...run, player: { ...run.player, block: 0 } };
  const outcome = assessCombatOutcome(tickStatuses(reset, "player_start", config).run);
  if (outcome.combat!.phase !== "PLAYER_START") return outcome;
  const combat = outcome.combat!;
  const handLimit = requireSetting(config.handLimit);
  const opening = combat.turn === 1 ? prepareOpeningHand(combat, content, handLimit) : { combat, innateIds: [] };
  const count = requireSetting(config.cardsDrawnPerTurn) - (requireSetting(config.innateCountsTowardDraw) ? opening.innateIds.length : 0);
  const drawn = drawCards(opening.combat, outcome.rngState, Math.max(0, count), handLimit);
  const duration = Math.min(requireSetting(config.timeCapMs), requireSetting(config.playerTurnMs) + combat.nextTurnBonusMs);
  if (!Number.isSafeInteger(duration)) throw new RangeError("turn duration overflow");
  return {
    ...outcome,
    rngState: drawn.rngState,
    combat: { ...drawn.combat, phase: "PLAYER_INPUT", nextTurnBonusMs: 0, clock: createTurnClock(duration, clock) },
  };
}

export function tickPlayerTurn(run: RunState, clock: MonotonicClock, dispositionFor: TurnEndDisposition): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  const outcome = assessCombatOutcome(run);
  if (outcome.combat!.phase !== "PLAYER_INPUT") return outcome;
  const updated = { ...run, combat: { ...combat, clock: advanceTurnClock(combat.clock, clock) } };
  return updated.combat.clock.remainingMs === 0 ? endExpiredTurn(updated, dispositionFor) : updated;
}

export function submitPlayerKey(
  run: RunState,
  event: TypingKeyEvent,
  clock: MonotonicClock,
  config: GameConfig,
  content: ContentRegistry,
  useCard: UseTypedCard,
  dispositionFor: TurnEndDisposition,
): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  const outcome = assessCombatOutcome(run);
  if (outcome.combat!.phase !== "PLAYER_INPUT") return outcome;
  const liveEnemyIds = combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId);
  const input = pressTypingKey(combat.typing, combat.clock, typableHand(run, content), event, clock, config, requireSetting(config.deadlineTiePolicy), liveEnemyIds);
  return applyCompletedInput({ ...run, combat: { ...combat, clock: input.clock } }, input, useCard, dispositionFor);
}

export function selectTypedCard(
  run: RunState,
  instanceId: string,
  clock: MonotonicClock,
  config: GameConfig,
  content: ContentRegistry,
  useCard: UseTypedCard,
  dispositionFor: TurnEndDisposition,
): RunState {
  const current = advanceSelectionTime(run, clock, config, dispositionFor);
  if (current.combat?.phase !== "PLAYER_INPUT") return current;
  const liveEnemyIds = current.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId);
  const selection = chooseTypingCard(current.combat.typing, typableHand(current, content), instanceId, liveEnemyIds, config);
  return applyCompletedInput(current, selection, useCard, dispositionFor);
}

export function selectTypedEnemyTarget(
  run: RunState,
  enemyInstanceId: string,
  clock: MonotonicClock,
  config: GameConfig,
  content: ContentRegistry,
  useCard: UseTypedCard,
  dispositionFor: TurnEndDisposition,
): RunState {
  const current = advanceSelectionTime(run, clock, config, dispositionFor);
  if (current.combat?.phase !== "PLAYER_INPUT") return current;
  const liveEnemyIds = current.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId);
  const selection = chooseTypingEnemyTarget(current.combat.typing, typableHand(current, content), enemyInstanceId, liveEnemyIds, config);
  return applyCompletedInput(current, selection, useCard, dispositionFor);
}

export function selectTypedHandTarget(
  run: RunState,
  targetHandInstanceId: string,
  clock: MonotonicClock,
  config: GameConfig,
  content: ContentRegistry,
  useCard: UseTypedCard,
  dispositionFor: TurnEndDisposition,
): RunState {
  const current = advanceSelectionTime(run, clock, config, dispositionFor);
  if (current.combat?.phase !== "PLAYER_INPUT") return current;
  const selection = chooseTypingHandTarget(current.combat.typing, typableHand(current, content), targetHandInstanceId, config);
  return applyCompletedInput(current, selection, useCard, dispositionFor);
}

export function pausePlayerTurn(run: RunState, clock: MonotonicClock, dispositionFor: TurnEndDisposition): RunState {
  const eventAtMs = clock.nowMs();
  const fixedClock = { nowMs: () => eventAtMs };
  const updated = tickPlayerTurn(run, fixedClock, dispositionFor);
  if (updated.combat?.phase !== "PLAYER_INPUT") return updated;
  return { ...updated, combat: { ...updated.combat, clock: pauseTurnClock(updated.combat.clock, fixedClock) } };
}

export function resumePlayerTurn(run: RunState, clock: MonotonicClock): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  if (!combat.clock.paused) throw new Error("turn clock is not paused");
  return { ...run, combat: { ...combat, clock: resumeTurnClock(combat.clock, clock) } };
}

export function beginEnemyPhase(run: RunState, config: GameConfig): RunState {
  requirePhase(run, "PLAYER_END");
  const outcome = assessCombatOutcome(tickStatuses(run, "player_end", config).run);
  if (outcome.combat!.phase !== "PLAYER_END") return outcome;
  const enemyPhase = { ...outcome, combat: {
    ...outcome.combat!, phase: "ENEMY_PHASE" as const,
    enemies: outcome.combat!.enemies.map((enemy) => ({ ...enemy, block: 0 })),
  } };
  return tickStatuses(enemyPhase, "enemy_start", config).run;
}

/** Enemy AI #13 supplies one deterministic resolution of every visible Intent. */
export function completeEnemyPhase(run: RunState, resolve: ResolveEnemyActions, config: GameConfig): RunState {
  const combat = requirePhase(run, "ENEMY_PHASE");
  const resolved = resolve(run);
  if (!resolved.combat || resolved.combat.turn !== combat.turn || !["ENEMY_PHASE", "WON", "LOST"].includes(resolved.combat.phase)) {
    throw new Error("enemy resolver returned an invalid phase");
  }
  const outcome = assessCombatOutcome(resolved);
  if (outcome.combat!.phase === "WON" || outcome.combat!.phase === "LOST") return outcome;
  const ended = tickStatuses(outcome, "enemy_end", config).run;
  if (ended.combat!.phase === "WON" || ended.combat!.phase === "LOST") return ended;
  return { ...ended, combat: { ...ended.combat!, phase: "PLAYER_START", turn: ended.combat!.turn + 1 } };
}
