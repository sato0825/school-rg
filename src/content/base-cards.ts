import type { Card, Effect } from "../domain/schema.js";

/** Exact IDs, input words and effect kinds come from the Basic Card Definitions sheet. */
const source = "https://docs.google.com/spreadsheets/d/1R9pxJ1cgfBqbuWvw-IqMqFN-hVuGwfaRa2LFVuhQ4tI/edit#gid=2104108202";

type BaseCardSpec = {
  id: string;
  input: string;
  type: Card["type"];
  target: Card["target"];
  effectKind: string;
  parameters: Record<string, unknown>;
  sourceRow: number;
  decisionIssue?: number;
};

/** Every numeric effect and every upgrade remains provisional pending content tuning. */
export const baseCardSpecs: readonly BaseCardSpec[] = [
  { id: "BASE-001", input: "strike", type: "attack", target: "enemy", effectKind: "damage", parameters: { amount: 6 }, sourceRow: 2 },
  { id: "BASE-002", input: "defend", type: "skill", target: "self", effectKind: "block", parameters: { amount: 5 }, sourceRow: 3 },
  { id: "BASE-003", input: "heavy strike", type: "attack", target: "enemy", effectKind: "damage", parameters: { amount: 14 }, sourceRow: 4 },
  { id: "BASE-004", input: "quick attack", type: "attack", target: "enemy", effectKind: "damage_multi", parameters: { amount: 4, hits: 2 }, sourceRow: 5 },
  { id: "BASE-005", input: "guard", type: "skill", target: "self", effectKind: "block", parameters: { amount: 8 }, sourceRow: 6 },
  { id: "BASE-006", input: "heal", type: "skill", target: "self", effectKind: "heal", parameters: { amount: 5 }, sourceRow: 7 },
  { id: "BASE-007", input: "draw", type: "skill", target: "self", effectKind: "draw", parameters: { count: 2 }, sourceRow: 8 },
  { id: "BASE-008", input: "strengthen", type: "skill", target: "self", effectKind: "apply_strength", parameters: { amount: 2 }, sourceRow: 9 },
  { id: "BASE-009", input: "weaken", type: "skill", target: "enemy", effectKind: "apply_weak", parameters: { turns: 2 }, sourceRow: 10 },
  { id: "BASE-010", input: "poison", type: "skill", target: "enemy", effectKind: "apply_poison", parameters: { amount: 4 }, sourceRow: 11 },
  { id: "BASE-011", input: "sweep", type: "attack", target: "all_enemies", effectKind: "damage_all", parameters: { amount: 5 }, sourceRow: 12 },
  { id: "BASE-012", input: "pierce", type: "attack", target: "enemy", effectKind: "damage_pierce", parameters: { amount: 8 }, sourceRow: 13 },
  { id: "BASE-013", input: "counter", type: "skill", target: "self", effectKind: "thorns", parameters: { amount: 3 }, sourceRow: 14 },
  { id: "BASE-014", input: "recover", type: "skill", target: "self", effectKind: "retrieve_discard", parameters: { count: 1 }, sourceRow: 15 },
  { id: "BASE-015", input: "exhaust", type: "skill", target: "hand", effectKind: "exhaust_card", parameters: { count: 1 }, sourceRow: 16 },
  { id: "BASE-016", input: "duplicate", type: "skill", target: "hand", effectKind: "copy_card", parameters: { count: 1 }, sourceRow: 17 },
  { id: "BASE-017", input: "boost", type: "skill", target: "self", effectKind: "add_time", parameters: { amountMs: 2_000 }, sourceRow: 18 },
  { id: "BASE-018", input: "cleanse", type: "skill", target: "self", effectKind: "remove_debuff", parameters: { count: 1 }, sourceRow: 19 },
  { id: "BASE-019", input: "barrier", type: "power", target: "self", effectKind: "persistent_block", parameters: { amountPerTurn: 3 }, sourceRow: 20 },
  { id: "BASE-020", input: "focus", type: "power", target: "self", effectKind: "persistent_strength", parameters: { amountPerTurn: 1 }, sourceRow: 21 },
  { id: "BASE-021", input: "sacrifice", type: "skill", target: "self", effectKind: "pay_hp_draw", parameters: { hpCost: 3, drawCount: 2 }, sourceRow: 22 },
  { id: "BASE-022", input: "finish", type: "attack", target: "enemy", effectKind: "conditional_damage", parameters: { amount: 8, conditionalAmount: 16, condition: "target_hp_at_most_percent", thresholdPercent: 50 }, sourceRow: 23, decisionIssue: 48 },
  { id: "BASE-023", input: "delay", type: "skill", target: "self", effectKind: "add_time", parameters: { amountMs: 4_000 }, sourceRow: 24 },
  { id: "BASE-024", input: "shield break", type: "attack", target: "enemy", effectKind: "remove_block", parameters: { all: true }, sourceRow: 25 },
];

export const baseCardEffects: Effect[] = baseCardSpecs.map((spec) => ({
  id: `${spec.id}-effect`,
  kind: spec.effectKind,
  parameters: spec.parameters,
}));

export const baseCardDefinitions: Card[] = baseCardSpecs.map((spec) => ({
  id: spec.id,
  name: spec.input,
  type: spec.type,
  target: spec.target,
  input: { text: spec.input, locale: "en" },
  effectIds: [`${spec.id}-effect`],
  keywordIds: [],
}));

export const baseCardSource = source;
