import { advanceTurnClock, type MonotonicClock } from "./clock.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { TurnClockState, TypingState } from "./schema.js";

export interface TypableCard {
  instanceId: string;
  word: string;
  target?: "self" | "enemy" | "all_enemies" | "hand" | "none";
}

export interface TypingKeyEvent {
  key: string;
  repeat?: boolean;
  isComposing?: boolean;
}

export interface TypingResult {
  typing: TypingState;
  clock: TurnClockState;
  completedCardInstanceId: string | null;
  completedTargetEnemyInstanceId: string | null;
  completedTargetHandInstanceId: string | null;
}

export interface SelectionResult {
  typing: TypingState;
  completedCardInstanceId: string | null;
  completedTargetEnemyInstanceId: string | null;
  completedTargetHandInstanceId: string | null;
}

function normalizeText(word: string, config: GameConfig): string {
  let value = requireSetting(config.caseSensitiveInput) ? word : word.toLowerCase();
  const whitespace = requireSetting(config.whitespacePolicy);
  if (whitespace === "ignore") value = value.replace(/\s/gu, "");
  if (whitespace === "collapse") value = value.replace(/\s+/gu, " ");
  if (requireSetting(config.punctuationPolicy) === "ignore") value = value.replace(/\p{P}/gu, "");
  return value;
}

function normalizedWord(word: string, config: GameConfig): string {
  const value = normalizeText(word, config);
  if (value.length === 0) throw new RangeError("typing word normalizes to empty");
  return value;
}

function normalizedKey(key: string, config: GameConfig): string {
  if (key.length !== 1) return "";
  const value = normalizeText(key, config);
  return value.length === 1 ? value : "";
}

export function createTypingState(cards: readonly TypableCard[]): TypingState {
  return {
    buffer: "",
    candidateCardInstanceIds: cards.map((card) => card.instanceId),
    selectedCardInstanceId: null,
    progress: 0,
    targetEnemyInstanceId: null,
    targetHandInstanceId: null,
  };
}

/** Exact duplicate choices that cannot be a prefix of a longer card word. */
export function exactDuplicateChoices(
  state: TypingState,
  cards: readonly TypableCard[],
  config: GameConfig,
): string[] {
  if (!state.buffer) return [];
  const candidates = cards.filter((card) => normalizedWord(card.word, config).startsWith(state.buffer));
  if (candidates.some((card) => normalizedWord(card.word, config) !== state.buffer)) return [];
  const exact = candidates.filter((card) => normalizedWord(card.word, config) === state.buffer);
  return exact.length > 1 ? exact.map((card) => card.instanceId) : [];
}

/** Recompute from the current hand; removed cards cannot remain candidates. */
export function syncTypingHand(
  state: TypingState,
  cards: readonly TypableCard[],
  config: GameConfig,
): TypingState {
  const candidateIds = cards
    .filter((card) => normalizedWord(card.word, config).startsWith(state.buffer))
    .map((card) => card.instanceId);
  if (state.buffer && candidateIds.length === 0) return createTypingState(cards);
  return {
    ...state,
    candidateCardInstanceIds: candidateIds,
    selectedCardInstanceId: candidateIds.includes(state.selectedCardInstanceId ?? "")
      ? state.selectedCardInstanceId
      : null,
    progress: state.buffer.length,
  };
}

function activateExact(
  typing: TypingState,
  cards: readonly TypableCard[],
  liveEnemyInstanceIds: readonly string[],
  config: GameConfig,
  explicitConfirmation: boolean,
): SelectionResult {
  const pending: SelectionResult = { typing, completedCardInstanceId: null, completedTargetEnemyInstanceId: null, completedTargetHandInstanceId: null };
  const candidates = cards.filter((card) => normalizedWord(card.word, config).startsWith(typing.buffer));
  const exact = candidates.filter((card) => normalizedWord(card.word, config) === typing.buffer);
  if (!typing.buffer || exact.length === 0) return pending;
  if (!explicitConfirmation && candidates.length !== exact.length) return pending;
  const selected = exact.find((card) => card.instanceId === typing.selectedCardInstanceId)
    ?? (exact.length === 1 || requireSetting(config.sameNameCardPolicy) === "first_in_hand" ? exact[0] : undefined);
  if (!selected) return pending;
  let targetHandInstanceId: string | null = null;
  if (selected.target === "hand") {
    targetHandInstanceId = cards.some((card) => card.instanceId === typing.targetHandInstanceId && card.instanceId !== selected.instanceId)
      ? typing.targetHandInstanceId : null;
    if (!targetHandInstanceId) {
      return { ...pending, typing: { ...typing, selectedCardInstanceId: selected.instanceId, targetHandInstanceId: null } };
    }
  }
  let targetEnemyInstanceId: string | null = null;
  if (selected.target === "enemy") {
    targetEnemyInstanceId = liveEnemyInstanceIds.includes(typing.targetEnemyInstanceId ?? "")
      ? typing.targetEnemyInstanceId
      : liveEnemyInstanceIds.length === 1 ? liveEnemyInstanceIds[0]! : null;
    if (!targetEnemyInstanceId) {
      return { ...pending, typing: { ...typing, selectedCardInstanceId: selected.instanceId, targetEnemyInstanceId: null } };
    }
  }
  return {
    typing: createTypingState(cards),
    completedCardInstanceId: selected.instanceId,
    completedTargetEnemyInstanceId: targetEnemyInstanceId,
    completedTargetHandInstanceId: targetHandInstanceId,
  };
}

