import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode, settleRunCombat } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession, UnsupportedSaveVersionError } from "../../src/domain/save.js";
import { beginPlayerTurn, pausePlayerTurn, resumePlayerTurn, tickPlayerTurn } from "../../src/domain/turn-state.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";

const combatMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const shopMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 0, shop: 1, rest: 0, treasure: 0 } };
const disposition = () => "discard" as const;

describe("versioned run save and restore", () => {
  it("round-trips node state, shop stock and reward choices", () => {
    const map = createRunSession(77, "literature-demo", demoContent, combatMap);
    expect(deserializeRunSession(serializeRunSession(map, demoContent, { nowMs: () => 1_000 }, disposition), demoContent, { nowMs: () => 10 })).toEqual(map);
    const shopStart = createRunSession(77, "literature-demo", demoContent, shopMap);
    const shop = enterRunNode(shopStart, availableRunNodes(shopStart)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const shopRestored = deserializeRunSession(serializeRunSession(shop, demoContent, { nowMs: () => 1_000 }, disposition), demoContent, { nowMs: () => 10 });
    expect(shopRestored.run.shop).toEqual(shop.run.shop);
    expect(shopRestored.screen).toBe("shop");
    const entered = enterRunNode(map, availableRunNodes(map)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const won = { ...entered, run: { ...entered.run, combat: { ...entered.run.combat!, phase: "WON" as const } } };
    const reward = settleRunCombat(won, demoContent);
    const restored = deserializeRunSession(serializeRunSession(reward, demoContent, { nowMs: () => 1_000 }, disposition), demoContent, { nowMs: () => 10 });
    expect(restored.rewardCardIds).toEqual(reward.rewardCardIds);
    expect(restored.run.rngState).toBe(reward.run.rngState);
    expect(restored.run.deck).toEqual(reward.run.deck);
  });

  it("freezes the remaining time during combat and replays from a new clock origin", () => {
    const start = createRunSession(42, "literature-demo", demoContent, combatMap);
    const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const live = { ...entered, run: beginPlayerTurn(entered.run, { nowMs: () => 1_000 }, DEFAULT_GAME_CONFIG, demoContent) };
    const originalRemaining = live.run.combat!.clock.remainingMs;
    const saved = serializeRunSession(live, demoContent, { nowMs: () => 3_000 }, disposition);
    expect(live.run.combat?.clock.remainingMs).toBe(originalRemaining);
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 100 });
    expect(restored.run.combat?.clock.remainingMs).toBe(8_000);
    expect(restored.run.combat?.clock.paused).toBe(true);
    expect(restored.run.combat?.clock.lastEventAtMs).toBe(100);
    expect(restored.run.combat?.hand).toEqual(live.run.combat?.hand);
    expect(restored.run.combat?.drawPile).toEqual(live.run.combat?.drawPile);
    expect(restored.run.combat?.enemies).toEqual(live.run.combat?.enemies);
    const resumed = resumePlayerTurn(restored.run, { nowMs: () => 100 });
    const afterSecond = tickPlayerTurn(resumed, { nowMs: () => 1_100 }, disposition);
    const control = tickPlayerTurn(resumePlayerTurn(pausePlayerTurn(live.run, { nowMs: () => 3_000 }, disposition), { nowMs: () => 3_000 }), { nowMs: () => 4_000 }, disposition);
    expect(afterSecond.combat?.clock.remainingMs).toBe(control.combat?.clock.remainingMs);
    expect(afterSecond.rngState).toBe(control.rngState);
    expect(afterSecond.combat?.hand).toEqual(control.combat?.hand);
  });

  it("rejects unsupported versions and inconsistent session screens", () => {
    const session = createRunSession(1, "literature-demo", demoContent, combatMap);
    const saved = JSON.parse(serializeRunSession(session, demoContent, { nowMs: () => 0 }, disposition));
    expect(() => deserializeRunSession(JSON.stringify({ ...saved, formatVersion: 2 }), demoContent, { nowMs: () => 0 })).toThrow(UnsupportedSaveVersionError);
    expect(() => deserializeRunSession(JSON.stringify({ ...saved, session: { ...saved.session, screen: "combat" } }), demoContent, { nowMs: () => 0 })).toThrow(/combat state/);
  });
});
