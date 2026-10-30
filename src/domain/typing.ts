import { advanceTurnClock, type MonotonicClock } from "./clock.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { TurnClockState, TypingState } from "./schema.js";

export interface TypableCard {
  instanceId: string;
  word: string;
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
  };
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

  const exact = cards.filter((card) => normalizedWord(card.word, config) === typing.buffer);
  if (event.key === requireSetting(config.prefixConfirmKey)) {
    if (exact.length !== 1) return { ...updated, typing };
    return { ...updated, typing: createTypingState(cards), completedCardInstanceId: exact[0]!.instanceId };
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
    selectedCardInstanceId: null,
    progress: nextBuffer.length,
  };
  const complete = candidates.filter((card) => normalizedWord(card.word, config) === nextBuffer);
  if (complete.length === 1 && candidates.length === 1) {
    return { ...updated, typing: createTypingState(cards), completedCardInstanceId: complete[0]!.instanceId };
  }
  return { ...updated, typing };
}
