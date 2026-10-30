import { describe, expect, it } from "vitest";
import { moveCardFromHand } from "../../src/domain/card-piles.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import { enqueueEffectAction, resolveDueEffects, type EffectEvent } from "../../src/domain/effect-primitives.js";
import type { RunState } from "../../src/domain/schema.js";
import { applyStatus, statusAmount } from "../../src/domain/status-engine.js";
import {
  beginEnemyPhase,
  beginPlayerTurn,
  completeEnemyPhase,
  pausePlayerTurn,
  resumePlayerTurn,
  submitPlayerKey,
  tickPlayerTurn,
} from "../../src/domain/turn-state.js";
import { validContent, validRun } from "../fixtures/domain.js";

const discard = () => "discard" as const;

function readyRun(): RunState {
  const run = structuredClone(validRun);
  run.combat!.phase = "PLAYER_START";
  run.combat!.hand = [];
  run.combat!.drawPile = ["combat-1"];
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: [], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null };
  return run;
}

describe("typing turn state machine", () => {
  it("starts by drawing and lets a typed card win without waiting for timeout", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = beginPlayerTurn(readyRun(), source, DEFAULT_GAME_CONFIG, validContent);
    expect(run.combat!.phase).toBe("PLAYER_INPUT");
    expect(run.combat!.hand).toEqual(["combat-1"]);
    expect(run.combat!.clock.remainingMs).toBe(10_000);
    for (const key of "strike") {
      now += 100;
      run = submitPlayerKey(run, { key }, source, DEFAULT_GAME_CONFIG, validContent, (state, instanceId) => {
        const combat = moveCardFromHand(state.combat!, instanceId, "discard");
        let queue = createEventQueue<EffectEvent>();
        queue = enqueueEffectAction(queue, { ...state, combat }, now, {
          kind: "attack", source: { side: "player" }, target: { side: "enemy", instanceId: "enemy-1" }, amount: 20, hits: 1, pierceBlock: false,
        });
        return resolveDueEffects({ ...state, combat }, queue, now, DEFAULT_GAME_CONFIG).run;
      }, discard);
    }
    expect(run.combat!.phase).toBe("WON");
    expect(run.combat!.discardPile).toEqual(["combat-1"]);
    expect(run.combat!.clock.remainingMs).toBe(9_400);
  });

  it("expires the unused hand, executes enemy phase once, then starts the next turn", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = beginPlayerTurn(readyRun(), source, DEFAULT_GAME_CONFIG, validContent);
    now = 10_100;
    run = tickPlayerTurn(run, source, discard);
    expect(run.combat!.phase).toBe("PLAYER_END");
    expect(run.combat!.hand).toEqual([]);
    expect(run.combat!.discardPile).toEqual(["combat-1"]);
    run = beginEnemyPhase(run, DEFAULT_GAME_CONFIG);
    expect(run.combat!.phase).toBe("ENEMY_PHASE");
    run = completeEnemyPhase(run, (state) => {
      let queue = createEventQueue<EffectEvent>();
      queue = enqueueEffectAction(queue, state, now, {
        kind: "attack", source: { side: "enemy", instanceId: "enemy-1" }, target: { side: "player" }, amount: 6, hits: 1, pierceBlock: false,
      });
      return resolveDueEffects(state, queue, now, DEFAULT_GAME_CONFIG).run;
    }, DEFAULT_GAME_CONFIG);
    expect(run.player.hp).toBe(34);
    expect(run.combat!.phase).toBe("PLAYER_START");
    expect(run.combat!.turn).toBe(2);
    now = 10_200;
    run = beginPlayerTurn(run, source, DEFAULT_GAME_CONFIG, validContent);
    expect(run.combat!.hand).toEqual(["combat-1"]);
  });

  it("does not consume paused wall time and expires after resuming", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = beginPlayerTurn(readyRun(), source, DEFAULT_GAME_CONFIG, validContent);
    now = 2_000;
    run = pausePlayerTurn(run, source, discard);
    expect(run.combat!.clock.remainingMs).toBe(8_000);
    now = 100_000;
    run = tickPlayerTurn(run, source, discard);
    expect(run.combat!.phase).toBe("PLAYER_INPUT");
    expect(run.combat!.clock.remainingMs).toBe(8_000);
    run = resumePlayerTurn(run, source);
    now = 108_000;
    run = tickPlayerTurn(run, source, discard);
    expect(run.combat!.phase).toBe("PLAYER_END");
  });

  it("uses the configured rule for a key exactly at the deadline", () => {
    const content = structuredClone(validContent);
    content.cards[0]!.input.text = "s";
    const source = { nowMs: () => 10_000 };
    const started = beginPlayerTurn(readyRun(), { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, validContent);
    let used = 0;
    const useCard = (run: RunState, instanceId: string): RunState => {
      used++;
      return { ...run, player: { ...run.player, block: 1 }, combat: moveCardFromHand(run.combat!, instanceId, "discard") };
    };
    const expired = submitPlayerKey(started, { key: "s" }, source, DEFAULT_GAME_CONFIG, content, useCard, discard);
    expect(expired.combat!.phase).toBe("PLAYER_END");
    expect(expired.player.block).toBe(0);
    expect(used).toBe(0);
    const inputWins = parseGameConfig({ ...DEFAULT_GAME_CONFIG, deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" } });
    const played = submitPlayerKey(started, { key: "s" }, source, inputWins, content, useCard, discard);
    expect(played.combat!.phase).toBe("PLAYER_END");
    expect(played.player.block).toBe(1);
    expect(used).toBe(1);
  });

  it("ends in loss when the enemy resolver defeats the player", () => {
    let now = 0;
    const source = { nowMs: () => now };
    let run = beginPlayerTurn(readyRun(), source, DEFAULT_GAME_CONFIG, validContent);
    now = 10_000;
    run = beginEnemyPhase(tickPlayerTurn(run, source, discard), DEFAULT_GAME_CONFIG);
    run = completeEnemyPhase(run, (state) => ({ ...state, player: { ...state.player, hp: 0 } }), DEFAULT_GAME_CONFIG);
    expect(run.combat!.phase).toBe("LOST");
    expect(run.combat!.turn).toBe(1);
  });

  it("poison can defeat the player before drawing at player start", () => {
    let run = readyRun();
    run.player.hp = 2;
    run = applyStatus(run, { side: "player" }, "poison", 3);
    const result = beginPlayerTurn(run, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, validContent);
    expect(result.combat!.phase).toBe("LOST");
    expect(result.combat!.hand).toEqual([]);
    expect(result.player.hp).toBe(0);
  });

  it("decays player debuffs, then enemy poison can win before enemy actions", () => {
    let run = beginPlayerTurn(readyRun(), { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, validContent);
    run = applyStatus(run, { side: "player" }, "weak", 2);
    run = applyStatus(run, { side: "enemy", instanceId: "enemy-1" }, "poison", 21);
    run = tickPlayerTurn(run, { nowMs: () => 10_000 }, discard);
    const ended = beginEnemyPhase(run, DEFAULT_GAME_CONFIG);
    expect(ended.combat!.phase).toBe("WON");
    expect(statusAmount(ended, { side: "player" }, "weak")).toBe(1);
    expect(ended.combat!.enemies[0]!.hp).toBe(0);
  });

  it("decays enemy debuffs after its action and advances once", () => {
    let run = beginPlayerTurn(readyRun(), { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, validContent);
    run = applyStatus(run, { side: "enemy", instanceId: "enemy-1" }, "weak", 2);
    run = tickPlayerTurn(run, { nowMs: () => 10_000 }, discard);
    run = beginEnemyPhase(run, DEFAULT_GAME_CONFIG);
    expect(statusAmount(run, { side: "enemy", instanceId: "enemy-1" }, "weak")).toBe(2);
    const result = completeEnemyPhase(run, (state) => state, DEFAULT_GAME_CONFIG);
    expect(statusAmount(result, { side: "enemy", instanceId: "enemy-1" }, "weak")).toBe(1);
    expect(result.combat!.turn).toBe(2);
  });
});
