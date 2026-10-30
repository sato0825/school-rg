import { baseCardDefinitions, baseCardEffects } from "./base-cards.js";
import { shuffle } from "../domain/random.js";
import type { ContentRegistry, RunState } from "../domain/schema.js";
import { createTypingState } from "../domain/typing.js";
import { parseContentRegistry, parseRunState } from "../domain/validate.js";
import type { EnemyAiRegistry } from "../domain/enemy-ai.js";

/** One complete combat encounter for #14. Full run content belongs to #15–#24. */
export const demoContent: ContentRegistry = parseContentRegistry({
  schemaVersion: 1,
  effects: [
    ...baseCardEffects,
    { id: "paper-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "paper-guard", kind: "block", parameters: { amount: 4 } },
  ],
  cards: baseCardDefinitions,
  intents: [
    { id: "paper-intent-hit", label: "飛び散る答案", category: "attack", effectIds: ["paper-hit"] },
    { id: "paper-intent-guard", label: "机を積む", category: "defend", effectIds: ["paper-guard"] },
  ],
  enemies: [{ id: "paper-heap", name: "答案のかたまり", maxHp: 26, intentIds: ["paper-intent-hit", "paper-intent-guard"] }],
  relics: [],
  potions: [],
  clubs: [{
    id: "literature-demo", name: "文芸部", startingHp: 40,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-007", "BASE-010", "BASE-011", "BASE-013", "BASE-017", "BASE-023"],
    cardPoolIds: baseCardDefinitions.map((card) => card.id),
    startingRelicId: null,
  }],
});

export const demoEnemyAi: EnemyAiRegistry = {
  "paper-heap": { kind: "sequence", intentIds: ["paper-intent-hit", "paper-intent-guard"] },
};

export function createDemoBattle(seed = 42): RunState {
  const club = demoContent.clubs[0]!;
  const deck = club.starterCardIds.map((cardId, index) => ({ instanceId: `deck-${index + 1}`, cardId, upgraded: false }));
  const cards = deck.map((card, index) => ({ ...card, instanceId: `combat-${index + 1}` }));
  const shuffled = shuffle(seed, cards.map((card) => card.instanceId));
  return parseRunState({
    schemaVersion: 1,
    seed,
    rngState: shuffled.state,
    clubId: club.id,
    act: 1,
    player: { hp: club.startingHp, maxHp: club.startingHp, block: 0 },
    deck,
    relicIds: [],
    potionIds: [],
    map: { currentNodeId: "demo-battle", nodes: [
      { id: "demo-start", act: 1, floor: 0, kind: "start", nextIds: ["demo-battle"] },
      { id: "demo-battle", act: 1, floor: 1, kind: "combat", nextIds: [] },
    ] },
    combat: {
      phase: "PLAYER_START",
      turn: 1,
      cards,
      drawPile: shuffled.items,
      hand: [], discardPile: [], exhaustPile: [], resolvingPile: [],
      enemies: [{ instanceId: "paper-1", enemyId: "paper-heap", hp: 26, maxHp: 26, block: 0, intentId: "paper-intent-hit", intentHistoryIds: [] }],
      typing: createTypingState([]),
      clock: { remainingMs: 0, lastEventAtMs: 0, paused: false },
      nextTurnBonusMs: 0,
      statuses: { player: {}, enemies: {} },
    },
  }, demoContent);
}
