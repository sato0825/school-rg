import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { scienceCardDefinitions } from "../../src/content/science-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { applyStatus } from "../../src/domain/status-engine.js";
import { resumePlayerTurn, submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { describeCard } from "../../src/ui/battle-view.js";

const combatMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function scienceCombat(): RunState {
  const start = createRunSession(42, "science-demo", demoContent, combatMap);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] });
  const combat = entered.run.combat!;
  const sample = combat.cards.find((card) => card.cardId === "SCI-001")!;
  const reaction = combat.cards.find((card) => card.cardId === "SCI-003")!;
  const hand = [sample.instanceId, reaction.instanceId];
  return { ...entered.run, combat: { ...combat, phase: "PLAYER_INPUT", hand, drawPile: combat.drawPile.filter((id) => !hand.includes(id)),
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } } };
}

function type(run: RunState, word: string, intervalMs = 10): RunState {
  let current = run;
  let now = run.combat!.clock.lastEventAtMs;
  for (const key of word) {
    now += intervalMs;
    current = submitPlayerKey(current, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
  }
  return current;
}

function rewardCardsInHand(upgraded = false): { run: RunState; session: ReturnType<typeof createRunSession> } {
  const start = createRunSession(42, "science-demo", demoContent, combatMap);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi,
    { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] });
  const openingHand = entered.run.combat!.hand;
  const catalyst = createCombatCard(entered.run.combat!, demoContent, "SCI-007", false, "hand", { maxHandSize: 10 });
  const assay = createCombatCard(catalyst.combat, demoContent, "SCI-008", upgraded, "hand", { maxHandSize: 10 });
  const combat = { ...assay.combat, phase: "PLAYER_INPUT" as const,
    hand: [catalyst.instanceId, assay.instanceId], drawPile: [...assay.combat.drawPile, ...openingHand],
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return { run: { ...entered.run, combat }, session: entered };
}

describe("science club setup and reaction", () => {
  it("owns a distinct starter, pool and equipment with compound effect text", () => {
    const club = demoContent.clubs.find((item) => item.id === "science-demo")!;
    expect(club.startingRelicId).toBe("lab-glasses");
    expect(club.starterCardIds.filter((id) => id.startsWith("SCI-"))).toHaveLength(4);
    expect(scienceCardDefinitions).toHaveLength(12);
    expect(scienceCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    expect(describeCard(scienceCardDefinitions.find((card) => card.id === "SCI-003")!, demoContent)).toBe("攻撃 6 · 毒時 12");
    const entered = scienceCombat();
    const started = emitRelicEvent(entered, "combat_start", demoRelicRules, demoContent).run;
    expect(started.combat!.statuses.player.strength).toBe(1);
  });

  it("types preparation before the conditional attack and preserves deterministic state", () => {
    const start = scienceCombat();
    const normal = type({ ...start, combat: { ...start.combat!, hand: [start.combat!.hand[1]!], drawPile: [start.combat!.hand[0]!, ...start.combat!.drawPile] } }, "reaction");
    expect(normal.combat!.enemies[0]!.hp).toBe(20);
    const poisoned = type(start, "sample");
    expect(poisoned.combat!.statuses.enemies["enemy-1"]?.poison).toBe(3);
    const reacted = type(poisoned, "reaction");
    expect(reacted.combat!.enemies[0]!.hp).toBe(14);
    expect(parseRunState(reacted, demoContent)).toEqual(reacted);
    expect(type(scienceCombat(), "sample")).toEqual(poisoned);
  });

  it("gives weak setup a distinct payoff within a provisional ten-second turn", () => {
    const { run } = rewardCardsInHand();
    const first = type(run, "catalyst", 450);
    expect(first.combat!.statuses.enemies["enemy-1"]).toMatchObject({ poison: 2, weak: 1 });
    expect(first.combat!.clock.remainingMs).toBe(6_400);
    const reacted = type(first, "assay", 450);
    expect(reacted.combat!.enemies[0]!.maxHp - reacted.combat!.enemies[0]!.hp).toBe(10);
    expect(reacted.combat!.clock.remainingMs).toBe(4_150);
    expect(parseRunState(reacted, demoContent)).toEqual(reacted);

    const alone = rewardCardsInHand().run;
    const withoutWeak = { ...alone, combat: { ...alone.combat!, hand: [alone.combat!.hand[1]!],
      drawPile: [alone.combat!.hand[0]!, ...alone.combat!.drawPile] } };
    const poisonedOnly = applyStatus(withoutWeak, { side: "enemy", instanceId: "enemy-1" }, "poison", 2);
    const poisonAssay = type(poisonedOnly, "assay", 450);
    expect(poisonAssay.combat!.enemies[0]!.maxHp - poisonAssay.combat!.enemies[0]!.hp).toBe(5);
    const upgraded = rewardCardsInHand(true).run;
    const upgradedAssay = type(type(upgraded, "catalyst", 450), "assay", 450);
    expect(upgradedAssay.combat!.enemies[0]!.maxHp - upgradedAssay.combat!.enemies[0]!.hp).toBe(13);
  });

  it("restores the weak setup and resumes the conditional input with the same remaining time", () => {
    const { run, session } = rewardCardsInHand();
    const prepared = type(run, "catalyst", 450);
    const saved = serializeRunSession({ ...session, screen: "combat", run: prepared }, demoContent,
      { nowMs: () => prepared.combat!.clock.lastEventAtMs }, () => "discard");
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 20_000 });
    const resumed = resumePlayerTurn(restored.run, { nowMs: () => 20_000 });
    const reacted = type(resumed, "assay", 450);
    expect(reacted.combat!.clock.remainingMs).toBe(4_150);
    expect(reacted.combat!.enemies[0]!.hp).toBe(type(prepared, "assay", 450).combat!.enemies[0]!.hp);
    expect(parseRunState(reacted, demoContent)).toEqual(reacted);
  });
});
