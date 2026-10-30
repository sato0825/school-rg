import { describe, expect, it } from "vitest";
import { createTurnClock, pauseTurnClock } from "../../src/domain/clock.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import {
  advanceTypingTime,
  cancelTyping,
  createTypingState,
  pressTypingKey,
  syncTypingHand,
  type TypableCard,
} from "../../src/domain/typing.js";

describe("typing card names", () => {
  it("ignores wrong letters while time advances and completes a unique card", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "strike-1", word: "Strike" }];
    let typing = createTypingState(cards);
    let clock = createTurnClock(10_000, source);
    let completed: string | null = null;
    for (const [time, key] of [[100, "s"], [200, "x"], [300, "t"], [400, "r"], [500, "i"], [600, "k"], [700, "e"]] as const) {
      now = time;
      const result = pressTypingKey(typing, clock, cards, { key }, source, DEFAULT_GAME_CONFIG);
      typing = result.typing;
      clock = result.clock;
      completed = result.completedCardInstanceId;
      if (key === "x") expect(typing.buffer).toBe("s");
    }
    expect(completed).toBe("strike-1");
    expect(typing.buffer).toBe("");
    expect(clock.remainingMs).toBe(9_300);
  });

  it("holds a shared prefix and duplicate exact words instead of firing accidentally", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards: TypableCard[] = [
      { instanceId: "fire-1", word: "fire" },
      { instanceId: "fireball-1", word: "fireball" },
      { instanceId: "fire-2", word: "fire" },
    ];
    let typing = createTypingState(cards);
    let clock = createTurnClock(10_000, source);
    for (const key of "fire") {
      now += 50;
      const result = pressTypingKey(typing, clock, cards, { key }, source, DEFAULT_GAME_CONFIG);
      typing = result.typing;
      clock = result.clock;
      expect(result.completedCardInstanceId).toBeNull();
    }
    expect(typing.candidateCardInstanceIds).toEqual(["fire-1", "fireball-1", "fire-2"]);
    expect(pressTypingKey(typing, clock, cards, { key: "Enter" }, source, DEFAULT_GAME_CONFIG).completedCardInstanceId).toBeNull();

    const onlyOneShort = cards.slice(0, 2);
    typing = syncTypingHand(typing, onlyOneShort, DEFAULT_GAME_CONFIG);
    const confirmed = pressTypingKey(typing, clock, onlyOneShort, { key: "Enter" }, source, DEFAULT_GAME_CONFIG);
    expect(confirmed.completedCardInstanceId).toBe("fire-1");

    const longer = pressTypingKey(typing, clock, onlyOneShort, { key: "b" }, source, DEFAULT_GAME_CONFIG);
    expect(longer.typing.buffer).toBe("fireb");
  });

  it("can switch the provisional same-name policy without changing input code", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "first", word: "fire" }, { instanceId: "second", word: "fire" }];
    const config = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      sameNameCardPolicy: { ...DEFAULT_GAME_CONFIG.sameNameCardPolicy, value: "first_in_hand" },
    });
    let typing = createTypingState(cards);
    let clock = createTurnClock(10_000, source);
    let completed: string | null = null;
    for (const key of "fire") {
      now += 10;
      const result = pressTypingKey(typing, clock, cards, { key }, source, config);
      typing = result.typing;
      clock = result.clock;
      completed = result.completedCardInstanceId;
    }
    expect(completed).toBe("first");
  });

  it("ignores repeat and composition, cancels on Escape and focus loss", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "a", word: "cat" }];
    const initialClock = createTurnClock(10_000, source);
    now = 100;
    const first = pressTypingKey(createTypingState(cards), initialClock, cards, { key: "c" }, source, DEFAULT_GAME_CONFIG);
    now = 200;
    const repeated = pressTypingKey(first.typing, first.clock, cards, { key: "a", repeat: true }, source, DEFAULT_GAME_CONFIG);
    expect(repeated.typing.buffer).toBe("c");
    now = 300;
    const composing = pressTypingKey(repeated.typing, repeated.clock, cards, { key: "a", isComposing: true }, source, DEFAULT_GAME_CONFIG);
    expect(composing.typing.buffer).toBe("c");
    now = 400;
    const escaped = pressTypingKey(composing.typing, composing.clock, cards, { key: "Escape" }, source, DEFAULT_GAME_CONFIG);
    expect(escaped.typing.buffer).toBe("");
    expect(escaped.clock.remainingMs).toBe(9_600);
    now = 500;
    const partial = pressTypingKey(escaped.typing, escaped.clock, cards, { key: "c" }, source, DEFAULT_GAME_CONFIG);
    now = 600;
    expect(cancelTyping(partial.typing, partial.clock, cards, source).typing.buffer).toBe("");
  });

  it("cancels stale input when the hand changes or time expires", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "a", word: "cat" }];
    const start = createTurnClock(500, source);
    now = 100;
    const partial = pressTypingKey(createTypingState(cards), start, cards, { key: "c" }, source, DEFAULT_GAME_CONFIG);
    expect(syncTypingHand(partial.typing, [{ instanceId: "b", word: "dog" }], DEFAULT_GAME_CONFIG).buffer).toBe("");
    now = 500;
    const expired = pressTypingKey(partial.typing, partial.clock, cards, { key: "a" }, source, DEFAULT_GAME_CONFIG);
    expect(expired.typing.buffer).toBe("");
    expect(expired.completedCardInstanceId).toBeNull();
    expect(expired.clock.remainingMs).toBe(0);
    expect(advanceTypingTime(partial.typing, partial.clock, cards, source).typing.buffer).toBe("");
  });

  it("does not accept input while paused", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "a", word: "a" }];
    const paused = pauseTurnClock(createTurnClock(1_000, source), source);
    now = 10_000;
    const result = pressTypingKey(createTypingState(cards), paused, cards, { key: "a" }, source, DEFAULT_GAME_CONFIG);
    expect(result.completedCardInstanceId).toBeNull();
    expect(result.clock.remainingMs).toBe(1_000);
  });

  it("changes whitespace, punctuation and case behavior through provisional config", () => {
    let now = 0;
    const source = { nowMs: () => now };
    const cards = [{ instanceId: "a", word: "Ice-Cream" }];
    const config = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      punctuationPolicy: { ...DEFAULT_GAME_CONFIG.punctuationPolicy, value: "ignore" },
    });
    let typing = createTypingState(cards);
    let clock = createTurnClock(10_000, source);
    let completed: string | null = null;
    for (const key of "icecream") {
      now += 10;
      const result = pressTypingKey(typing, clock, cards, { key }, source, config);
      typing = result.typing;
      clock = result.clock;
      completed = result.completedCardInstanceId;
    }
    expect(completed).toBe("a");
    const sensitive = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      caseSensitiveInput: { ...DEFAULT_GAME_CONFIG.caseSensitiveInput, value: true },
    });
    expect(pressTypingKey(createTypingState(cards), clock, cards, { key: "i" }, source, sensitive).typing.buffer).toBe("");
  });
});
