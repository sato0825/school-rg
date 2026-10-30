import type { Card, Effect } from "../domain/schema.js";

/** Provisional card words and values for #73; all effects use the shared resolver. */
type CardEffect = { kind: string; parameters: Record<string, unknown> };
type LiteratureCardSpec = {
  id: string;
  word: string;
  type: Card["type"];
  target: Card["target"];
  effects: readonly CardEffect[];
  upgrades: readonly CardEffect[];
};

export const literatureCardSpecs: readonly LiteratureCardSpec[] = [
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
];

export const literatureCardEffects: Effect[] = literatureCardSpecs.flatMap((spec) => [
  ...spec.effects.map((effect, index) => ({ id: `${spec.id}-effect-${index + 1}`, ...effect })),
  ...spec.upgrades.map((effect, index) => ({ id: `${spec.id}-upgrade-${index + 1}`, ...effect })),
]);

export const literatureCardDefinitions: Card[] = literatureCardSpecs.map((spec) => ({
  id: spec.id, name: spec.word, type: spec.type, target: spec.target,
  input: { text: spec.word, locale: "en" }, keywordIds: [],
  effectIds: spec.effects.map((_, index) => `${spec.id}-effect-${index + 1}`),
  upgradeEffectIds: spec.upgrades.map((_, index) => `${spec.id}-upgrade-${index + 1}`),
}));
