import { settleHandAtTurnEnd, type CardDisposition } from "./card-piles.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { CombatState, ContentRegistry } from "./schema.js";

export type CardKeyword = "retain" | "ethereal" | "innate" | "exhaust";
export type CardLifecycleEvent = { instanceId: string; kind: "innate" | "retained" | "discarded" | "exhausted" };

function keywordsFor(combat: CombatState, content: ContentRegistry, instanceId: string): ReadonlySet<string> {
  const instance = combat.cards.find((card) => card.instanceId === instanceId);
  if (!instance) throw new RangeError(`unknown card instance: ${instanceId}`);
  const definition = content.cards.find((card) => card.id === instance.cardId);
  if (!definition) throw new RangeError(`unknown card definition: ${instance.cardId}`);
  return new Set(definition.keywordIds);
}

export function cardHasKeyword(combat: CombatState, content: ContentRegistry, instanceId: string, keyword: CardKeyword): boolean {
  return keywordsFor(combat, content, instanceId).has(keyword);
}

export function dispositionForCard(combat: CombatState, content: ContentRegistry, config: GameConfig, instanceId: string): CardDisposition {
  const keywords = keywordsFor(combat, content, instanceId);
  const retain = keywords.has("retain");
  const ethereal = keywords.has("ethereal");
  if (retain && ethereal) return requireSetting(config.etherealRetainPriority) === "ethereal" ? "exhaust" : "retain";
  if (ethereal) return "exhaust";
  return retain ? "retain" : "discard";
}

/** Innate cards are pulled from the draw pile in top-to-bottom order. */
export function prepareOpeningHand(
  combat: CombatState,
  content: ContentRegistry,
  maxHandSize: number | null = null,
): { combat: CombatState; innateIds: string[]; events: CardLifecycleEvent[] } {
  if (combat.turn !== 1 || combat.phase !== "PLAYER_START") throw new Error("Innate is prepared only at the first turn start");
  if (maxHandSize !== null && (!Number.isSafeInteger(maxHandSize) || maxHandSize < 1 || combat.hand.length > maxHandSize)) {
    throw new RangeError("invalid hand limit");
  }
  const innateIds = [...combat.drawPile].reverse().filter((id) => cardHasKeyword(combat, content, id, "innate"))
    .slice(0, maxHandSize === null ? undefined : maxHandSize - combat.hand.length);
  if (innateIds.length === 0) return { combat, innateIds, events: [] };
  const innateSet = new Set(innateIds);
  const hand = [...combat.hand, ...innateIds];
  return {
    combat: {
      ...combat,
      drawPile: combat.drawPile.filter((id) => !innateSet.has(id)),
      hand,
      typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null },
    },
    innateIds,
    events: innateIds.map((instanceId) => ({ instanceId, kind: "innate" })),
  };
}

/** Exhaust is applied when the card is used, not merely held at turn end. */
export function destinationAfterUse(combat: CombatState, content: ContentRegistry, instanceId: string): "discard" | "exhaust" {
  return cardHasKeyword(combat, content, instanceId, "exhaust") ? "exhaust" : "discard";
}

export function settleHandWithKeywords(
  combat: CombatState,
  content: ContentRegistry,
  config: GameConfig,
): { combat: CombatState; events: CardLifecycleEvent[] } {
  const events: CardLifecycleEvent[] = [];
  const dispositionFor = (instanceId: string): CardDisposition => {
    const disposition = dispositionForCard(combat, content, config, instanceId);
    events.push({ instanceId, kind: disposition === "retain" ? "retained" : disposition === "exhaust" ? "exhausted" : "discarded" });
    return disposition;
  };
  return { combat: settleHandAtTurnEnd(combat, dispositionFor), events };
}
