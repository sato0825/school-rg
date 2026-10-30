import { buildCardSuite, type ClubCardSpec } from "./card-suite.js";

/** Provisional #75 words and values: guard a hit, counter, then finish a weakened target. */
export const kendoCardSpecs: readonly ClubCardSpec[] = [
  { id: "KEN-001", word: "parry", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 6 } }, { kind: "thorns", parameters: { amount: 2 } }],
    upgrades: [{ kind: "block", parameters: { amount: 9 } }, { kind: "thorns", parameters: { amount: 3 } }] },
  { id: "KEN-002", word: "stance", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 8 } }, { kind: "draw", parameters: { count: 1 } }],
    upgrades: [{ kind: "block", parameters: { amount: 11 } }, { kind: "draw", parameters: { count: 1 } }] },
  { id: "KEN-003", word: "thrust", type: "attack", target: "enemy",
    effects: [{ kind: "damage", parameters: { amount: 8 } }],
    upgrades: [{ kind: "damage", parameters: { amount: 11 } }] },
  { id: "KEN-004", word: "riposte", type: "attack", target: "enemy",
    effects: [{ kind: "damage_multi", parameters: { amount: 3, hits: 2 } }],
    upgrades: [{ kind: "damage_multi", parameters: { amount: 4, hits: 2 } }] },
  { id: "KEN-005", word: "kata", type: "skill", target: "self",
    effects: [{ kind: "block", parameters: { amount: 5 } }, { kind: "thorns", parameters: { amount: 4 } }],
    upgrades: [{ kind: "block", parameters: { amount: 7 } }, { kind: "thorns", parameters: { amount: 5 } }] },
  { id: "KEN-006", word: "final cut", type: "attack", target: "enemy",
    effects: [{ kind: "conditional_damage", parameters: { condition: "target_hp_at_most_percent", thresholdPercent: 50, amount: 8, conditionalAmount: 16 } }],
    upgrades: [{ kind: "conditional_damage", parameters: { condition: "target_hp_at_most_percent", thresholdPercent: 50, amount: 11, conditionalAmount: 20 } }] },
];

const suite = buildCardSuite(kendoCardSpecs);
export const kendoCardEffects = suite.effects;
export const kendoCardDefinitions = suite.cards;
