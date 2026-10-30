import type { ContentRegistry, RunState } from "../../src/domain/schema.js";

// Synthetic fixture IDs are not shipped game content or approved club names.
export const validContent: ContentRegistry = {
  schemaVersion: 1,
  effects: [
    { id: "effect-damage", kind: "damage", parameters: { amount: 6 } },
    { id: "effect-draw", kind: "draw", parameters: { count: 1 } },
  ],
  cards: [
    { id: "card-strike", name: "Strike", type: "attack", target: "enemy", input: { text: "strike", locale: "en" }, effectIds: ["effect-damage"], keywordIds: [] },
    { id: "card-draft", name: "Draft", type: "skill", target: "self", input: { text: "draft", locale: "en" }, effectIds: ["effect-draw"], keywordIds: [] },
  ],
  intents: [{ id: "intent-hit", label: "Attack", category: "attack", effectIds: ["effect-damage"] }],
  enemies: [{ id: "enemy-paper", name: "Paper Shadow", maxHp: 20, intentIds: ["intent-hit"] }],
  relics: [{ id: "relic-sample", name: "Sample Relic", triggerIds: ["combat-start"], effectIds: ["effect-draw"] }],
  potions: [{ id: "potion-sample", name: "Sample Potion", input: { text: "potion", locale: "en" }, target: "self", effectIds: ["effect-draw"] }],
  clubs: [
    { id: "club-a", name: "Synthetic Club A", startingHp: 40, starterCardIds: ["card-strike"], cardPoolIds: ["card-strike", "card-draft"], startingRelicId: "relic-sample" },
    { id: "club-b", name: "Synthetic Club B", startingHp: 38, starterCardIds: ["card-draft"], cardPoolIds: ["card-draft"], startingRelicId: null },
  ],
};

export const validRun: RunState = {
  schemaVersion: 1,
  seed: 42,
  rngState: 42,
  clubId: "club-a",
  act: 1,
  player: { hp: 40, maxHp: 40, block: 0 },
  deck: [{ instanceId: "deck-1", cardId: "card-strike", upgraded: false }],
  relicIds: ["relic-sample"],
  potionIds: ["potion-sample"],
  map: {
    currentNodeId: "node-start",
    nodes: [
      { id: "node-start", act: 1, floor: 0, kind: "start", nextIds: ["node-combat"] },
      { id: "node-combat", act: 1, floor: 1, kind: "combat", nextIds: [] },
    ],
  },
  combat: {
    phase: "PLAYER_INPUT",
    turn: 1,
    cards: [{ instanceId: "combat-1", cardId: "card-strike", upgraded: false }],
    drawPile: [],
    hand: ["combat-1"],
    discardPile: [],
    exhaustPile: [],
    resolvingPile: [],
    enemies: [{ instanceId: "enemy-1", enemyId: "enemy-paper", hp: 20, maxHp: 20, block: 0, intentId: "intent-hit", intentHistoryIds: [] }],
    typing: { buffer: "str", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: "combat-1", progress: 3, targetEnemyInstanceId: "enemy-1", targetHandInstanceId: null },
    clock: { remainingMs: 7_000, lastEventAtMs: 3_000, paused: false },
    nextTurnBonusMs: 0,
    statuses: { player: {}, enemies: {} },
  },
};