export function chooseTypingHandTarget(
  typing: TypingState,
  cards: readonly TypableCard[],
  instanceId: string,
  config: GameConfig,
): SelectionResult {
  if (!cards.some((card) => card.instanceId === instanceId)) throw new RangeError(`hand target is not in hand: ${instanceId}`);
  const withTarget = { ...typing, targetHandInstanceId: instanceId };
  return activateExact(withTarget, cards, [], config, Boolean(withTarget.selectedCardInstanceId));
}

/** Explicitly choose one complete same-name instance without guessing. */
export function chooseTypingCard(
  typing: TypingState,
  cards: readonly TypableCard[],
  instanceId: string,
  liveEnemyInstanceIds: readonly string[],
  config: GameConfig,
): SelectionResult {
  const card = cards.find((item) => item.instanceId === instanceId);
  if (!card || normalizedWord(card.word, config) !== typing.buffer || !typing.candidateCardInstanceIds.includes(instanceId)) {
    throw new RangeError(`card is not an exact typing candidate: ${instanceId}`);
  }
  return activateExact({ ...typing, selectedCardInstanceId: instanceId }, cards, liveEnemyInstanceIds, config, true);
}

/** A target is valid only while that enemy remains alive in the current combat. */
export function chooseTypingEnemyTarget(
  typing: TypingState,
  cards: readonly TypableCard[],
  instanceId: string,
  liveEnemyInstanceIds: readonly string[],
  config: GameConfig,
): SelectionResult {
  if (!liveEnemyInstanceIds.includes(instanceId)) throw new RangeError(`enemy target is not alive: ${instanceId}`);
  const withTarget = { ...typing, targetEnemyInstanceId: instanceId };
  return activateExact(withTarget, cards, liveEnemyInstanceIds, config, Boolean(withTarget.selectedCardInstanceId));
}

export function advanceTypingTime(
  state: TypingState,
  turnClock: TurnClockState,
  cards: readonly TypableCard[],
  clock: MonotonicClock,
): TypingResult {
  const updatedClock = advanceTurnClock(turnClock, clock);
  return {
    typing: updatedClock.remainingMs === 0 ? createTypingState(cards) : state,
    clock: updatedClock,
    completedCardInstanceId: null,
    completedTargetEnemyInstanceId: null,
    completedTargetHandInstanceId: null,
  };
}

/** Focus loss discards only the partial word; turn pause policy belongs to #4. */
export function cancelTyping(
  state: TypingState,
  turnClock: TurnClockState,
  cards: readonly TypableCard[],
  clock: MonotonicClock,
): TypingResult {
  const updated = advanceTypingTime(state, turnClock, cards, clock);
  return { ...updated, typing: createTypingState(cards) };
}

/** Keyboard input advances the injected game clock before evaluating a letter. */
export function pressTypingKey(
  state: TypingState,
  turnClock: TurnClockState,
  cards: readonly TypableCard[],
  event: TypingKeyEvent,
  clock: MonotonicClock,
  config: GameConfig,
  deadlineTiePolicy: "timeout_wins" | "input_wins" = "timeout_wins",
  liveEnemyInstanceIds: readonly string[] = [],
): TypingResult {
  const eventAtMs = clock.nowMs();
  const exactDeadline = !turnClock.paused && turnClock.remainingMs > 0 && eventAtMs - turnClock.lastEventAtMs === turnClock.remainingMs;
  const updated = advanceTypingTime(state, turnClock, cards, { nowMs: () => eventAtMs });
  const inputWinsTie = exactDeadline && deadlineTiePolicy === "input_wins";
  if ((updated.clock.remainingMs === 0 && !inputWinsTie) || updated.clock.paused) return updated;
  let typing = syncTypingHand(inputWinsTie ? state : updated.typing, cards, config);
  if (event.isComposing || event.repeat) return { ...updated, typing };
  if (event.key === requireSetting(config.inputCancelKey)) {
    return { ...updated, typing: createTypingState(cards) };
  }

  if (event.key === requireSetting(config.prefixConfirmKey)) {
    return { ...updated, ...activateExact(typing, cards, liveEnemyInstanceIds, config, true) };
  }

  const key = normalizedKey(event.key, config);
  if (!key) return { ...updated, typing };
  const nextBuffer = typing.buffer + key;
  const candidates = cards.filter((card) => normalizedWord(card.word, config).startsWith(nextBuffer));
  if (candidates.length === 0) return { ...updated, typing };
  typing = {
    ...typing,
    buffer: nextBuffer,
    candidateCardInstanceIds: candidates.map((card) => card.instanceId),
    selectedCardInstanceId: candidates.some((card) => card.instanceId === typing.selectedCardInstanceId) ? typing.selectedCardInstanceId : null,
    progress: nextBuffer.length,
  };
  return { ...updated, ...activateExact(typing, cards, liveEnemyInstanceIds, config, false) };
}
