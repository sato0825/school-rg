import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { scienceCardDefinitions } from "../../src/content/science-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import type { RunState } from "../../src/domain/schema.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
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

function type(run: RunState, word: string): RunState {
  let current = run;
  let now = run.combat!.clock.lastEventAtMs;
  for (const key of word) {
    now += 10;
    current = submitPlayerKey(current, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
  }
  return current;
}

describe("science club setup and reaction", () => {
  it("owns a distinct starter, pool and equipment with compound effect text", () => {
    const club = demoContent.clubs.find((item) => item.id === "science-demo")!;
    expect(club.startingRelicId).toBe("lab-glasses");
    expect(club.starterCardIds.filter((id) => id.startsWith("SCI-"))).toHaveLength(4);
    expect(scienceCardDefinitions).toHaveLength(8);
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
});
