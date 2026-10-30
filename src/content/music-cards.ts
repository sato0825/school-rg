import { buildCardSuite, type ClubCardSpec } from "./card-suite.js";

/** Provisional #76 words and values: type short cues to buy time for chained cards. */
export const musicCardSpecs: readonly ClubCardSpec[] = [
  { id: "MUS-001", word: "tempo", type: "skill", target: "self",
    effects: [{ kind: "add_time", parameters: { amountMs: 2_000 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "add_time", parameters: { amountMs: 3_000 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "MUS-002", word: "beat", type: "attack", target: "enemy",
    effects: [{ kind: "damage_multi", parameters: { amount: 2, hits: 3 } }],
    upgrades: [{ kind: "damage_multi", parameters: { amount: 3, hits: 3 } }] },
  { id: "MUS-003", word: "rest", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 6 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }],
    upgrades: [{ kind: "block", parameters: { amount: 8 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }] },
  { id: "MUS-004", word: "sync", type: "skill", target: "self",
    effects: [{ kind: "draw", parameters: { count: 2 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }],
    upgrades: [{ kind: "draw", parameters: { count: 3 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }] },
  { id: "MUS-005", word: "chorus", type: "attack", target: "all_enemies",
    effects: [{ kind: "damage_all", parameters: { amount: 5 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }],
    upgrades: [{ kind: "damage_all", parameters: { amount: 7 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }] },
  { id: "MUS-006", word: "crescendo", type: "attack", target: "enemy",
    effects: [{ kind: "damage_multi", parameters: { amount: 3, hits: 3 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }],
    upgrades: [{ kind: "damage_multi", parameters: { amount: 4, hits: 3 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }] },
  { id: "MUS-007", word: "bridge", type: "skill", target: "self",
    effects: [{ kind: "add_time", parameters: { amountMs: 1_000 } }, { kind: "draw", parameters: { count: 2 } }, { kind: "block", parameters: { amount: 2 } }],
    upgrades: [{ kind: "add_time", parameters: { amountMs: 1_000 } }, { kind: "draw", parameters: { count: 2 } }, { kind: "block", parameters: { amount: 5 } }] },
  { id: "MUS-008", word: "refrain", type: "attack", target: "all_enemies",
    effects: [{ kind: "damage_all", parameters: { amount: 4 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }],
    upgrades: [{ kind: "damage_all", parameters: { amount: 6 } }, { kind: "add_time", parameters: { amountMs: 2_000 } }] },
];

const suite = buildCardSuite(musicCardSpecs);
export const musicCardEffects = suite.effects;
export const musicCardDefinitions = suite.cards;
