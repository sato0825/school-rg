import { baseCardDefinitions, baseCardEffects } from "./base-cards.js";
import { shuffle } from "../domain/random.js";
import type { ContentRegistry, RunState } from "../domain/schema.js";
import { createTypingState } from "../domain/typing.js";
import { parseContentRegistry, parseRunState } from "../domain/validate.js";
import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { EncounterTable } from "../domain/run-flow.js";

/** One complete combat encounter for #14. Full run content belongs to #15–#24. */
export const demoContent: ContentRegistry = parseContentRegistry({
  schemaVersion: 1,
  effects: [
    ...baseCardEffects,
    { id: "paper-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "paper-guard", kind: "block", parameters: { amount: 4 } },
    { id: "exam-hit", kind: "damage", parameters: { amount: 7 } },
    { id: "exam-guard", kind: "block", parameters: { amount: 6 } },
  ],
  cards: baseCardDefinitions,
  intents: [
    { id: "paper-intent-hit", label: "飛び散る答案", category: "attack", effectIds: ["paper-hit"] },
    { id: "paper-intent-guard", label: "机を積む", category: "defend", effectIds: ["paper-guard"] },
    { id: "exam-intent-hit", label: "追試の鐘", category: "attack", effectIds: ["exam-hit"] },
    { id: "exam-intent-guard", label: "答案を隠す", category: "defend", effectIds: ["exam-guard"] },
  ],
  enemies: [
    { id: "paper-heap", name: "答案のかたまり", maxHp: 26, intentIds: ["paper-intent-hit", "paper-intent-guard"] },
    { id: "final-exam", name: "追試の番人", maxHp: 38, intentIds: ["exam-intent-hit", "exam-intent-guard"] },
  ],
  relics: [],
  potions: [],
  events: [
    {
      id: "after-school-board", title: "放課後の掲示板", description: "掲示物が風で散らばっている。手伝えば、部室の情報が手に入るかもしれない。",
      choices: [
        { id: "help", label: "掲示物を整理する · 15G", requires: [], effects: [{ kind: "gold", amount: 15 }] },
        { id: "borrow", label: "資料を借りる · 10Gでdrawを追加", requires: [{ kind: "gold_at_least", amount: 10 }], effects: [{ kind: "gold", amount: -10 }, { kind: "add_card", cardId: "BASE-007" }] },
        { id: "fight", label: "散らかった答案に立ち向かう", requires: [], effects: [{ kind: "battle", enemyId: "paper-heap" }] },
      ],
    },
    {
      id: "collection-box", title: "廊下の回収箱", description: "回収箱が揺れている。中に残された答案が動いているようだ。",
      choices: [
        { id: "pass", label: "静かに通り過ぎる · 5G", requires: [], effects: [{ kind: "gold", amount: 5 }] },
        { id: "recover", label: "落ち着いて手当てする · HP4回復", requires: [{ kind: "hp_at_most_percent", percent: 50 }], effects: [{ kind: "hp", amount: 4 }] },
        { id: "fight", label: "箱を開けて戦う", requires: [], effects: [{ kind: "battle", enemyId: "paper-heap" }] },
      ],
    },
  ],
  clubs: [{
    id: "literature-demo", name: "文芸部", startingHp: 40,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-007", "BASE-010", "BASE-011", "BASE-013", "BASE-017", "BASE-023"],
    cardPoolIds: baseCardDefinitions.map((card) => card.id),
    startingRelicId: null,
  }],
});

export const demoEnemyAi: EnemyAiRegistry = {
  "paper-heap": { kind: "sequence", intentIds: ["paper-intent-hit", "paper-intent-guard"] },
  "final-exam": { kind: "sequence", intentIds: ["exam-intent-hit", "exam-intent-guard"] },
};

export const demoEncounterTable: EncounterTable = {
  combat: ["paper-heap"],
  elite: ["final-exam"],
  boss: ["final-exam"],
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
