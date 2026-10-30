/** A serializable, deterministic 32-bit PRNG state. */
export type RandomState = number;

const UINT32_RANGE = 0x1_0000_0000;

export function createRandomState(seed: number): RandomState {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE) {
    throw new RangeError("seed must be an unsigned 32-bit integer");
  }
  return seed;
}

/** Mulberry32 supports every 32-bit seed, including zero. */
export function nextUint32(state: RandomState): { state: RandomState; value: number } {
  createRandomState(state);
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { state: nextState, value: (value ^ (value >>> 14)) >>> 0 };
}

/** Rejection sampling avoids modulo bias while preserving replay order. */
export function randomInt(
  state: RandomState,
  maxExclusive: number,
): { state: RandomState; value: number } {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError("maxExclusive must be in [1, 2^32]");
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  let current = state;
  for (;;) {
    const draw = nextUint32(current);
    current = draw.state;
    if (draw.value < limit) {
      return { state: current, value: draw.value % maxExclusive };
    }
  }
}

/** Returns a new array; the input remains unchanged for replay and undo. */
export function shuffle<T>(state: RandomState, items: readonly T[]): {
  state: RandomState;
  items: T[];
} {
  const result = [...items];
  let current = createRandomState(state);
  for (let index = result.length - 1; index > 0; index--) {
    const draw = randomInt(current, index + 1);
    current = draw.state;
    [result[index], result[draw.value]] = [result[draw.value]!, result[index]!];
  }
  return { state: current, items: result };
}
