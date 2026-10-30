import { settleHandAtTurnEnd, drawCards, type CardDisposition } from "./card-piles.js";
import { createTurnClock, pauseTurnClock, resumeTurnClock, advanceTurnClock, type MonotonicClock } from "./clock.js";
import { assessCombatOutcome } from "./combat-outcome.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { ContentRegistry, RunState } from "./schema.js";
import { pressTypingKey, type TypableCard, type TypingKeyEvent } from "./typing.js";

export type TurnEndDisposition = (instanceId: string) => CardDisposition;
export type UseTypedCard = (run: RunState, instanceId: string) => RunState;
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
    const word = card && definitions.get(card.cardId)?.input.text;
    if (!word) throw new Error(`missing input word for card ${instanceId}`);
    return { instanceId, word };
  });
}

function endExpiredTurn(run: RunState, dispositionFor: TurnEndDisposition): RunState {
  const combat = requirePhase(run, "PLAYER_INPUT");
  return { ...run, combat: { ...settleHandAtTurnEnd(combat, dispositionFor), phase: "PLAYER_END" } };
}

export function beginPlayerTurn(run: RunState, clock: MonotonicClock, config: GameConfig): RunState {
  const combat = requirePhase(run, "PLAYER_START");
  const outcome = assessCombatOutcome(run);
  if (outcome.combat!.phase !== "PLAYER_START") return outcome;
  const drawn = drawCards(combat, run.rngState, requireSetting(config.cardsDrawnPerTurn));
  return {
    ...run,
    rngState: drawn.rngState,
    combat: { ...drawn.combat, phase: "PLAYER_INPUT", clock: createTurnClock(requireSetting(config.playerTurnMs), clock) },
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
  const input = pressTypingKey(combat.typing, combat.clock, typableHand(run, content), event, clock, config, requireSetting(config.deadlineTiePolicy));
  let updated: RunState = { ...run, combat: { ...combat, typing: input.typing, clock: input.clock } };
  if (input.completedCardInstanceId) {
    updated = useCard(updated, input.completedCardInstanceId);
    if (updated.combat?.hand.includes(input.completedCardInstanceId)) throw new Error("card use must move the completed card out of hand");
    if (!updated.combat || !["PLAYER_INPUT", "WON", "LOST"].includes(updated.combat.phase)) throw new Error("card use returned an invalid phase");
    updated = assessCombatOutcome(updated);
  }
  if (updated.combat?.phase === "WON" || updated.combat?.phase === "LOST") return updated;
  return updated.combat?.clock.remainingMs === 0 ? endExpiredTurn(updated, dispositionFor) : updated;
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

export function beginEnemyPhase(run: RunState): RunState {
  const combat = requirePhase(run, "PLAYER_END");
  const outcome = assessCombatOutcome(run);
  if (outcome.combat!.phase !== "PLAYER_END") return outcome;
  return { ...run, combat: { ...combat, phase: "ENEMY_PHASE" } };
}

/** Enemy AI #13 supplies one deterministic resolution of every visible Intent. */
export function completeEnemyPhase(run: RunState, resolve: ResolveEnemyActions): RunState {
  const combat = requirePhase(run, "ENEMY_PHASE");
  const resolved = resolve(run);
  if (!resolved.combat || resolved.combat.turn !== combat.turn || !["ENEMY_PHASE", "WON", "LOST"].includes(resolved.combat.phase)) {
    throw new Error("enemy resolver returned an invalid phase");
  }
  const outcome = assessCombatOutcome(resolved);
  if (outcome.combat!.phase === "WON" || outcome.combat!.phase === "LOST") return outcome;
  return { ...outcome, combat: { ...outcome.combat!, phase: "PLAYER_START", turn: outcome.combat!.turn + 1 } };
}
