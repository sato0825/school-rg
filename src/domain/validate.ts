import {
  ContentRegistrySchema,
  RunStateSchema,
  type ContentRegistry,
  type RunState,
} from "./schema.js";

export type ValidationIssue = {
  code: "SCHEMA_INVALID" | "DUPLICATE_ID" | "UNKNOWN_REFERENCE" | "INVALID_STATE";
  path: string;
  message: string;
};

export class DomainValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join("\n"));
    this.name = "DomainValidationError";
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: readonly { path: PropertyKey[]; message: string }[] } } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new DomainValidationError(result.error.issues.map((issue) => ({
    code: "SCHEMA_INVALID",
    path: issue.path.join("."),
    message: issue.message,
  })));
}

function collectUnique<T extends { id: string }>(items: T[], path: string, issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();
  items.forEach(({ id }, index) => {
    if (ids.has(id)) issues.push({ code: "DUPLICATE_ID", path: `${path}.${index}.id`, message: `Duplicate ID: ${id}` });
    ids.add(id);
  });
  return ids;
}

function known(id: string, ids: Set<string>, path: string, issues: ValidationIssue[]): void {
  if (!ids.has(id)) issues.push({ code: "UNKNOWN_REFERENCE", path, message: `Unregistered ID: ${id}` });
}

export function parseContentRegistry(value: unknown): ContentRegistry {
  const content = parse(ContentRegistrySchema, value);
  const issues: ValidationIssue[] = [];
  const effects = collectUnique(content.effects, "effects", issues);
  const cards = collectUnique(content.cards, "cards", issues);
  const intents = collectUnique(content.intents, "intents", issues);
  collectUnique(content.enemies, "enemies", issues);
  const relics = collectUnique(content.relics, "relics", issues);
  collectUnique(content.potions, "potions", issues);
  collectUnique(content.clubs, "clubs", issues);

  content.cards.forEach((card, i) => card.effectIds.forEach((effectId, j) => known(effectId, effects, `cards.${i}.effectIds.${j}`, issues)));
  content.intents.forEach((intent, i) => intent.effectIds.forEach((effectId, j) => known(effectId, effects, `intents.${i}.effectIds.${j}`, issues)));
  content.enemies.forEach((enemy, i) => enemy.intentIds.forEach((intentId, j) => known(intentId, intents, `enemies.${i}.intentIds.${j}`, issues)));
  content.relics.forEach((relic, i) => relic.effectIds.forEach((effectId, j) => known(effectId, effects, `relics.${i}.effectIds.${j}`, issues)));
  content.potions.forEach((potion, i) => potion.effectIds.forEach((effectId, j) => known(effectId, effects, `potions.${i}.effectIds.${j}`, issues)));
  content.clubs.forEach((club, i) => {
    club.starterCardIds.forEach((cardId, j) => known(cardId, cards, `clubs.${i}.starterCardIds.${j}`, issues));
    club.cardPoolIds.forEach((cardId, j) => known(cardId, cards, `clubs.${i}.cardPoolIds.${j}`, issues));
    if (club.startingRelicId) known(club.startingRelicId, relics, `clubs.${i}.startingRelicId`, issues);
  });
  if (issues.length) throw new DomainValidationError(issues);
  return content;
}

