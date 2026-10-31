import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { generateCardRewards } from "../../src/domain/card-rewards.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";

const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const additions = [
  ["literature-demo", "LIT-007", "aside"], ["literature-demo", "LIT-008", "footnote"],
  ["science-demo", "SCI-007", "catalyst"], ["science-demo", "SCI-008", "assay"],
  ["kendo-demo", "KEN-007", "sweep"], ["kendo-demo", "KEN-008", "breath"],
  ["music-demo", "MUS-007", "bridge"], ["music-demo", "MUS-008", "refrain"],
  ["art-demo", "ART-007", "wash"], ["art-demo", "ART-008", "layer"],
] as const;

function typedCard(clubId: string, cardId: string, word: string, upgraded: boolean): RunState {
  const start = createRunSession(42, clubId, demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const added = createCombatCard(entered.run.combat!, demoContent, cardId, upgraded, "hand", { maxHandSize: 10 });
  let run: RunState = { ...entered.run, combat: { ...added.combat, phase: "PLAYER_INPUT", clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } } };
  let now = 0;
  for (const key of word) {
    now += 10;
    run = submitPlayerKey(run, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
  }
  expect(run.combat!.hand).not.toContain(added.instanceId);
  expect(run.combat!.discardPile).toContain(added.instanceId);
  expect(parseRunState(run, demoContent)).toEqual(run);
  return run;
}

describe("expanded club reward pool", () => {
  it("registers ten unique typed words in the appropriate club only", () => {
    for (const [clubId, cardId, word] of additions) {
      const club = demoContent.clubs.find((entry) => entry.id === clubId)!;
      expect(club.signatureCardIds).toContain(cardId);
      expect(club.cardPoolIds).toContain(cardId);
      expect(demoContent.cards.find((entry) => entry.id === cardId)?.input.text).toBe(word);
      expect(demoContent.clubs.filter((entry) => entry.signatureCardIds?.includes(cardId)).map((entry) => entry.id)).toEqual([clubId]);
    }
    for (const club of demoContent.clubs) {
      expect(club.signatureCardIds).toHaveLength(8);
      const reward = generateCardRewards(42, club);
      expect(reward.cardIds.some((cardId) => club.signatureCardIds?.includes(cardId))).toBe(true);
    }
    expect(new Set(additions.map(([, , word]) => word)).size).toBe(additions.length);
  });

  it("resolves every new normal and upgraded card by direct input with valid card zones", () => {
    for (const [clubId, cardId, word] of additions) {
      for (const upgraded of [false, true]) {
        const first = typedCard(clubId, cardId, word, upgraded);
        expect(typedCard(clubId, cardId, word, upgraded)).toEqual(first);
      }
    }
    const aside = typedCard("literature-demo", "LIT-007", "aside", false).combat!.enemies[0]!;
    const upgradedAside = typedCard("literature-demo", "LIT-007", "aside", true).combat!.enemies[0]!;
    expect(aside.maxHp - aside.hp).toBe(5);
    expect(upgradedAside.maxHp - upgradedAside.hp).toBe(7);
    expect(typedCard("science-demo", "SCI-007", "catalyst", false).combat!.statuses.enemies["enemy-1"]).toMatchObject({ poison: 2, weak: 1 });
    expect(typedCard("kendo-demo", "KEN-007", "sweep", false).player.block).toBe(3);
    expect(typedCard("music-demo", "MUS-007", "bridge", false).combat!.clock.remainingMs).toBeGreaterThan(10_000);
    expect(typedCard("art-demo", "ART-008", "layer", false).combat!.statuses.player.barrier).toBe(1);
  });

  it("restores a run after using a newly rewarded card", () => {
    const start = createRunSession(42, "music-demo", demoContent, mapOptions);
    const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const run = typedCard("music-demo", "MUS-007", "bridge", false);
    const session = { ...entered, run, screen: "combat" as const };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 100 }, () => "discard");
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 });
    expect(restored.run.combat!.cards.find((card) => card.cardId === "MUS-007")).toBeDefined();
    expect(restored.run.combat!.clock.remainingMs).toBe(run.combat!.clock.remainingMs - 40);
    expect(parseRunState(restored.run, demoContent)).toEqual(restored.run);
  });
});
