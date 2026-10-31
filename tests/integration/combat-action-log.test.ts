import { describe, expect, it } from "vitest";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { resolveEnemyIntents } from "../../src/domain/enemy-ai.js";
import { setPotionInputActive, submitPotionKey } from "../../src/domain/potions.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import { parseRunState } from "../../src/domain/validate.js";
import type { RunSession } from "../../src/domain/run-flow.js";
import { validContent, validRun } from "../fixtures/domain.js";

const disposition = () => "discard" as const;

describe("resolved combat action history", () => {
  it("records actual card, potion and visible enemy Intent outcomes in action order", () => {
    const content = structuredClone(validContent);
    content.effects.push({ id: "effect-heal", kind: "heal", parameters: { amount: 5 } });
    content.potions[0] = { id: "potion-sample", name: "Bandage", input: { text: "heal", locale: "en" }, target: "self", effectIds: ["effect-heal"] };
    let run = structuredClone(validRun);
    run.player.hp = 30;
    run.combat!.enemies[0]!.block = 3;
    run = useCardEffects(run, "combat-1", { targetEnemyInstanceId: "enemy-1" }, DEFAULT_GAME_CONFIG, content);
    expect(run.combat!.enemies[0]).toMatchObject({ hp: 17, block: 0 });
    expect(run.combat!.actionLog?.[0]).toMatchObject({
      sequence: 1, turn: 1, kind: "card", actionId: "card-strike", targetEnemyInstanceId: "enemy-1",
      enemyDeltas: [{ instanceId: "enemy-1", hpDelta: -3, blockDelta: -3 }], discardedCount: 1,
    });
    run = setPotionInputActive(run, true, { nowMs: () => 3_000 }, content, disposition);
    for (const key of "heal") run = submitPotionKey(run, { key }, { nowMs: () => 3_000 }, DEFAULT_GAME_CONFIG, content, disposition);
    expect(run.combat!.actionLog?.[1]).toMatchObject({ sequence: 2, kind: "potion", actionId: "potion-sample", playerHpDelta: 5 });
    expect(run.player.hp).toBe(35);
    run.combat!.phase = "ENEMY_PHASE";
    const ai = { "enemy-paper": { kind: "sequence" as const, intentIds: ["intent-hit"] } };
    run = resolveEnemyIntents(run, ai, content, (state, actor) => ({
      ...state,
      player: { ...state.player, hp: state.player.hp - 4 },
      combat: { ...state.combat!, enemies: state.combat!.enemies.map((enemy) => enemy.instanceId === actor ? { ...enemy, block: enemy.block + 2 } : enemy) },
    }));
    expect(run.combat!.actionLog?.[2]).toMatchObject({
      sequence: 3, kind: "enemy", actionId: "intent-hit", actorEnemyInstanceId: "enemy-1",
      playerHpDelta: -4, enemyDeltas: [{ instanceId: "enemy-1", hpDelta: 0, blockDelta: 2 }],
    });
    expect(run.combat!.enemies[0]!.intentHistoryIds).toEqual(["intent-hit"]);
    expect(parseRunState(JSON.parse(JSON.stringify(run)), content)).toEqual(run);

    const session: RunSession = { run, screen: "combat", completedNodeIds: ["node-start"], rewardCardIds: [], encounterHistory: {} };
    const restored = deserializeRunSession(serializeRunSession(session, content, { nowMs: () => 3_000 }, disposition), content, { nowMs: () => 0 });
    expect(restored.run.combat!.actionLog).toEqual(run.combat!.actionLog);
  });

  it("accepts saves from before action history and rejects forged references or sequence gaps", () => {
    const run = structuredClone(validRun);
    expect(parseRunState(run, validContent).combat!.actionLog).toBeUndefined();
    run.combat!.actionLog = [{
      sequence: 2, turn: 1, kind: "card", actionId: "card-strike", actorEnemyInstanceId: null, targetEnemyInstanceId: "enemy-1",
      playerHpDelta: 0, playerBlockDelta: 0, enemyDeltas: [], summonedEnemyIds: [], statusDeltas: [], handAddedCount: 0, timeDeltaMs: 0,
    }];
    expect(() => parseRunState(run, validContent)).toThrow(/Combat action log order/);
    run.combat!.actionLog[0]!.sequence = 1;
    run.combat!.actionLog[0]!.targetEnemyInstanceId = "missing";
    expect(() => parseRunState(run, validContent)).toThrow(/Unregistered ID/);
  });
});
