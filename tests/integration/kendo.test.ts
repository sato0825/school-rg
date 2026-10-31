import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { kendoCardDefinitions } from "../../src/content/kendo-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { enqueueEffectAction, resolveDueEffects, type EffectEvent } from "../../src/domain/effect-primitives.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import type { RunState } from "../../src/domain/schema.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";

function typedKendoCard(cardId: string, enemyHp = 20): RunState {
  const card = kendoCardDefinitions.find((item) => item.id === cardId)!;
  const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
  const start = createRunSession(42, "kendo-demo", demoContent, mapOptions);
  let run = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable).run;
  run.combat!.cards = [{ instanceId: "combat-1", cardId, upgraded: false }];
  run.combat!.phase = "PLAYER_INPUT";
  run.combat!.hand = ["combat-1"];
  run.combat!.drawPile = [];
  run.combat!.discardPile = [];
  run.combat!.exhaustPile = [];
  run.combat!.resolvingPile = [];
  run.combat!.enemies[0]!.hp = enemyHp;
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: "enemy-1", targetHandInstanceId: null };
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  let now = 0;
  for (const key of card.input.text) {
    now += 10;
    run = submitPlayerKey(run, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
  }
  expect(parseRunState(run, demoContent)).toEqual(run);
  return run;
}

describe("kendo guard and counter", () => {
  it("has eight distinct cards, a starter counter relic, and a separate reward pool", () => {
    const club = demoContent.clubs.find((item) => item.id === "kendo-demo")!;
    expect(kendoCardDefinitions).toHaveLength(12);
    expect(club.starterCardIds.filter((id) => id.startsWith("KEN-"))).toHaveLength(4);
    expect(kendoCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    expect(club.startingRelicId).toBe("bamboo-grip");
    const withRelic = emitRelicEvent({ ...typedKendoCard("KEN-001"), relicIds: ["bamboo-grip"] }, "turn_start", demoRelicRules, demoContent).run;
    expect(withRelic.combat!.statuses.player.thorns).toBe(3);
  });

  it("resolves typed defense before an enemy hit and counters once", () => {
    const guarded = typedKendoCard("KEN-001");
    expect(guarded.player.block).toBe(6);
    expect(guarded.combat!.statuses.player.thorns).toBe(2);
    const queue = enqueueEffectAction(createEventQueue<EffectEvent>(), guarded, 100, {
      kind: "attack", source: { side: "enemy", instanceId: "enemy-1" }, target: { side: "player" }, amount: 7, hits: 1, pierceBlock: false,
    });
    const resolved = resolveDueEffects(guarded, queue, 100, DEFAULT_GAME_CONFIG);
    expect(resolved.trace.map((item) => item.kind)).toEqual(["damage", "counter"]);
    expect(resolved.run.player.hp).toBe(43);
    expect(resolved.run.combat!.enemies[0]!.hp).toBe(18);
  });

  it("changes its typed finishing strike only at the target HP threshold", () => {
    expect(typedKendoCard("KEN-006", 20).combat!.enemies[0]!.hp).toBe(12);
    expect(typedKendoCard("KEN-006", 10).combat!.enemies[0]!.hp).toBe(0);
  });
});
