import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { resolveEnemyIntents, selectEnemyIntent, type EnemyAiRegistry } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { enqueueEffectAction, resolveDueEffects, type EffectEvent } from "../../src/domain/effect-primitives.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import type { ContentRegistry, RunState } from "../../src/domain/schema.js";
import { applyStatus } from "../../src/domain/status-engine.js";
import { completeEnemyPhase } from "../../src/domain/turn-state.js";
import { validContent, validRun } from "../fixtures/domain.js";

function setup() {
  const content: ContentRegistry = structuredClone(validContent);
  content.intents.push(
    { id: "intent-guard", label: "Guard", category: "defend", effectIds: [] },
    { id: "intent-call", label: "Call", category: "summon", effectIds: [] },
  );
  content.enemies[0]!.intentIds.push("intent-guard", "intent-call");
  const run: RunState = structuredClone(validRun);
  run.combat!.phase = "ENEMY_PHASE";
  return { content, run };
}

describe("enemy Intent AI", () => {
  it("runs the visible action once per living enemy in encounter order and publishes the next sequence Intent", () => {
    const { content, run } = setup();
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "sequence", intentIds: ["intent-hit", "intent-guard"] } };
    const seen: string[] = [];
    const result = resolveEnemyIntents(run, ai, content, (state, instanceId, intent) => {
      seen.push(`${instanceId}:${intent.id}`);
      let queue = createEventQueue<EffectEvent>();
      queue = enqueueEffectAction(queue, state, 0, { kind: "attack", source: { side: "enemy", instanceId }, target: { side: "player" }, amount: 3, hits: 2, pierceBlock: false });
      return resolveDueEffects(state, queue, 0, DEFAULT_GAME_CONFIG).run;
    });
    expect(seen).toEqual(["enemy-1:intent-hit", "enemy-2:intent-hit"]);
    expect(result.player.hp).toBe(28);
    expect(result.combat!.enemies.map((enemy) => enemy.intentId)).toEqual(["intent-guard", "intent-guard"]);
    expect(result.combat!.enemies.map((enemy) => enemy.intentHistoryIds)).toEqual([["intent-hit"], ["intent-hit"]]);
  });

  it("replays weighted choices with the same seed and rejects invalid AI choices", () => {
    const { content, run } = setup();
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "weighted", choices: [
      { intentId: "intent-hit", weight: 2 }, { intentId: "intent-guard", weight: 3 },
    ] } };
    const first = selectEnemyIntent(run, "enemy-1", ai, content);
    const repeated = selectEnemyIntent(structuredClone(run), "enemy-1", ai, content);
    expect(first).toEqual(repeated);
    expect(first.rngState).not.toBe(run.rngState);
    expect(() => selectEnemyIntent(run, "enemy-1", { "enemy-paper": { kind: "sequence", intentIds: ["other"] } }, content)).toThrow("unregistered Intent");
  });

  it("selects the first matching condition and does not let a new summon act immediately", () => {
    const { content, run } = setup();
    run.combat!.enemies[0]!.hp = 9;
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "conditional", branches: [
      { when: { kind: "player_status_at_least", status: "poison", amount: 2 }, intentId: "intent-guard" },
      { when: { kind: "hp_at_most_percent", percent: 50 }, intentId: "intent-call" },
    ], fallbackIntentId: "intent-hit" } };
    const selected = selectEnemyIntent(run, "enemy-1", ai, content);
    expect(selected.combat!.enemies[0]!.intentId).toBe("intent-call");
    const poisoned = applyStatus(run, { side: "player" }, "poison", 2);
    expect(selectEnemyIntent(poisoned, "enemy-1", ai, content).combat!.enemies[0]!.intentId).toBe("intent-guard");
    const seen: string[] = [];
    const result = resolveEnemyIntents(selected, ai, content, (state, instanceId) => {
      seen.push(instanceId);
      return { ...state, combat: { ...state.combat!, enemies: [
        ...state.combat!.enemies,
        { ...state.combat!.enemies[0]!, instanceId: "summoned-1", hp: 5, maxHp: 5, intentId: "intent-hit", intentHistoryIds: [] },
      ] } };
    });
    expect(seen).toEqual(["enemy-1"]);
    expect(result.combat!.enemies).toHaveLength(2);
    expect(result.combat!.enemies[1]!.intentHistoryIds).toEqual([]);
  });

  it("stops after a lethal first action and does not execute later Intents", () => {
    const { content, run } = setup();
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "sequence", intentIds: ["intent-hit"] } };
    const seen: string[] = [];
    const result = resolveEnemyIntents(run, ai, content, (state, instanceId) => {
      seen.push(instanceId);
      return { ...state, player: { ...state.player, hp: 0 } };
    });
    expect(result.combat!.phase).toBe("LOST");
    expect(seen).toEqual(["enemy-1"]);
  });

  it("resolves attack, guard, buff, debuff and summon effects from the visible Intent", () => {
    const { content, run } = setup();
    content.effects.push(
      { id: "multi", kind: "damage", parameters: { amount: 2, hits: 2 } },
      { id: "guard", kind: "block", parameters: { amount: 4 } },
      { id: "buff", kind: "status", parameters: { status: "strength", delta: 1 } },
      { id: "debuff", kind: "status", parameters: { status: "weak", delta: 2, target: "player" } },
      { id: "call", kind: "summon", parameters: { enemyId: "enemy-paper" } },
    );
    content.intents.push({ id: "intent-mixed", label: "Mixed", category: "mixed", effectIds: ["multi", "guard", "buff", "debuff", "call"] });
    content.enemies[0]!.intentIds.push("intent-mixed");
    run.combat!.enemies[0]!.intentId = "intent-mixed";
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "sequence", intentIds: ["intent-hit", "intent-guard"] } };
    const result = resolveEnemyIntents(run, ai, content, (state, instanceId, intent) =>
      executeEnemyIntentEffects(state, instanceId, intent, ai, content, DEFAULT_GAME_CONFIG));
    expect(result.player.hp).toBe(36);
    expect(result.combat!.enemies[0]!.block).toBe(4);
    expect(result.combat!.statuses.enemies["enemy-1"]?.strength).toBe(1);
    expect(result.combat!.statuses.player.weak).toBe(2);
    expect(result.combat!.enemies[1]).toMatchObject({ instanceId: "summoned-1", intentId: "intent-hit", hp: 20 });
    expect(result.combat!.enemies[1]!.intentHistoryIds).toEqual([]);
    expect(result.combat!.enemies[0]!.intentHistoryIds).toEqual(["intent-mixed"]);
  });

  it("integrates the advertised attack with the turn state machine", () => {
    const { content, run } = setup();
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "sequence", intentIds: ["intent-hit", "intent-guard"] } };
    const result = completeEnemyPhase(run, (state) => resolveEnemyIntents(state, ai, content,
      (current, instanceId, intent) => executeEnemyIntentEffects(current, instanceId, intent, ai, content, DEFAULT_GAME_CONFIG)), DEFAULT_GAME_CONFIG);
    expect(result.player.hp).toBe(34);
    expect(result.combat!.phase).toBe("PLAYER_START");
    expect(result.combat!.turn).toBe(2);
    expect(result.combat!.enemies[0]!.intentId).toBe("intent-guard");
  });

  it("evaluates next-turn conditions for the action being advertised", () => {
    const { content, run } = setup();
    const ai: EnemyAiRegistry = { "enemy-paper": { kind: "conditional", branches: [
      { when: { kind: "turn_at_least", turn: 2 }, intentId: "intent-guard" },
    ], fallbackIntentId: "intent-hit" } };
    expect(selectEnemyIntent(run, "enemy-1", ai, content).combat!.enemies[0]!.intentId).toBe("intent-hit");
    const acted = resolveEnemyIntents(run, ai, content, (state) => state);
    expect(acted.combat!.enemies[0]!.intentId).toBe("intent-guard");
  });
});
