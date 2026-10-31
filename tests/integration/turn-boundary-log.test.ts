import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunSession } from "../../src/domain/run-flow.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, tickPlayerTurn } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

const disposition = () => "discard" as const;

function fullCycle() {
  let run = structuredClone(validRun);
  run.combat!.enemies[0]!.block = 4;
  run.combat!.statuses.player.weak = 2;
  run = tickPlayerTurn(run, { nowMs: () => 10_000 }, disposition);
  run = beginEnemyPhase(run, DEFAULT_GAME_CONFIG);
  run = completeEnemyPhase(run, (state) => state, DEFAULT_GAME_CONFIG);
  run = beginPlayerTurn(run, { nowMs: () => 11_000 }, DEFAULT_GAME_CONFIG, validContent);
  return run;
}

describe("turn boundaries in combat history", () => {
  it("records pile settlement, phase effects, next draw and allocated time in causal order", () => {
    const run = fullCycle();
    const log = run.combat!.actionLog!;
    expect(log.map(({ sequence, turn, actionId }) => [sequence, turn, actionId])).toEqual([
      [1, 1, "player-input-end"], [2, 1, "player-end"], [3, 1, "enemy-start"], [4, 1, "enemy-end"], [5, 2, "player-start"],
    ]);
    expect(log[0]).toMatchObject({ kind: "turn", discardedCount: 1, exhaustedCount: 0, timeDeltaMs: 0 });
    expect(log[1]!.statusDeltas).toContainEqual({ side: "player", enemyInstanceId: null, status: "weak", delta: -1 });
    expect(log[2]!.enemyDeltas).toContainEqual({ instanceId: "enemy-1", hpDelta: 0, blockDelta: -4 });
    expect(log[4]).toMatchObject({ handAddedCount: 1, turnClockMs: 10_000, timeDeltaMs: 0 });
    expect(run.combat!.hand).toEqual(["combat-1"]);
    expect(run.combat!.discardPile).toEqual([]);
    expect(parseRunState(JSON.parse(JSON.stringify(run)), validContent)).toEqual(run);
    expect(fullCycle().combat!.actionLog).toEqual(log);
    const session: RunSession = { run, screen: "combat", completedNodeIds: ["node-start"], rewardCardIds: [], encounterHistory: {} };
    const restored = deserializeRunSession(serializeRunSession(session, validContent, { nowMs: () => 11_000 }, disposition), validContent, { nowMs: () => 0 });
    expect(restored.run.combat!.actionLog).toEqual(log);
  });

  it("records a lethal start-of-turn status without inventing a fresh time allocation", () => {
    const run = structuredClone(validRun);
    run.player.hp = 2;
    run.combat!.phase = "PLAYER_START";
    run.combat!.statuses.player.poison = 3;
    const ended = beginPlayerTurn(run, { nowMs: () => 4_000 }, DEFAULT_GAME_CONFIG, validContent);
    expect(ended.combat!.phase).toBe("LOST");
    expect(ended.combat!.actionLog?.[0]).toMatchObject({ kind: "turn", actionId: "player-start", playerHpDelta: -2, timeDeltaMs: 0 });
    expect(ended.combat!.actionLog?.[0]).not.toHaveProperty("turnClockMs");
  });
});
