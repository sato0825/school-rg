import { describe, expect, it } from "vitest";
import {
  advanceTurnClock,
  createEventQueue,
  createRandomState,
  createTurnClock,
  enqueueEvent,
  nextUint32,
  pauseTurnClock,
  randomInt,
  resumeTurnClock,
  shuffle,
  takeNextDueEvent,
} from "../../src/domain/index.js";

describe("deterministic random", () => {
  it("replays the same seed and draws, including seed zero", () => {
    for (const seed of [0, 1, 0xffffffff]) {
      let a = createRandomState(seed);
      let b = createRandomState(seed);
      const first: number[] = [];
      const second: number[] = [];
      for (let index = 0; index < 100; index++) {
        const left = nextUint32(a);
        const right = nextUint32(b);
        a = left.state;
        b = right.state;
        first.push(left.value);
        second.push(right.value);
      }
      expect(first).toEqual(second);
      expect(new Set(first).size).toBeGreaterThan(90);
    }
  });

  it("draws bounds and shuffles without changing source", () => {
    const source = ["a", "b", "c", "d", "e"];
    const result = shuffle(42, source);
    expect(source).toEqual(["a", "b", "c", "d", "e"]);
    expect(result).toEqual(shuffle(42, source));
    expect([...result.items].sort()).toEqual(source);
    expect(randomInt(42, 1).value).toBe(0);
    expect(randomInt(42, 0x1_0000_0000).value).toBeGreaterThanOrEqual(0);
    expect(() => randomInt(42, 0)).toThrow(RangeError);
    expect(() => createRandomState(-1)).toThrow(RangeError);
  });
});

describe("monotonic turn clock", () => {
  it("has the same result with sparse and frequent render ticks", () => {
    let now = 100;
    const clock = { nowMs: () => now };
    let sparse = createTurnClock(3_000, clock);
    let frequent = createTurnClock(3_000, clock);
    for (now of [250, 400, 600, 1_000, 2_000, 3_600]) {
      frequent = advanceTurnClock(frequent, clock);
    }
    sparse = advanceTurnClock(sparse, clock);
    expect(sparse).toEqual(frequent);
    expect(sparse.remainingMs).toBe(0);
  });

  it("excludes paused time and rejects a backwards clock", () => {
    let now = 0;
    const clock = { nowMs: () => now };
    let state = createTurnClock(3_000, clock);
    now = 1_000;
    state = pauseTurnClock(state, clock);
    now = 10_000;
    state = advanceTurnClock(state, clock);
    expect(state.remainingMs).toBe(2_000);
    state = resumeTurnClock(state, clock);
    now = 11_250;
    state = advanceTurnClock(state, clock);
    expect(state.remainingMs).toBe(750);
    now = 11_000;
    expect(() => advanceTurnClock(state, clock)).toThrow(RangeError);
  });
});

describe("effect event queue", () => {
  it("orders by due time then insertion and permits events created during resolution", () => {
    const empty = createEventQueue<string>();
    let queue = enqueueEvent(empty, 20, "late");
    queue = enqueueEvent(queue, 10, "first");
    queue = enqueueEvent(queue, 10, "second");
    expect(empty.pending).toEqual([]);
    expect(takeNextDueEvent(queue, 9).event).toBeNull();
    const seen: string[] = [];
    for (;;) {
      const next = takeNextDueEvent(queue, 20);
      if (!next.event) break;
      queue = next.queue;
      seen.push(next.event.payload);
      if (next.event.payload === "first") queue = enqueueEvent(queue, 10, "generated");
    }
    expect(seen).toEqual(["first", "second", "generated", "late"]);
    expect(queue.pending).toEqual([]);
    expect(JSON.parse(JSON.stringify(queue))).toEqual(queue);
  });
});
