import type { TurnClockState } from "./schema.js";

/** The adapter may read performance.now(); game rules only receive this interface. */
export interface MonotonicClock {
  nowMs(): number;
}

function readNow(clock: MonotonicClock): number {
  const now = clock.nowMs();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new RangeError("clock must return a nonnegative integer millisecond timestamp");
  }
  return now;
}

export function createTurnClock(remainingMs: number, clock: MonotonicClock): TurnClockState {
  if (!Number.isSafeInteger(remainingMs) || remainingMs < 0) {
    throw new RangeError("remainingMs must be a nonnegative integer");
  }
  return { remainingMs, lastEventAtMs: readNow(clock), paused: false };
}

/** Repeated render ticks and sparse render ticks yield the same remaining time. */
export function advanceTurnClock(state: TurnClockState, clock: MonotonicClock): TurnClockState {
  const now = readNow(clock);
  if (now < state.lastEventAtMs) {
    throw new RangeError("clock moved backwards");
  }
  return {
    ...state,
    remainingMs: state.paused ? state.remainingMs : Math.max(0, state.remainingMs - (now - state.lastEventAtMs)),
    lastEventAtMs: now,
  };
}

export function pauseTurnClock(state: TurnClockState, clock: MonotonicClock): TurnClockState {
  return { ...advanceTurnClock(state, clock), paused: true };
}

export function resumeTurnClock(state: TurnClockState, clock: MonotonicClock): TurnClockState {
  return { ...advanceTurnClock(state, clock), paused: false };
}
