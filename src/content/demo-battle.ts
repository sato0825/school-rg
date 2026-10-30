import { baseCardDefinitions, baseCardEffects } from "./base-cards.js";
import { literatureCardDefinitions, literatureCardEffects } from "./literature-cards.js";
import { scienceCardDefinitions, scienceCardEffects } from "./science-cards.js";
import { kendoCardDefinitions, kendoCardEffects } from "./kendo-cards.js";
import { musicCardDefinitions, musicCardEffects } from "./music-cards.js";
import { artCardDefinitions, artCardEffects } from "./art-cards.js";
import { DEFAULT_GAME_CONFIG } from "../domain/config.js";
import { addCurrentTurnTime } from "../domain/time-resource.js";
import { shuffle } from "../domain/random.js";
import type { ContentRegistry, RunState } from "../domain/schema.js";
import { createTypingState } from "../domain/typing.js";
import { parseContentRegistry, parseRunState } from "../domain/validate.js";
import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { EncounterTable } from "../domain/run-flow.js";
import type { RelicRule } from "../domain/relic-hooks.js";

/** One complete combat encounter for #14. Full run content belongs to #15–#24. */
export const demoContent: ContentRegistry = parseContentRegistry({
  schemaVersion: 1,
  effects: [
    ...baseCardEffects,
    ...literatureCardEffects,
    ...scienceCardEffects,
    ...kendoCardEffects,
    ...musicCardEffects,
    ...artCardEffects,
    { id: "paper-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "paper-guard", kind: "block", parameters: { amount: 4 } },
    { id: "exam-hit", kind: "damage", parameters: { amount: 7 } },
    { id: "exam-guard", kind: "block", parameters: { amount: 6 } },
    { id: "hall-hit", kind: "damage", parameters: { amount: 4 } },
    { id: "hall-guard", kind: "block", parameters: { amount: 5 } },
    { id: "chalk-hit", kind: "damage", parameters: { amount: 4 } },
    { id: "chalk-weak", kind: "status", parameters: { status: "weak", delta: 1, target: "player" } },
    { id: "cart-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "cart-guard", kind: "block", parameters: { amount: 6 } },
    { id: "auditor-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "auditor-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
    { id: "announcement-hit", kind: "damage", parameters: { amount: 5 } },
    { id: "announcement-frail", kind: "status", parameters: { status: "frail", delta: 1, target: "player" } },
    { id: "lost-hit", kind: "damage", parameters: { amount: 5, hits: 2 } },
    { id: "lost-guard", kind: "block", parameters: { amount: 5 } },
    { id: "bell-hit", kind: "damage", parameters: { amount: 6 } },
    { id: "bell-guard", kind: "block", parameters: { amount: 7 } },
    { id: "potion-time-effect", kind: "add_time", parameters: { amountMs: 3_000 } },
    { id: "potion-heal-effect", kind: "heal", parameters: { amount: 5 } },
    { id: "potion-ink-effect", kind: "damage", parameters: { amount: 7 } },
  ],
  cards: [...baseCardDefinitions, ...literatureCardDefinitions, ...scienceCardDefinitions, ...kendoCardDefinitions, ...musicCardDefinitions, ...artCardDefinitions],
  intents: [
    { id: "paper-intent-hit", label: "飛び散る答案", category: "attack", effectIds: ["paper-hit"] },
    { id: "paper-intent-guard", label: "机を積む", category: "defend", effectIds: ["paper-guard"] },
    { id: "exam-intent-hit", label: "追試の鐘", category: "attack", effectIds: ["exam-hit"] },
    { id: "exam-intent-guard", label: "答案を隠す", category: "defend", effectIds: ["exam-guard"] },
    { id: "hall-intent-hit", label: "廊下を巡回", category: "attack", effectIds: ["hall-hit"] },
    { id: "hall-intent-guard", label: "通路を塞ぐ", category: "defend", effectIds: ["hall-guard"] },
    { id: "chalk-intent-hit", label: "粉を散らす", category: "attack", effectIds: ["chalk-hit"] },
    { id: "chalk-intent-weak", label: "視界を曇らせる", category: "debuff", effectIds: ["chalk-weak"] },
    { id: "cart-intent-hit", label: "本を揺らす", category: "attack", effectIds: ["cart-hit"] },
    { id: "cart-intent-guard", label: "本棚で守る", category: "defend", effectIds: ["cart-guard"] },
    { id: "auditor-intent-hit", label: "記録を突きつける", category: "attack", effectIds: ["auditor-hit"] },
    { id: "auditor-intent-focus", label: "採点を厳しくする", category: "buff", effectIds: ["auditor-focus"] },
    { id: "announcement-intent-hit", label: "放送を響かせる", category: "attack", effectIds: ["announcement-hit"] },
    { id: "announcement-intent-frail", label: "集中を乱す", category: "debuff", effectIds: ["announcement-frail"] },
    { id: "lost-intent-hit", label: "忘れ物を投げる", category: "attack", effectIds: ["lost-hit"] },
    { id: "lost-intent-guard", label: "荷物に隠れる", category: "defend", effectIds: ["lost-guard"] },
    { id: "bell-intent-hit", label: "鐘を鳴らす", category: "attack", effectIds: ["bell-hit"] },
    { id: "bell-intent-guard", label: "時を止める", category: "defend", effectIds: ["bell-guard"] },
  ],
  enemies: [
    { id: "paper-heap", name: "答案のかたまり", maxHp: 26, intentIds: ["paper-intent-hit", "paper-intent-guard"] },
    { id: "final-exam", name: "追試の番人", maxHp: 38, intentIds: ["exam-intent-hit", "exam-intent-guard"] },
    { id: "hall-monitor", name: "廊下の見回り", maxHp: 30, intentIds: ["hall-intent-hit", "hall-intent-guard"] },
    { id: "chalk-cloud", name: "チョークの雲", maxHp: 27, intentIds: ["chalk-intent-hit", "chalk-intent-weak"] },
    { id: "library-cart", name: "動く図書台車", maxHp: 32, intentIds: ["cart-intent-hit", "cart-intent-guard"] },
    { id: "club-auditor", name: "部活監査の影", maxHp: 38, intentIds: ["auditor-intent-hit", "auditor-intent-focus"] },
    { id: "night-announcement", name: "夜の校内放送", maxHp: 28, intentIds: ["announcement-intent-hit", "announcement-intent-frail"] },
    { id: "lost-and-found", name: "忘れ物の山", maxHp: 34, intentIds: ["lost-intent-hit", "lost-intent-guard"] },
    { id: "closing-bell", name: "終業の鐘", maxHp: 40, intentIds: ["bell-intent-hit", "bell-intent-guard"] },
  ],
  relics: [
    { id: "library-bookmark", name: "図書室のしおり", triggerIds: ["bookmark-acquired", "bookmark-turn", "bookmark-skill"], effectIds: [] },
    { id: "lab-glasses", name: "観察眼鏡", triggerIds: ["lab-glasses-combat-start"], effectIds: [] },
    { id: "bamboo-grip", name: "竹刀の握り", triggerIds: ["bamboo-grip-turn-start"], effectIds: [] },
    { id: "metronome", name: "部室のメトロノーム", triggerIds: ["metronome-turn-start"], effectIds: [] },
    { id: "sketchbook", name: "ポケットスケッチ帳", triggerIds: ["sketchbook-card-used"], effectIds: [] },
  ],
  potions: [
    { id: "potion-time", name: "時間の小瓶", input: { text: "clock", locale: "en" }, target: "self", effectIds: ["potion-time-effect"] },
    { id: "potion-heal", name: "保健室の包帯", input: { text: "bandage", locale: "en" }, target: "self", effectIds: ["potion-heal-effect"] },
    { id: "potion-ink", name: "インクの小瓶", input: { text: "ink", locale: "en" }, target: "enemy", effectIds: ["potion-ink-effect"] },
  ],
  events: [
    {
      id: "after-school-board", title: "放課後の掲示板", description: "掲示物が風で散らばっている。手伝えば、部室の情報が手に入るかもしれない。",
      choices: [
        { id: "help", label: "掲示物を整理する · 15G", requires: [], effects: [{ kind: "gold", amount: 15 }] },
        { id: "borrow", label: "資料を借りる · 10Gでdrawを追加", requires: [{ kind: "gold_at_least", amount: 10 }], effects: [{ kind: "gold", amount: -10 }, { kind: "add_card", cardId: "BASE-007" }] },
        { id: "fight", label: "散らかった答案に立ち向かう", requires: [], effects: [{ kind: "battle", enemyId: "paper-heap" }] },
        { id: "ink", label: "インクの小瓶を拾って戦う", requires: [{ kind: "potion_slot_available" }], effects: [{ kind: "add_potion", potionId: "potion-ink" }, { kind: "battle", enemyId: "paper-heap" }] },
      ],
    },
    {
      id: "collection-box", title: "廊下の回収箱", description: "回収箱が揺れている。中に残された答案が動いているようだ。",
      choices: [
        { id: "pass", label: "静かに通り過ぎる · 5G", requires: [], effects: [{ kind: "gold", amount: 5 }] },
        { id: "recover", label: "落ち着いて手当てする · HP4回復", requires: [{ kind: "hp_at_most_percent", percent: 50 }], effects: [{ kind: "hp", amount: 4 }] },
        { id: "bookmark", label: "しおりを見つける · レリックを取得", requires: [], effects: [{ kind: "add_relic", relicId: "library-bookmark" }] },
        { id: "ink", label: "インクの小瓶を拾って戦う", requires: [{ kind: "potion_slot_available" }], effects: [{ kind: "add_potion", potionId: "potion-ink" }, { kind: "battle", enemyId: "paper-heap" }] },
        { id: "fight", label: "箱を開けて戦う", requires: [], effects: [{ kind: "battle", enemyId: "paper-heap" }] },
      ],
    },
  ],
  clubs: [{
    id: "literature-demo", name: "文芸部", startingHp: 40,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-007", "LIT-001", "BASE-011", "LIT-002", "LIT-003", "LIT-004"],
    cardPoolIds: [...baseCardDefinitions.map((card) => card.id), ...literatureCardDefinitions.map((card) => card.id)],
    signatureCardIds: literatureCardDefinitions.map((card) => card.id),
    startingRelicId: "library-bookmark",
    startingPotionIds: ["potion-time", "potion-heal"],
  }, {
    id: "science-demo", name: "科学部", startingHp: 38,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-007", "SCI-001", "SCI-002", "SCI-003", "SCI-004", "BASE-011"],
    cardPoolIds: [...baseCardDefinitions.map((card) => card.id), ...scienceCardDefinitions.map((card) => card.id)],
    signatureCardIds: scienceCardDefinitions.map((card) => card.id),
    startingRelicId: "lab-glasses",
    startingPotionIds: ["potion-ink"],
  }, {
    id: "kendo-demo", name: "剣道部", startingHp: 44,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-011", "KEN-001", "KEN-002", "KEN-003", "KEN-004", "BASE-013"],
    cardPoolIds: [...baseCardDefinitions.map((card) => card.id), ...kendoCardDefinitions.map((card) => card.id)],
    signatureCardIds: kendoCardDefinitions.map((card) => card.id),
    startingRelicId: "bamboo-grip",
    startingPotionIds: ["potion-heal"],
  }, {
    id: "music-demo", name: "軽音部", startingHp: 39,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-011", "MUS-001", "MUS-002", "MUS-003", "MUS-004", "BASE-017"],
    cardPoolIds: [...baseCardDefinitions.map((card) => card.id), ...musicCardDefinitions.map((card) => card.id)],
    signatureCardIds: musicCardDefinitions.map((card) => card.id),
    startingRelicId: "metronome",
    startingPotionIds: ["potion-time"],
  }, {
    id: "art-demo", name: "美術部", startingHp: 40,
    starterCardIds: ["BASE-001", "BASE-001", "BASE-002", "BASE-003", "BASE-011", "ART-001", "ART-002", "ART-003", "ART-004", "BASE-016"],
    cardPoolIds: [...baseCardDefinitions.map((card) => card.id), ...artCardDefinitions.map((card) => card.id)],
    signatureCardIds: artCardDefinitions.map((card) => card.id),
    startingRelicId: "sketchbook",
    startingPotionIds: ["potion-heal"],
  }],
});

export const demoEnemyAi: EnemyAiRegistry = {
  "paper-heap": { kind: "sequence", intentIds: ["paper-intent-hit", "paper-intent-guard"] },
  "final-exam": { kind: "sequence", intentIds: ["exam-intent-hit", "exam-intent-guard"] },
  "hall-monitor": { kind: "sequence", intentIds: ["hall-intent-hit", "hall-intent-guard"] },
  "chalk-cloud": { kind: "sequence", intentIds: ["chalk-intent-weak", "chalk-intent-hit"] },
  "library-cart": { kind: "sequence", intentIds: ["cart-intent-guard", "cart-intent-hit"] },
  "club-auditor": { kind: "sequence", intentIds: ["auditor-intent-focus", "auditor-intent-hit"] },
  "night-announcement": { kind: "sequence", intentIds: ["announcement-intent-frail", "announcement-intent-hit"] },
  "lost-and-found": { kind: "sequence", intentIds: ["lost-intent-hit", "lost-intent-guard"] },
  "closing-bell": { kind: "sequence", intentIds: ["bell-intent-guard", "bell-intent-hit"] },
};

/** Provisional content values; the reusable hook dispatcher lives in the domain. */
export const demoRelicRules: RelicRule[] = [
  { id: "bookmark-acquired", on: "acquired", priority: 0, stackMode: "aggregate", apply: (run) => ({ ...run, gold: run.gold + 2 }) },
  { id: "bookmark-turn", on: "turn_start", priority: 0, stackMode: "each", apply: (run) => ({ ...run, player: { ...run.player, block: run.player.block + 1 } }) },
  { id: "bookmark-skill", on: "card_used", priority: 1, stackMode: "aggregate", condition: (run, event) => {
    const cardId = run.combat?.cards.find((card) => card.instanceId === event.cardInstanceId)?.cardId;
    return run.combat?.phase === "PLAYER_INPUT" && !!demoContent.cards.find((card) => card.id === cardId && card.type === "skill");
  }, apply: (run, _event, stacks) => ({ ...run, player: { ...run.player, block: run.player.block + stacks } }) },
  { id: "lab-glasses-combat-start", on: "combat_start", priority: 0, stackMode: "each", apply: (run, _event, stacks) => ({
    ...run, combat: run.combat ? { ...run.combat, statuses: { ...run.combat.statuses, player: { ...run.combat.statuses.player, strength: (run.combat.statuses.player.strength ?? 0) + stacks } } } : null,
  }) },
  { id: "bamboo-grip-turn-start", on: "turn_start", priority: 0, stackMode: "each", apply: (run, _event, stacks) => ({
    ...run, combat: run.combat ? { ...run.combat, statuses: { ...run.combat.statuses, player: { ...run.combat.statuses.player, thorns: (run.combat.statuses.player.thorns ?? 0) + stacks } } } : null,
  }) },
  { id: "metronome-turn-start", on: "turn_start", priority: 0, stackMode: "each", apply: (run, _event, stacks) =>
    addCurrentTurnTime(run, 1_000 * stacks, { nowMs: () => run.combat!.clock.lastEventAtMs }, DEFAULT_GAME_CONFIG) },
  { id: "sketchbook-card-used", on: "card_used", priority: 0, stackMode: "each", condition: (run, event) => {
    const cardId = run.combat?.cards.find((card) => card.instanceId === event.cardInstanceId)?.cardId;
    return run.combat?.phase === "PLAYER_INPUT" && !!cardId?.startsWith("ART-");
  }, apply: (run, _event, stacks) => ({ ...run, player: { ...run.player, block: run.player.block + stacks } }) },
];

export const demoEncounterTable: EncounterTable = {
  byAct: {
    1: { combat: ["paper-heap"], elite: ["hall-monitor"], boss: ["final-exam"] },
    2: { combat: ["chalk-cloud"], elite: ["library-cart"], boss: ["club-auditor"] },
    3: { combat: ["night-announcement"], elite: ["lost-and-found"], boss: ["closing-bell"] },
  },
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
