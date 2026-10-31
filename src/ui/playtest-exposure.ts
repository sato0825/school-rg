import { availableEventChoices } from "../domain/events.js";
import type { GameConfig } from "../domain/config.js";
import type { RunSession } from "../domain/run-flow.js";
import type { ContentRegistry, RunState } from "../domain/schema.js";
import { recordPlaytestContent, type PlaytestContentEvent, type PlaytestTracker } from "./playtest-metrics.js";

type EventInput = Omit<PlaytestContentEvent, "atActiveMs" | "eventId" | "nodeId" | "act">;

function currentNode(run: RunState): { id: string; act: number } {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new RangeError("playtest content node is missing");
  return node;
}

function eventId(nodeId: string, input: EventInput, ordinal: number | null = null): string {
  return JSON.stringify([nodeId, input.source, input.kind, input.action, input.offerId, input.contentId, ordinal]);
}

export function recordContentChoice(tracker: PlaytestTracker, run: RunState, input: EventInput, ordinal: number | null = null): PlaytestTracker {
  const node = currentNode(run);
  return recordPlaytestContent(tracker, { ...input, eventId: eventId(node.id, input, ordinal), nodeId: node.id, act: node.act });
}

/** Called when a choice screen is entered or restored; IDs prevent redraws from inflating exposure. */
export function recordContentOffers(tracker: PlaytestTracker, session: RunSession, content: ContentRegistry, config: GameConfig): PlaytestTracker {
  const { run } = session;
  let current = tracker;
  const offered = (input: Omit<EventInput, "action">) => { current = recordContentChoice(current, run, { ...input, action: "offered" }); };
  if (session.screen === "reward") {
    for (const cardId of session.rewardCardIds) offered({ source: "reward", kind: "card", offerId: cardId, contentId: cardId, available: true });
  } else if (session.screen === "treasure" && run.treasure) {
    for (const offer of run.treasure.offers) offered({ source: "treasure", kind: offer.kind, offerId: offer.offerId, contentId: offer.contentId, available: true });
  } else if (session.screen === "shop" && run.shop) {
    for (const offer of run.shop.offers) offered({ source: "shop", kind: "card", offerId: offer.offerId, contentId: offer.cardId, available: null });
    for (const offer of run.shop.relicOffers) offered({ source: "shop", kind: "relic", offerId: offer.offerId, contentId: offer.contentId, available: null });
    for (const offer of run.shop.potionOffers) offered({ source: "shop", kind: "potion", offerId: offer.offerId, contentId: offer.contentId, available: null });
  } else if (session.screen === "event" && run.event) {
    for (const { choice, available } of availableEventChoices(run, content, config)) {
      offered({ source: "event", kind: "event_choice", offerId: choice.id, contentId: run.event.eventId, available });
    }
  }
  return current;
}

function additions(before: readonly string[], after: readonly string[]): string[] {
  const remaining = new Map<string, number>();
  for (const id of before) remaining.set(id, (remaining.get(id) ?? 0) + 1);
  return after.filter((id) => {
    const count = remaining.get(id) ?? 0;
    if (!count) return true;
    remaining.set(id, count - 1);
    return false;
  });
}

/** Actual state differences, not a clicked button, define what was acquired. */
export function recordContentAcquisitions(tracker: PlaytestTracker, before: RunState, after: RunState,
  source: "reward" | "treasure" | "shop" | "event", offerId: string | null): PlaytestTracker {
  let current = tracker;
  const added: Array<{ kind: "card" | "relic" | "potion"; id: string }> = [
    ...additions(before.deck.map((card) => card.instanceId), after.deck.map((card) => card.instanceId))
      .map((instanceId) => ({ kind: "card" as const, id: after.deck.find((card) => card.instanceId === instanceId)!.cardId })),
    ...additions(before.relicIds, after.relicIds).map((id) => ({ kind: "relic" as const, id })),
    ...additions(before.potionIds, after.potionIds).map((id) => ({ kind: "potion" as const, id })),
  ];
  for (const [index, item] of added.entries()) {
    current = recordContentChoice(current, after, { source, kind: item.kind, action: "acquired", offerId, contentId: item.id, available: null }, index);
  }
  return current;
}

/** Potion use has a stable combat-log position; discards are tracked separately by the caller. */
export function recordCombatPotionUses(tracker: PlaytestTracker, before: RunState, after: RunState): PlaytestTracker {
  if (!before.combat || !after.combat || before.map.currentNodeId !== after.map.currentNodeId) return tracker;
  const previousCount = before.combat.actionLog?.length ?? 0;
  let current = tracker;
  for (const [offset, entry] of (after.combat.actionLog ?? []).slice(previousCount).entries()) {
    if (entry.kind !== "potion") continue;
    current = recordContentChoice(current, after, { source: "combat", kind: "potion", action: "consumed",
      offerId: null, contentId: entry.actionId, available: null }, previousCount + offset);
  }
  return current;
}
