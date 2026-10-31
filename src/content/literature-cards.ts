import { buildCardSuite, type ClubCardSpec } from "./card-suite.js";

/** Provisional card words and values for #73; all effects use the shared resolver. */
export const literatureCardSpecs: readonly ClubCardSpec[] = [
  { id: "LIT-001", word: "jot", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 6 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "LIT-002", word: "leaf", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 6 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "LIT-003", word: "verse", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 7 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 9 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "LIT-004", word: "outline", type: "skill", target: "self",
    effects: [{ kind: "draw", parameters: { count: 2 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }],
    upgrades: [{ kind: "draw", parameters: { count: 3 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }] },
  { id: "LIT-005", word: "reread", type: "skill", target: "self",
    effects: [{ kind: "retrieve_discard", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 2 } }],
    upgrades: [{ kind: "retrieve_discard", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 5 } }] },
  { id: "LIT-006", word: "proof", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 10 } }, { kind: "block", parameters: { amount: 3 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 13 } }, { kind: "block", parameters: { amount: 4 } }] },
  { id: "LIT-007", word: "aside", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 5 } }, { kind: "draw", parameters: { count: 2 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 7 } }, { kind: "draw", parameters: { count: 2 } }] },
  { id: "LIT-008", word: "footnote", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 2 } }],
    upgrades: [{ kind: "block", parameters: { amount: 7 } }, { kind: "draw", parameters: { count: 2 } }] },
];

const suite = buildCardSuite(literatureCardSpecs);
export const literatureCardEffects = suite.effects;
export const literatureCardDefinitions = suite.cards;
