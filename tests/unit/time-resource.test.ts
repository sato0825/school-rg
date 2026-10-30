import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { addCurrentTurnTime, addNextTurnTime, resolveXTime, useTimeExtensionPotion } from "../../src/domain/time-resource.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

function at(remainingMs: number) {
  const run = structuredClone(validRun);
  run.combat!.clock = { remainingMs, lastEventAtMs: 0, paused: false };
  return run;
}

describe("time resource", () => {
  it("adds time from current remaining time and clamps to the provisional cap", () => {
    const source = at(10_000);
    const first = addCurrentTurnTime(source, 2_000, { nowMs: () => 3_000 }, DEFAULT_GAME_CONFIG);
    expect(first.combat!.clock.remainingMs).toBe(9_000);
    const capped = addCurrentTurnTime(first, 99_000, { nowMs: () => 3_000 }, DEFAULT_GAME_CONFIG);
    expect(capped.combat!.clock.remainingMs).toBe(30_000);
    expect(source.combat!.clock.remainingMs).toBe(10_000);
  });

  it("stores a next-turn bonus, applies the cap, then consumes the bonus once", () => {
    let run = at(1_000);
    run = addNextTurnTime(run, 40_000, DEFAULT_GAME_CONFIG);
    expect(run.combat!.nextTurnBonusMs).toBe(30_000);
    run.combat!.phase = "PLAYER_START";
    run.combat!.hand = [];
    run.combat!.drawPile = ["combat-1"];
    run.combat!.typing = { buffer: "", candidateCardInstanceIds: [], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null };
    const started = beginPlayerTurn(run, { nowMs: () => 10 }, DEFAULT_GAME_CONFIG, validContent);
    expect(started.combat!.clock.remainingMs).toBe(30_000);
    expect(started.combat!.nextTurnBonusMs).toBe(0);
  });

  it("respects timeout-first and input-first rules at the exact deadline", () => {
    const run = at(10_000);
    expect(() => addCurrentTurnTime(run, 2_000, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG)).toThrow("expired");
    const inputWins = parseGameConfig({ ...DEFAULT_GAME_CONFIG, deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" } });
    expect(addCurrentTurnTime(run, 2_000, { nowMs: () => 10_000 }, inputWins).combat!.clock.remainingMs).toBe(2_000);
    expect(() => addCurrentTurnTime(run, 2_000, { nowMs: () => 10_001 }, inputWins)).toThrow("expired");
  });

  it("reads per-card rounding and consumption at X boundaries, including zero", () => {
    const content = structuredClone(validContent);
    content.cards[0]!.xTimePolicy = { rounding: "floor", consume: "units" };
    const run = at(3_999);
    expect(resolveXTime(run, "combat-1", content, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG)).toMatchObject({ units: 1, observedMs: 3_999, spentMs: 2_000 });
    content.cards[0]!.xTimePolicy = { rounding: "ceil", consume: "units" };
    expect(resolveXTime(run, "combat-1", content, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG)).toMatchObject({ units: 2, spentMs: 3_999 });
    content.cards[0]!.xTimePolicy = { rounding: "nearest", consume: "none" };
    expect(resolveXTime(run, "combat-1", content, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG)).toMatchObject({ units: 2, spentMs: 0 });
    content.cards[0]!.xTimePolicy = { rounding: "default", consume: "all" };
    expect(resolveXTime(run, "combat-1", content, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG)).toMatchObject({ units: 1, spentMs: 3_999 });
    const inputWins = parseGameConfig({ ...DEFAULT_GAME_CONFIG, deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" } });
    expect(resolveXTime(at(0), "combat-1", content, { nowMs: () => 0 }, inputWins)).toMatchObject({ units: 0, spentMs: 0 });
  });

  it("consumes one time-extension potion only after applying its effect", () => {
    const content = structuredClone(validContent);
    content.effects.push({ id: "add-time", kind: "add_time", parameters: { amountMs: 2_000 } });
    content.potions[0]!.effectIds = ["add-time"];
    const run = at(5_000);
    run.potionIds = ["potion-sample", "potion-sample"];
    const used = useTimeExtensionPotion(run, "potion-sample", content, { nowMs: () => 1_000 }, DEFAULT_GAME_CONFIG);
    expect(used.combat!.clock.remainingMs).toBe(6_000);
    expect(used.potionIds).toEqual(["potion-sample"]);
    expect(run.potionIds).toHaveLength(2);
    expect(() => useTimeExtensionPotion(run, "missing", content, { nowMs: () => 1_000 }, DEFAULT_GAME_CONFIG)).toThrow();
  });

  it("restores an older combat state with no next-turn bonus", () => {
    const legacy = structuredClone(validRun) as unknown as { combat: Record<string, unknown> };
    delete legacy.combat.nextTurnBonusMs;
    expect(parseRunState(legacy, validContent).combat!.nextTurnBonusMs).toBe(0);
  });
});
