import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { recordCombatResult } from "../../src/domain/combat-action-log.js";
import { resolveEnemyIntents } from "../../src/domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { emitRelicEvent, type RelicRule } from "../../src/domain/relic-hooks.js";
import { settleRunCombat, type RunSession } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

describe("relic reactions in combat history", () => {
  it("places repeated hit reactions after the visible Intent without double counting damage", () => {
    const content = structuredClone(validContent);
    content.effects[0]!.parameters = { amount: 2, hits: 2, pierceBlock: false };
    content.relics[0]!.triggerIds = ["on-hit"];
    const rule: RelicRule = { id: "on-hit", on: "hit_taken", priority: 0, stackMode: "each", apply: (state) => ({
      ...state, player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + 1) },
    }) };
    const ai = { "enemy-paper": { kind: "sequence" as const, intentIds: ["intent-hit"] } };
    const run = structuredClone(validRun);
    run.player.hp = 35;
    run.player.block = 0;
    run.combat!.phase = "ENEMY_PHASE";
    const resolved = resolveEnemyIntents(run, ai, content, (state, actor, intent) =>
      executeEnemyIntentEffects(state, actor, intent, ai, content, DEFAULT_GAME_CONFIG,
        (hitState, hpLost) => emitRelicEvent(hitState, "hit_taken", [rule], content, { hpLost }).run));
    const entries = resolved.combat!.actionLog!;
    expect(entries.map((entry) => [entry.sequence, entry.kind, entry.actionId])).toEqual([
      [1, "enemy", "intent-hit"], [2, "relic", "relic-sample"], [3, "relic", "relic-sample"],
    ]);
    expect(entries.map((entry) => entry.playerHpDelta)).toEqual([-4, 1, 1]);
    expect(entries.slice(1).map((entry) => entry.triggerHpLost)).toEqual([2, 2]);
    expect(entries[1]).toMatchObject({ relicTrigger: "hit_taken", relicRuleId: "on-hit", relicStacks: 1 });
    expect(resolved.player.hp).toBe(33);
    expect(parseRunState(JSON.parse(JSON.stringify(resolved)), content)).toEqual(resolved);
  });

  it("retains win, combat-end relic and gold reward records after the final battle", () => {
    const content = structuredClone(validContent);
    content.relics[0]!.triggerIds = ["graduation-gold"];
    const rule: RelicRule = { id: "graduation-gold", on: "combat_end", priority: 0, stackMode: "each", apply: (state) => ({ ...state, gold: state.gold + 5 }) };
    let run = structuredClone(validRun);
    run.act = 3;
    run.map = { currentNodeId: "node-boss", nodes: [
      { id: "node-start", act: 3, floor: 0, kind: "start", nextIds: ["node-boss"] },
      { id: "node-boss", act: 3, floor: 1, kind: "boss", nextIds: [] },
    ] };
    run.combat!.phase = "WON";
    run = emitRelicEvent(recordCombatResult(run), "combat_end", [rule], content).run;
    const session: RunSession = { run, screen: "combat", completedNodeIds: ["node-start"], rewardCardIds: [], encounterHistory: {} };
    const finished = settleRunCombat(session, content);
    expect(finished.screen).toBe("won");
    expect(finished.run.combat).toBeNull();
    expect(finished.run.lastCombatLog?.entries.map((entry) => [entry.kind, entry.actionId])).toEqual([
      ["result", "won"], ["relic", "relic-sample"], ["result", "reward"],
    ]);
    expect(finished.run.lastCombatLog?.entries[1]?.goldDelta).toBe(5);
    expect(finished.run.lastCombatLog?.entries.at(-1)?.goldDelta).toBeGreaterThan(0);
    expect(parseRunState(JSON.parse(JSON.stringify(finished.run)), content)).toEqual(finished.run);
    const saved = serializeRunSession(finished, content, { nowMs: () => 0 }, () => "discard");
    expect(deserializeRunSession(saved, content, { nowMs: () => 100 }).run.lastCombatLog).toEqual(finished.run.lastCombatLog);
  });
});