export function parseRunState(value: unknown, content: ContentRegistry): RunState {
  // Revalidate the supplied registry; callers cannot bypass reference checks by
  // casting an arbitrary object to ContentRegistry.
  parseContentRegistry(content);
  const run = parse(RunStateSchema, value);
  const issues: ValidationIssue[] = [];
  const cards = new Set(content.cards.map(({ id }) => id));
  const clubs = new Set(content.clubs.map(({ id }) => id));
  const relics = new Set(content.relics.map(({ id }) => id));
  const potions = new Set(content.potions.map(({ id }) => id));
  const enemies = new Map(content.enemies.map((enemy) => [enemy.id, enemy]));
  known(run.clubId, clubs, "clubId", issues);
  run.relicIds.forEach((id, i) => known(id, relics, `relicIds.${i}`, issues));
  run.potionIds.forEach((id, i) => known(id, potions, `potionIds.${i}`, issues));
  if (run.player.hp > run.player.maxHp) issues.push({ code: "INVALID_STATE", path: "player.hp", message: "HP exceeds maximum" });

  const seenDeck = new Set<string>();
  run.deck.forEach((card, i) => {
    known(card.cardId, cards, `deck.${i}.cardId`, issues);
    if (seenDeck.has(card.instanceId)) issues.push({ code: "DUPLICATE_ID", path: `deck.${i}.instanceId`, message: `Duplicate card instance: ${card.instanceId}` });
    seenDeck.add(card.instanceId);
  });

  const mapIds = collectUnique(run.map.nodes, "map.nodes", issues);
  known(run.map.currentNodeId, mapIds, "map.currentNodeId", issues);
  run.map.nodes.forEach((node, i) => node.nextIds.forEach((nextId, j) => known(nextId, mapIds, `map.nodes.${i}.nextIds.${j}`, issues)));

  if (run.combat) {
    const combat = run.combat;
    const instanceIds = new Set<string>();
    combat.cards.forEach((card, i) => {
      known(card.cardId, cards, `combat.cards.${i}.cardId`, issues);
      if (instanceIds.has(card.instanceId)) issues.push({ code: "DUPLICATE_ID", path: `combat.cards.${i}.instanceId`, message: `Duplicate card instance: ${card.instanceId}` });
      instanceIds.add(card.instanceId);
    });
    const located = new Set<string>();
    for (const [pileName, pile] of Object.entries({ drawPile: combat.drawPile, hand: combat.hand, discardPile: combat.discardPile, exhaustPile: combat.exhaustPile })) {
      pile.forEach((instanceId, i) => {
        known(instanceId, instanceIds, `combat.${pileName}.${i}`, issues);
        if (located.has(instanceId)) issues.push({ code: "INVALID_STATE", path: `combat.${pileName}.${i}`, message: `Card appears in multiple piles: ${instanceId}` });
        located.add(instanceId);
      });
    }
    combat.cards.forEach((card, i) => {
      if (!located.has(card.instanceId)) issues.push({ code: "INVALID_STATE", path: `combat.cards.${i}.instanceId`, message: `Card is not in any pile: ${card.instanceId}` });
    });
    const hand = new Set(combat.hand);
    combat.typing.candidateCardInstanceIds.forEach((instanceId, i) => known(instanceId, hand, `combat.typing.candidateCardInstanceIds.${i}`, issues));
    if (combat.typing.selectedCardInstanceId) known(combat.typing.selectedCardInstanceId, hand, "combat.typing.selectedCardInstanceId", issues);
    const enemyInstanceIds = new Set<string>();
    combat.enemies.forEach((enemy, i) => {
      if (enemyInstanceIds.has(enemy.instanceId)) issues.push({ code: "DUPLICATE_ID", path: `combat.enemies.${i}.instanceId`, message: `Duplicate enemy instance: ${enemy.instanceId}` });
      enemyInstanceIds.add(enemy.instanceId);
      const definition = enemies.get(enemy.enemyId);
      if (!definition) known(enemy.enemyId, new Set(enemies.keys()), `combat.enemies.${i}.enemyId`, issues);
      else {
        known(enemy.intentId, new Set(definition.intentIds), `combat.enemies.${i}.intentId`, issues);
        enemy.intentHistoryIds.forEach((intentId, j) => known(intentId, new Set(definition.intentIds), `combat.enemies.${i}.intentHistoryIds.${j}`, issues));
      }
      if (enemy.hp > enemy.maxHp) issues.push({ code: "INVALID_STATE", path: `combat.enemies.${i}.hp`, message: "HP exceeds maximum" });
    });
    if (combat.typing.targetEnemyInstanceId) known(combat.typing.targetEnemyInstanceId, enemyInstanceIds, "combat.typing.targetEnemyInstanceId", issues);
    Object.keys(combat.statuses.enemies).forEach((instanceId) => known(instanceId, enemyInstanceIds, `combat.statuses.enemies.${instanceId}`, issues));
  }
  if (issues.length) throw new DomainValidationError(issues);
  return run;
}
