import { buildCardSuite, type ClubCardSpec } from "./card-suite.js";

/** Provisional #74 words and values: setup through poison and weakness, then react. */
export const scienceCardSpecs: readonly ClubCardSpec[] = [
  { id: "SCI-001", word: "sample", type: "skill", target: "enemy",
    effects: [{ kind: "apply_poison", parameters: { amount: 3 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "apply_poison", parameters: { amount: 5 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "SCI-002", word: "observe", type: "skill", target: "enemy",
    effects: [{ kind: "apply_weak", parameters: { turns: 1 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "apply_weak", parameters: { turns: 2 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "SCI-003", word: "reaction", type: "attack", target: "enemy",
    effects: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 6, conditionalAmount: 12 } }],
    upgrades: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 8, conditionalAmount: 15 } }] },
  { id: "SCI-004", word: "formula", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 7 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 10 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "SCI-005", word: "distill", type: "skill", target: "enemy",
    effects: [{ kind: "apply_poison", parameters: { amount: 5 } }, { kind: "heal", parameters: { amount: 2 } }],
    upgrades: [{ kind: "apply_poison", parameters: { amount: 7 } }, { kind: "heal", parameters: { amount: 3 } }] },
  { id: "SCI-006", word: "quarantine", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 10 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 13 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "SCI-007", word: "catalyst", type: "skill", target: "enemy",
    effects: [{ kind: "apply_poison", parameters: { amount: 2 } }, { kind: "apply_weak", parameters: { turns: 1 } }],
    upgrades: [{ kind: "apply_poison", parameters: { amount: 4 } }, { kind: "apply_weak", parameters: { turns: 2 } }] },
  { id: "SCI-008", word: "assay", type: "attack", target: "enemy",
    effects: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 5, conditionalAmount: 10 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 7, conditionalAmount: 13 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "SCI-009", word: "buffer", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 6 } }, { kind: "remove_debuff", parameters: { count: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 9 } }, { kind: "remove_debuff", parameters: { count: 1 } }] },
  { id: "SCI-010", word: "culture", type: "skill", target: "enemy",
    effects: [{ kind: "apply_poison", parameters: { amount: 4 } }, { kind: "persistent_block", parameters: { amountPerTurn: 1 } }],
    upgrades: [{ kind: "apply_poison", parameters: { amount: 6 } }, { kind: "persistent_block", parameters: { amountPerTurn: 2 } }] },
  { id: "SCI-011", word: "test tube", type: "attack", target: "enemy",
    effects: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 7, conditionalAmount: 14 } }, { kind: "apply_poison", parameters: { amount: 2 } }],
    upgrades: [{ kind: "damage_if_status", parameters: { status: "poison", amount: 9, conditionalAmount: 17 } }, { kind: "apply_poison", parameters: { amount: 3 } }] },
  { id: "SCI-012", word: "neutralize", type: "skill", target: "enemy",
    effects: [{ kind: "apply_weak", parameters: { turns: 2 } }, { kind: "apply_poison", parameters: { amount: 2 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "apply_weak", parameters: { turns: 2 } }, { kind: "apply_poison", parameters: { amount: 4 } }, { kind: "draw", parameters: { count: 1 } }] },
];

const suite = buildCardSuite(scienceCardSpecs);
export const scienceCardEffects = suite.effects;
export const scienceCardDefinitions = suite.cards;
