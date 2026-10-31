import { buildCardSuite, type ClubCardSpec } from "./card-suite.js";

/** Provisional #77 words and values: keep a frame, duplicate, exhaust, or redraw a hand card. */
export const artCardSpecs: readonly ClubCardSpec[] = [
  { id: "ART-001", word: "sketch", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 6 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "ART-002", word: "frame", type: "skill", target: "self", keywordIds: ["retain"],
    effects: [{ kind: "block", parameters: { amount: 7 } }],
    upgrades: [{ kind: "block", parameters: { amount: 10 } }] },
  { id: "ART-003", word: "paint", type: "skill", target: "hand",
    effects: [{ kind: "copy_card", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 2 } }],
    upgrades: [{ kind: "copy_card", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 5 } }] },
  { id: "ART-004", word: "erase", type: "skill", target: "hand",
    effects: [{ kind: "exhaust_card", parameters: { count: 1 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "exhaust_card", parameters: { count: 1 } }, { kind: "draw", parameters: { count: 2 } }] },
  { id: "ART-005", word: "redraw", type: "skill", target: "hand",
    effects: [{ kind: "transform_card", parameters: { cardId: "ART-006", upgraded: false } }, { kind: "block", parameters: { amount: 3 } }],
    upgrades: [{ kind: "transform_card", parameters: { cardId: "ART-006", upgraded: true } }, { kind: "block", parameters: { amount: 5 } }] },
  { id: "ART-006", word: "mural", type: "attack", target: "all_enemies", keywordIds: ["exhaust"],
    effects: [{ kind: "damage_all", parameters: { amount: 6 } }, { kind: "persistent_block", parameters: { amountPerTurn: 2 } }],
    upgrades: [{ kind: "damage_all", parameters: { amount: 8 } }, { kind: "persistent_block", parameters: { amountPerTurn: 3 } }] },
  { id: "ART-007", word: "wash", type: "attack", target: "all_enemies",
    effects: [{ kind: "damage_all", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "damage_all", parameters: { amount: 6 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "ART-008", word: "layer", type: "skill", target: "self", keywordIds: ["retain"],
    effects: [{ kind: "block", parameters: { amount: 5 } }, { kind: "persistent_block", parameters: { amountPerTurn: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 7 } }, { kind: "persistent_block", parameters: { amountPerTurn: 2 } }] },
  { id: "ART-009", word: "primer", type: "power", target: "self",
    effects: [{ kind: "persistent_block", parameters: { amountPerTurn: 2 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "persistent_block", parameters: { amountPerTurn: 3 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "ART-010", word: "palette", type: "skill", target: "hand",
    effects: [{ kind: "copy_card", parameters: { count: 1 } }, { kind: "add_time", parameters: { amountMs: 500 } }],
    upgrades: [{ kind: "copy_card", parameters: { count: 1 } }, { kind: "add_time", parameters: { amountMs: 1_000 } }] },
  { id: "ART-011", word: "cutout", type: "skill", target: "hand",
    effects: [{ kind: "exhaust_card", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 8 } }],
    upgrades: [{ kind: "exhaust_card", parameters: { count: 1 } }, { kind: "block", parameters: { amount: 11 } }] },
  { id: "ART-012", word: "triptych", type: "attack", target: "all_enemies", keywordIds: ["exhaust"],
    effects: [{ kind: "damage_all", parameters: { amount: 7 } }, { kind: "persistent_block", parameters: { amountPerTurn: 1 } }],
    upgrades: [{ kind: "damage_all", parameters: { amount: 10 } }, { kind: "persistent_block", parameters: { amountPerTurn: 2 } }] },
];

const suite = buildCardSuite(artCardSpecs);
export const artCardEffects = suite.effects;
export const artCardDefinitions = suite.cards;
