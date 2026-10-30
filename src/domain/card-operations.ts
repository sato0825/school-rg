import type { CombatState, ContentRegistry } from "./schema.js";

export type CardZone = "drawPile" | "hand" | "discardPile" | "exhaustPile" | "resolvingPile";
export type CardOperationEvent =
  | { kind: "created" | "duplicated"; instanceId: string; cardId: string; sourceInstanceId: string | null }
  | { kind: "moved"; instanceId: string; from: CardZone | null; to: CardZone }
  | { kind: "transformed"; instanceId: string; fromCardId: string; toCardId: string; upgraded: boolean }
  | { kind: "recovered"; instanceId: string; from: "discardPile" | "exhaustPile" };

export interface CardOperationPolicy {
  /** null means the unresolved hand limit is not enforced in this operation. */
  maxHandSize: number | null;
}

const zones: readonly CardZone[] = ["drawPile", "hand", "discardPile", "exhaustPile", "resolvingPile"];

function assertPolicy(policy: CardOperationPolicy): void {
  if (policy.maxHandSize !== null && (!Number.isSafeInteger(policy.maxHandSize) || policy.maxHandSize < 1)) {
    throw new RangeError("maxHandSize must be a positive integer or null");
  }
}

function checkHandCapacity(combat: CombatState, destination: CardZone, policy: CardOperationPolicy): void {
  assertPolicy(policy);
  if (destination === "hand" && policy.maxHandSize !== null && combat.hand.length >= policy.maxHandSize) {
    throw new RangeError("hand limit reached");
  }
}

function resetTyping(combat: CombatState, hand: readonly string[]): CombatState["typing"] {
  return {
    ...combat.typing,
    buffer: "",
    candidateCardInstanceIds: [...hand],
    selectedCardInstanceId: null,
    progress: 0,
    targetEnemyInstanceId: null,
  };
}

export function cardZone(combat: CombatState, instanceId: string): CardZone {
  if (!combat.cards.some((card) => card.instanceId === instanceId)) throw new RangeError(`unknown card instance: ${instanceId}`);
  const found = zones.filter((zone) => combat[zone].includes(instanceId));
  if (found.length !== 1) throw new Error(`card must appear in exactly one zone: ${instanceId}`);
  return found[0]!;
}

function placeNewCard(combat: CombatState, instanceId: string, destination: CardZone, policy: CardOperationPolicy): CombatState {
  checkHandCapacity(combat, destination, policy);
  const hand = destination === "hand" ? [...combat.hand, instanceId] : combat.hand;
  return {
    ...combat,
    [destination]: [...combat[destination], instanceId],
    typing: destination === "hand" ? resetTyping(combat, hand) : combat.typing,
  };
}

export function moveCombatCard(
  combat: CombatState,
  instanceId: string,
  destination: CardZone,
  policy: CardOperationPolicy,
): { combat: CombatState; events: CardOperationEvent[] } {
  const from = cardZone(combat, instanceId);
  assertPolicy(policy);
  if (from === destination) return { combat, events: [] };
  checkHandCapacity(combat, destination, policy);
  const withoutSource = combat[from].filter((id) => id !== instanceId);
  const hand = from === "hand" ? withoutSource : destination === "hand" ? [...combat.hand, instanceId] : combat.hand;
  const updated = {
    ...combat,
    [from]: withoutSource,
    [destination]: [...combat[destination], instanceId],
    typing: from === "hand" || destination === "hand" ? resetTyping(combat, hand) : combat.typing,
  };
  return { combat: updated, events: [{ kind: "moved", instanceId, from, to: destination }] };
}

function nextInstanceId(combat: CombatState): string {
  const used = new Set(combat.cards.map((card) => card.instanceId));
  let index = 1;
  while (used.has(`created-${index}`)) index++;
  if (!Number.isSafeInteger(index)) throw new RangeError("card instance IDs exhausted");
  return `created-${index}`;
}

function requireCardDefinition(content: ContentRegistry, cardId: string): void {
  if (!content.cards.some((card) => card.id === cardId)) throw new RangeError(`unknown card definition: ${cardId}`);
}

export function createCombatCard(
  combat: CombatState,
  content: ContentRegistry,
  cardId: string,
  upgraded: boolean,
  destination: CardZone,
  policy: CardOperationPolicy,
): { combat: CombatState; instanceId: string; events: CardOperationEvent[] } {
  requireCardDefinition(content, cardId);
  const instanceId = nextInstanceId(combat);
  const withCard = { ...combat, cards: [...combat.cards, { instanceId, cardId, upgraded }] };
  return {
    combat: placeNewCard(withCard, instanceId, destination, policy),
    instanceId,
    events: [
      { kind: "created", instanceId, cardId, sourceInstanceId: null },
      { kind: "moved", instanceId, from: null, to: destination },
    ],
  };
}

export function duplicateCombatCard(
  combat: CombatState,
  sourceInstanceId: string,
  destination: CardZone,
  policy: CardOperationPolicy,
): { combat: CombatState; instanceId: string; events: CardOperationEvent[] } {
  cardZone(combat, sourceInstanceId);
  const source = combat.cards.find((card) => card.instanceId === sourceInstanceId)!;
  const instanceId = nextInstanceId(combat);
  const withCard = { ...combat, cards: [...combat.cards, { ...source, instanceId }] };
  return {
    combat: placeNewCard(withCard, instanceId, destination, policy),
    instanceId,
    events: [
      { kind: "duplicated", instanceId, cardId: source.cardId, sourceInstanceId },
      { kind: "moved", instanceId, from: null, to: destination },
    ],
  };
}

export function transformCombatCard(
  combat: CombatState,
  content: ContentRegistry,
  instanceId: string,
  cardId: string,
  upgraded: boolean,
): { combat: CombatState; events: CardOperationEvent[] } {
  const zone = cardZone(combat, instanceId);
  requireCardDefinition(content, cardId);
  const source = combat.cards.find((card) => card.instanceId === instanceId)!;
  const cards = combat.cards.map((card) => card.instanceId === instanceId ? { ...card, cardId, upgraded } : card);
  return {
    combat: { ...combat, cards, typing: zone === "hand" ? resetTyping(combat, combat.hand) : combat.typing },
    events: [{ kind: "transformed", instanceId, fromCardId: source.cardId, toCardId: cardId, upgraded }],
  };
}

export function recoverCombatCard(
  combat: CombatState,
  instanceId: string,
  destination: "hand" | "drawPile",
  policy: CardOperationPolicy,
): { combat: CombatState; events: CardOperationEvent[] } {
  const from = cardZone(combat, instanceId);
  if (from !== "discardPile" && from !== "exhaustPile") throw new RangeError(`card cannot be recovered from ${from}`);
  const moved = moveCombatCard(combat, instanceId, destination, policy);
  return { combat: moved.combat, events: [...moved.events, { kind: "recovered", instanceId, from }] };
}
