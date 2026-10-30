import { shuffle, type RandomState } from "./random.js";
import type { CombatState } from "./schema.js";

export type CardDisposition = "retain" | "discard" | "exhaust";

function resetTyping(hand: readonly string[]): CombatState["typing"] {
  return {
    buffer: "",
    candidateCardInstanceIds: [...hand],
    selectedCardInstanceId: null,
    progress: 0,
    targetEnemyInstanceId: null,
  };
}

/** The last drawPile element is the top card. No draw occurs implicitly. */
export function drawCards(
  combat: CombatState,
  rngState: RandomState,
  count: number,
  maxHandSize: number | null = null,
): { combat: CombatState; rngState: RandomState; drawnIds: string[] } {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("draw count must be a nonnegative integer");
  if (maxHandSize !== null && (!Number.isSafeInteger(maxHandSize) || maxHandSize < 1 || combat.hand.length > maxHandSize)) {
    throw new RangeError("invalid hand limit");
  }
  let currentRngState = rngState;
  let drawPile = [...combat.drawPile];
  let discardPile = [...combat.discardPile];
  const hand = [...combat.hand];
  const drawnIds: string[] = [];
  for (let index = 0; index < count; index++) {
    if (maxHandSize !== null && hand.length >= maxHandSize) break;
    if (drawPile.length === 0 && discardPile.length > 0) {
      const shuffled = shuffle(currentRngState, discardPile);
      currentRngState = shuffled.state;
      drawPile = shuffled.items;
      discardPile = [];
    }
    const instanceId = drawPile.pop();
    if (!instanceId) break;
    hand.push(instanceId);
    drawnIds.push(instanceId);
  }
  return {
    combat: { ...combat, drawPile, discardPile, hand, typing: drawnIds.length ? resetTyping(hand) : combat.typing },
    rngState: currentRngState,
    drawnIds,
  };
}

export function moveCardFromHand(
  combat: CombatState,
  instanceId: string,
  destination: "discard" | "exhaust",
): CombatState {
  const index = combat.hand.indexOf(instanceId);
  if (index < 0) throw new RangeError(`card is not in hand: ${instanceId}`);
  const hand = combat.hand.filter((_, position) => position !== index);
  return {
    ...combat,
    hand,
    discardPile: destination === "discard" ? [...combat.discardPile, instanceId] : combat.discardPile,
    exhaustPile: destination === "exhaust" ? [...combat.exhaustPile, instanceId] : combat.exhaustPile,
    typing: resetTyping(hand),
  };
}

/** Call at player turn end; keyword/effect rules supply each card's disposition. */
export function settleHandAtTurnEnd(
  combat: CombatState,
  dispositionFor: (instanceId: string) => CardDisposition,
): CombatState {
  const hand: string[] = [];
  const discardPile = [...combat.discardPile];
  const exhaustPile = [...combat.exhaustPile];
  for (const instanceId of combat.hand) {
    const disposition = dispositionFor(instanceId);
    if (disposition === "retain") hand.push(instanceId);
    else if (disposition === "discard") discardPile.push(instanceId);
    else if (disposition === "exhaust") exhaustPile.push(instanceId);
    else throw new RangeError(`unknown card disposition: ${String(disposition)}`);
  }
  return { ...combat, hand, discardPile, exhaustPile, typing: resetTyping(hand) };
}
