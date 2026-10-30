import { createRandomState } from "../domain/random.js";

/** A fixed seed is available only on the development server for reproducible QA. */
export function newRunSeed(search: string, drawUint32: () => number, development: boolean): number {
  const raw = development ? new URLSearchParams(search).get("seed") : null;
  if (raw !== null && /^(0|[1-9][0-9]*)$/.test(raw)) {
    const value = Number(raw);
    if (Number.isSafeInteger(value) && value <= 0xffffffff) return createRandomState(value);
  }
  return createRandomState(drawUint32());
}

export function browserRandomUint32(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0]!;
}
