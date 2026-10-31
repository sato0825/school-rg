import { describe, expect, it } from "vitest";
import { artCardSpecs } from "../../src/content/art-cards.js";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { kendoCardSpecs } from "../../src/content/kendo-cards.js";
import { literatureCardSpecs } from "../../src/content/literature-cards.js";
import { musicCardSpecs } from "../../src/content/music-cards.js";
import { scienceCardSpecs } from "../../src/content/science-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { dispositionForCard } from "../../src/domain/card-keywords.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { generateCardRewards } from "../../src/domain/card-rewards.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { selectTypedHandTarget, submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";

const clubs = [
  ["literature-demo", literatureCardSpecs], ["science-demo", scienceCardSpecs], ["kendo-demo", kendoCardSpecs],
  ["music-demo", musicCardSpecs], ["art-demo", artCardSpecs],
] as const;
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const disposition = (id: string, combat: NonNullable<RunState["combat"]>) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, id);

function typeNewCard(clubId: string, cardId: string, word: string, upgraded: boolean) {
  const start = createRunSession(42, clubId, demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const added = createCombatCard(entered.run.combat!, demoContent, cardId, upgraded, "hand", { maxHandSize: 10 });
  const needsHandTarget = demoContent.cards.find((card) => card.id === cardId)!.target === "hand";
  const targetId = needsHandTarget ? added.combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId : null;
  const combat = { ...added.combat, phase: "PLAYER_INPUT" as const,
    hand: targetId ? [...added.combat.hand, targetId] : added.combat.hand,
    drawPile: targetId ? added.combat.drawPile.filter((id) => id !== targetId) : added.combat.drawPile,
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  let run: RunState = { ...entered.run, combat };
  const use = (state: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null) =>
    useCardEffects(state, instanceId, { targetEnemyInstanceId, targetHandInstanceId }, DEFAULT_GAME_CONFIG, demoContent);
  let now = 0;
  for (const key of word) {
    now += 10;
    run = submitPlayerKey(run, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent, use, disposition);
  }
  if (targetId) run = selectTypedHandTarget(run, targetId, { nowMs: () => now + 10 }, DEFAULT_GAME_CONFIG, demoContent, use, disposition);
  expect(run.combat!.hand).not.toContain(added.instanceId);
  expect([...run.combat!.discardPile, ...run.combat!.exhaustPile]).toContain(added.instanceId);
  expect(parseRunState(run, demoContent)).toEqual(run);
  return { run, addedId: added.instanceId, targetId, session: entered };
}

describe("Issue 148 club card expansion", () => {
  it("registers 20 distinct words and keeps rewards inside each club's pool", () => {
    const addedWords: string[] = [];
    for (const [clubId, specs] of clubs) {
      const club = demoContent.clubs.find((item) => item.id === clubId)!;
      const added = specs.slice(8);
      expect(added).toHaveLength(4);
      expect(club.signatureCardIds).toHaveLength(12);
      expect(added.every((spec) => club.signatureCardIds?.includes(spec.id))).toBe(true);
      expect(added.every((spec) => club.cardPoolIds.includes(spec.id))).toBe(true);
      for (let seed = 0; seed < 50; seed++) {
        const rewards = generateCardRewards(seed, club).cardIds;
        expect(rewards).toHaveLength(3);
        expect(rewards.some((id) => club.signatureCardIds?.includes(id))).toBe(true);
      }
      addedWords.push(...added.map((spec) => spec.word));
    }
    expect(new Set(addedWords).size).toBe(20);
  });

  it("types every new normal and upgraded card into a valid, deterministic state", () => {
    for (const [clubId, specs] of clubs) for (const spec of specs.slice(8)) for (const upgraded of [false, true]) {
      const first = typeNewCard(clubId, spec.id, spec.word, upgraded);
      expect(typeNewCard(clubId, spec.id, spec.word, upgraded).run).toEqual(first.run);
    }
  });

  it("preserves effect order and saves a new hand-target card", () => {
    const science = typeNewCard("science-demo", "SCI-011", "test tube", false).run;
    expect(science.combat!.enemies[0]!.maxHp - science.combat!.enemies[0]!.hp).toBe(7);
    expect(science.combat!.statuses.enemies["enemy-1"]?.poison).toBe(2);
    const upgradedScience = typeNewCard("science-demo", "SCI-011", "test tube", true).run;
    expect(upgradedScience.combat!.enemies[0]!.maxHp - upgradedScience.combat!.enemies[0]!.hp).toBe(9);
    const music = typeNewCard("music-demo", "MUS-009", "pickup", false).run;
    expect(music.combat!.clock.remainingMs).toBeGreaterThan(10_000);
    const art = typeNewCard("art-demo", "ART-010", "palette", false);
    const originalStrikes = art.session.run.combat!.cards.filter((card) => card.cardId === "BASE-001").length;
    expect(art.run.combat!.cards.filter((card) => card.cardId === "BASE-001")).toHaveLength(originalStrikes + 1);
    const saved = serializeRunSession({ ...art.session, screen: "combat", run: art.run }, demoContent, { nowMs: () => 100 }, disposition);
    expect(deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 }).run.combat!.cards.filter((card) => card.cardId === "BASE-001")).toHaveLength(originalStrikes + 1);
  });
});
