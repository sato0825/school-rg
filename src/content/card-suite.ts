import type { Card, Effect } from "../domain/schema.js";

export type CardEffectSpec = { kind: string; parameters: Record<string, unknown> };
export type ClubCardSpec = {
  id: string;
  word: string;
  type: Card["type"];
  target: Card["target"];
  keywordIds?: readonly string[];
  effects: readonly CardEffectSpec[];
  upgrades: readonly CardEffectSpec[];
};

/** Content data stays replaceable; this builder gives each club the same ID rules. */
export function buildCardSuite(specs: readonly ClubCardSpec[]): { cards: Card[]; effects: Effect[] } {
  return {
    cards: specs.map((spec) => ({
      id: spec.id, name: spec.word, type: spec.type, target: spec.target,
      input: { text: spec.word, locale: "en" }, keywordIds: [...(spec.keywordIds ?? [])],
      effectIds: spec.effects.map((_, index) => `${spec.id}-effect-${index + 1}`),
      upgradeEffectIds: spec.upgrades.map((_, index) => `${spec.id}-upgrade-${index + 1}`),
    })),
    effects: specs.flatMap((spec) => [
      ...spec.effects.map((effect, index) => ({ id: `${spec.id}-effect-${index + 1}`, ...effect })),
      ...spec.upgrades.map((effect, index) => ({ id: `${spec.id}-upgrade-${index + 1}`, ...effect })),
    ]),
  };
}
