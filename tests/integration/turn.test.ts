import { describe, expect, it } from "vitest";
import { moveCardFromHand } from "../../src/domain/card-piles.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import { enqueueEffectAction, resolveDueEffects, type EffectEvent } from "../../src/domain/effect-primitives.js";
import type { RunState } from "../../src/domain/schema.js";
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
    run = beginEnemyPhase(run);
    expect(run.combat!.phase).toBe("ENEMY_PHASE");
    run = completeEnemyPhase(run, (state) => {
      let queue = createEventQueue<EffectEvent>();
      queue = enqueueEffectAction(queue, state, now, {
        kind: "attack", source: { side: "enemy", instanceId: "enemy-1" }, target: { side: "player" }, amount: 6, hits: 1, pierceBlock: false,
      });
      return resolveDueEffects(state, queue, now, DEFAULT_GAME_CONFIG).run;
    });
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
    run = beginEnemyPhase(tickPlayerTurn(run, source, discard));
    run = completeEnemyPhase(run, (state) => ({ ...state, player: { ...state.player, hp: 0 } }));
    expect(run.combat!.phase).toBe("LOST");
    expect(run.combat!.turn).toBe(1);
  });
});
