import { describe, expect, it } from "vitest";
import { moveCardFromHand } from "../../src/domain/card-piles.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import type { RunState } from "../../src/domain/schema.js";
import { selectTypedCard, selectTypedEnemyTarget, submitPlayerKey } from "../../src/domain/turn-state.js";
import { validContent, validRun } from "../fixtures/domain.js";

const discard = () => "discard" as const;

function twoEnemiesAndTwoCards(): RunState {
  const run = structuredClone(validRun);
  run.combat!.cards.push({ instanceId: "combat-2", cardId: "card-strike", upgraded: false });
  run.combat!.hand.push("combat-2");
  run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: ["combat-1", "combat-2"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null };
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  return run;
}

describe("ambiguous typing selection", () => {
  it("requires an explicit same-name instance and living enemy target", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = twoEnemiesAndTwoCards();
    let used: { card: string; target: string | null } | null = null;
    const useCard = (state: RunState, card: string, target: string | null): RunState => {
      used = { card, target };
      return { ...state, combat: moveCardFromHand(state.combat!, card, "discard") };
    };
    for (const key of "strike") {
      now += 100;
      run = submitPlayerKey(run, { key }, source, DEFAULT_GAME_CONFIG, validContent, useCard, discard);
    }
    expect(used).toBeNull();
    expect(run.combat!.typing.candidateCardInstanceIds).toEqual(["combat-1", "combat-2"]);
    expect(run.combat!.typing.buffer).toBe("strike");
    now = 700;
    run = selectTypedEnemyTarget(run, "enemy-2", source, DEFAULT_GAME_CONFIG, validContent, useCard, discard);
    expect(used).toBeNull();
    expect(run.combat!.typing.targetEnemyInstanceId).toBe("enemy-2");
    now = 800;
    run = selectTypedCard(run, "combat-2", source, DEFAULT_GAME_CONFIG, validContent, useCard, discard);
    expect(used).toEqual({ card: "combat-2", target: "enemy-2" });
    expect(run.combat!.hand).toEqual(["combat-1"]);
    expect(run.combat!.clock.remainingMs).toBe(9_200);
  });

  it("waits for a target with a unique word and rejects a dead target", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = twoEnemiesAndTwoCards();
    run.combat!.hand = ["combat-1"];
    run.combat!.discardPile = ["combat-2"];
    run.combat!.typing.candidateCardInstanceIds = ["combat-1"];
    let used = false;
    const useCard = (state: RunState, card: string): RunState => {
      used = true;
      return { ...state, combat: moveCardFromHand(state.combat!, card, "discard") };
    };
    for (const key of "strike") {
      now += 100;
      run = submitPlayerKey(run, { key }, source, DEFAULT_GAME_CONFIG, validContent, useCard, discard);
    }
    expect(used).toBe(false);
    expect(run.combat!.typing.selectedCardInstanceId).toBe("combat-1");
    run.combat!.enemies[1]!.hp = 0;
    now = 700;
    expect(() => selectTypedEnemyTarget(run, "enemy-2", source, DEFAULT_GAME_CONFIG, validContent, useCard, discard)).toThrow("not alive");
    run = selectTypedEnemyTarget(run, "enemy-1", source, DEFAULT_GAME_CONFIG, validContent, useCard, discard);
    expect(used).toBe(true);
    expect(run.combat!.hand).toEqual([]);
  });

  it("lets the deadline cancel pending selection before a target click", () => {
    let run = twoEnemiesAndTwoCards();
    run.combat!.hand = ["combat-1"];
    run.combat!.discardPile = ["combat-2"];
    run.combat!.typing = { buffer: "strike", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: "combat-1", progress: 6, targetEnemyInstanceId: null };
    let used = false;
    run = selectTypedEnemyTarget(run, "enemy-1", { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, validContent, (state, card) => {
      used = true;
      return { ...state, combat: moveCardFromHand(state.combat!, card, "discard") };
    }, discard);
    expect(used).toBe(false);
    expect(run.combat!.phase).toBe("PLAYER_END");
    expect(run.combat!.typing.buffer).toBe("");
    const alternate = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" },
    });
    const inputWins = twoEnemiesAndTwoCards();
    inputWins.combat!.hand = ["combat-1"];
    inputWins.combat!.discardPile = ["combat-2"];
    inputWins.combat!.typing = { buffer: "strike", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: "combat-1", progress: 6, targetEnemyInstanceId: null };
    const played = selectTypedEnemyTarget(inputWins, "enemy-1", { nowMs: () => 10_000 }, alternate, validContent, (state, card) => {
      used = true;
      return { ...state, combat: moveCardFromHand(state.combat!, card, "discard") };
    }, discard);
    expect(used).toBe(true);
    expect(played.combat!.phase).toBe("PLAYER_END");
  });
});
