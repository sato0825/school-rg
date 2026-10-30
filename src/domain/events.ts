import { randomInt } from "./random.js";
import { DEFAULT_GAME_CONFIG, requireSetting, type GameConfig } from "./config.js";
import { collectPotion } from "./potions.js";
import { acquireRelic } from "./relic-hooks.js";
import type { ContentRegistry, EventChoice, EventCondition, EventDefinition, RunState } from "./schema.js";

export type EventPools = Readonly<Record<1 | 2 | 3, readonly string[]>>;

function nextDeckInstanceId(run: RunState): string {
  const existing = new Set(run.deck.map((card) => card.instanceId));
  let index = run.deck.length + 1;
  while (existing.has(`deck-${index}`)) index++;
  return `deck-${index}`;
}

export function eventConditionMet(run: RunState, condition: EventCondition, config: GameConfig = DEFAULT_GAME_CONFIG): boolean {
  switch (condition.kind) {
    case "gold_at_least": return run.gold >= condition.amount;
    case "hp_at_most_percent": return run.player.hp * 100 <= run.player.maxHp * condition.percent;
    case "has_card": return run.deck.some((card) => card.cardId === condition.cardId);
    case "potion_slot_available": return run.potionIds.length < requireSetting(config.potionSlots);
  }
}

export function availableEventChoices(run: RunState, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): { choice: EventChoice; available: boolean }[] {
  if (!run.event) throw new Error("no active event");
  const definition = content.events.find((event) => event.id === run.event!.eventId);
  if (!definition) throw new RangeError(`unknown event: ${run.event.eventId}`);
  return definition.choices.map((choice) => ({ choice, available: choice.requires.every((condition) => eventConditionMet(run, condition, config)) }));
}

export function openRandomEvent(run: RunState, content: ContentRegistry, eventIds?: readonly string[]): RunState {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (node?.kind !== "event" || run.combat || run.shop || run.event) throw new Error("expected unopened event node outside combat");
  const pool = eventIds ?? content.events.map((event) => event.id);
  if (pool.length === 0) throw new RangeError("event pool is empty");
  if (new Set(pool).size !== pool.length || pool.some((id) => !content.events.some((event) => event.id === id))) {
    throw new RangeError("event pool contains duplicate or unknown IDs");
  }
  const draw = randomInt(run.rngState, pool.length);
  const definition = content.events.find((event) => event.id === pool[draw.value])!;
  return { ...run, rngState: draw.state, event: { nodeId: node.id, eventId: definition.id, choiceId: null, pendingCombat: false } };
}

export function activeEvent(run: RunState, content: ContentRegistry): EventDefinition {
  if (!run.event) throw new Error("no active event");
  const definition = content.events.find((event) => event.id === run.event!.eventId);
  if (!definition) throw new RangeError(`unknown event: ${run.event.eventId}`);
  return definition;
}

/** Applies noncombat effects in order; a final battle effect is returned for the run layer. */
export function resolveEventChoice(run: RunState, choiceId: string, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): { run: RunState; battleEnemyId: string | null } {
  if (!run.event || run.event.choiceId || run.event.pendingCombat || run.combat) throw new Error("event choice is not pending");
  const choice = activeEvent(run, content).choices.find((item) => item.id === choiceId);
  if (!choice) throw new RangeError(`unknown event choice: ${choiceId}`);
  if (!choice.requires.every((condition) => eventConditionMet(run, condition, config))) throw new RangeError(`event choice conditions are not met: ${choiceId}`);
  let current = run;
  let battleEnemyId: string | null = null;
  for (const effect of choice.effects) {
    switch (effect.kind) {
      case "gold": {
        const gold = current.gold + effect.amount;
        if (!Number.isSafeInteger(gold) || gold < 0) throw new RangeError("event gold effect is unaffordable or overflows");
        current = { ...current, gold };
        break;
      }
      case "hp": {
        const hp = Math.min(current.player.maxHp, current.player.hp + effect.amount);
        if (!Number.isSafeInteger(hp) || hp < 0) throw new RangeError("event HP effect is invalid");
        current = { ...current, player: { ...current.player, hp } };
        break;
      }
      case "add_card": {
        if (!content.cards.some((card) => card.id === effect.cardId)) throw new RangeError(`unknown event card: ${effect.cardId}`);
        current = { ...current, deck: [...current.deck, { instanceId: nextDeckInstanceId(current), cardId: effect.cardId, upgraded: false }] };
        break;
      }
      case "add_relic": {
        current = acquireRelic(current, effect.relicId, content);
        break;
      }
      case "add_potion": {
        current = collectPotion(current, effect.potionId, content, config);
        break;
      }
      case "battle": {
        if (battleEnemyId) throw new Error("event choice cannot start two battles");
        if (!content.enemies.some((enemy) => enemy.id === effect.enemyId)) throw new RangeError(`unknown event enemy: ${effect.enemyId}`);
        battleEnemyId = effect.enemyId;
        break;
      }
    }
  }
  return { run: { ...current, event: { ...current.event!, choiceId, pendingCombat: Boolean(battleEnemyId) } }, battleEnemyId };
}
