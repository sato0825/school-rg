import { selectEnemyIntent, type EnemyAiRegistry } from "./enemy-ai.js";
import { awardEncounterGold, buyShopCard, buyShopPotion, buyShopRelic, closeShop, DEFAULT_ECONOMY_OPTIONS, healAtRest, openShop, removeShopCard, upgradeAtRest, type EconomyOptions } from "./economy.js";
import { openRandomEvent, resolveEventChoice, type EventPools } from "./events.js";
import { DEFAULT_GAME_CONFIG, type GameConfig } from "./config.js";
import { availableNextNodes, generateRunMap, moveToConnectedNode, type MapGenerationOptions } from "./map-generation.js";
import { createRandomState, randomInt, shuffle } from "./random.js";
import type { CombatState, ContentRegistry, MapNode, RunState } from "./schema.js";
import { createTypingState } from "./typing.js";
import { parseRunState } from "./validate.js";
import { claimTreasure, leaveTreasure, openTreasure, type TreasureOptions, DEFAULT_TREASURE_OPTIONS } from "./treasure.js";
import { ascensionEnemyHp, ascensionStartingHp, assertAscensionLevel } from "./ascension.js";
import { generateCardRewards, type RewardGenerator } from "./card-rewards.js";

export type RunScreen = "map" | "combat" | "reward" | "shop" | "rest" | "event" | "treasure" | "won" | "lost";
export type EncounterCandidate = string | { readonly id: string; readonly enemyIds: readonly string[] };
export type EncounterPool = Readonly<Record<"combat" | "elite" | "boss", readonly EncounterCandidate[]>>;
export type EncounterSelectionPolicy = "uniform" | "cycle";
export type EncounterTable = EncounterPool | { readonly byAct: Readonly<Record<1 | 2 | 3, EncounterPool>>; readonly selectionPolicy?: EncounterSelectionPolicy };
export type RunContentTables = { readonly enemies: EncounterTable; readonly events?: EventPools };

function encounterPool(encounters: EncounterTable, act: number): EncounterPool {
  if (!("byAct" in encounters)) return encounters;
  if (act !== 1 && act !== 2 && act !== 3) throw new RangeError(`unknown encounter Act: ${act}`);
  return encounters.byAct[act];
}
export type RunSession = {
  /** UI-owned identity, preserved by saves so optional measurements cannot attach to a later run. */
  runId?: string;
  run: RunState;
  screen: RunScreen;
  completedNodeIds: readonly string[];
  rewardCardIds: readonly string[];
  /** Candidate IDs already drawn in the current Act/kind cycle. Older saves omit this. */
  encounterHistory?: Readonly<Record<string, readonly string[]>>;
};

function currentNode(run: RunState): MapNode {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new RangeError(`unknown current node: ${run.map.currentNodeId}`);
  return node;
}

export function createRunSession(seed: number, clubId: string, content: ContentRegistry, mapOptions?: MapGenerationOptions, economy: EconomyOptions = DEFAULT_ECONOMY_OPTIONS, ascensionLevel = 0): RunSession {
  const club = content.clubs.find((item) => item.id === clubId);
  if (!club) throw new RangeError(`unknown club: ${clubId}`);
  assertAscensionLevel(ascensionLevel);
  const map = generateRunMap(seed, mapOptions);
  const deck = club.starterCardIds.map((cardId, index) => ({ instanceId: `deck-${index + 1}`, cardId, upgraded: false }));
  const run = parseRunState({
    schemaVersion: 1, seed, rngState: map.rngState, clubId, act: 1, ascensionLevel,
    player: { hp: ascensionStartingHp(club.startingHp, ascensionLevel), maxHp: ascensionStartingHp(club.startingHp, ascensionLevel), block: 0 },
    deck, relicIds: club.startingRelicId ? [club.startingRelicId] : [], potionIds: club.startingPotionIds ?? [], gold: economy.startingGold, shop: null, event: null, treasure: null,
    map: { nodes: map.nodes, currentNodeId: map.currentNodeId }, combat: null,
  }, content);
  return { run, screen: "map", completedNodeIds: [map.currentNodeId], rewardCardIds: [], encounterHistory: {} };
}

export function availableRunNodes(session: RunSession): MapNode[] {
  if (session.screen !== "map" || !session.completedNodeIds.includes(session.run.map.currentNodeId)) return [];
  return availableNextNodes(session.run.map);
}

function createEncounter(run: RunState, encounter: string | readonly string[], content: ContentRegistry, ai: EnemyAiRegistry): RunState {
  const enemyIds = typeof encounter === "string" ? [encounter] : encounter;
  if (enemyIds.length < 1 || enemyIds.length > 5) throw new RangeError("encounter must have 1–5 enemies");
  const definitions = enemyIds.map((enemyId) => {
    const definition = content.enemies.find((item) => item.id === enemyId);
    if (!definition) throw new RangeError(`unknown encounter enemy: ${enemyId}`);
    return definition;
  });
  const cards = run.deck.map((card, index) => ({ ...card, instanceId: `combat-${index + 1}` }));
  const shuffled = shuffle(run.rngState, cards.map((card) => card.instanceId));
  const combat: CombatState = {
    phase: "PLAYER_START", turn: 1, cards, drawPile: shuffled.items,
    hand: [], discardPile: [], exhaustPile: [], resolvingPile: [],
    enemies: definitions.map((definition, index) => ({
      instanceId: `enemy-${index + 1}`, enemyId: definition.id,
      hp: ascensionEnemyHp(definition.maxHp, run.ascensionLevel), maxHp: ascensionEnemyHp(definition.maxHp, run.ascensionLevel),
      block: 0, intentId: definition.intentIds[0]!, intentHistoryIds: [],
    })),
    typing: createTypingState([]), clock: { remainingMs: 0, lastEventAtMs: 0, paused: false }, nextTurnBonusMs: 0,
    statuses: { player: {}, enemies: {} },
  };
  let entered: RunState = { ...run, rngState: shuffled.state, player: { ...run.player, block: 0 }, combat };
  for (const enemy of combat.enemies) entered = selectEnemyIntent(entered, enemy.instanceId, ai, content, 1);
  return entered;
}

export function enterRunNode(session: RunSession, nextNodeId: string, content: ContentRegistry, ai: EnemyAiRegistry, tables: EncounterTable | RunContentTables, economy: EconomyOptions = DEFAULT_ECONOMY_OPTIONS, treasureOptions: TreasureOptions = DEFAULT_TREASURE_OPTIONS): RunSession {
  if (session.screen !== "map") throw new Error("expected map screen");
  const next = availableRunNodes(session).find((node) => node.id === nextNodeId);
  if (!next) throw new RangeError(`node is not available: ${nextNodeId}`);
  if (next.kind === "start") {
    const moved = moveToConnectedNode(session.run, next.id);
    return { ...session, run: moved, completedNodeIds: [...session.completedNodeIds, next.id] };
  }
  if (next.kind === "shop") {
    const moved = moveToConnectedNode(session.run, next.id);
    return { ...session, run: openShop(moved, content, economy), screen: "shop" };
  }
  if (next.kind === "rest") return { ...session, run: moveToConnectedNode(session.run, next.id), screen: "rest" };
  if (next.kind === "event") {
    const events = "enemies" in tables ? tables.events : undefined;
    if (events && next.act !== 1 && next.act !== 2 && next.act !== 3) throw new RangeError(`unknown event Act: ${next.act}`);
    const pool = events && (next.act === 1 || next.act === 2 || next.act === 3) ? events[next.act] : undefined;
    return { ...session, run: openRandomEvent(moveToConnectedNode(session.run, next.id), content, pool), screen: "event" };
  }
  if (next.kind === "treasure") return { ...session, run: openTreasure(moveToConnectedNode(session.run, next.id), content, treasureOptions), screen: "treasure" };
  if (next.kind !== "combat" && next.kind !== "elite" && next.kind !== "boss") {
    throw new Error(`node kind ${next.kind} requires its own system before entry`);
  }
  const encounters = "enemies" in tables ? tables.enemies : tables;
  const pool = encounterPool(encounters, next.act)[next.kind];
  if (!pool.length) throw new RangeError(`empty encounter pool for ${next.kind}`);
  const policy = "byAct" in encounters ? encounters.selectionPolicy ?? "uniform" : "uniform";
  const history = session.encounterHistory ?? {};
  const historyKey = `${next.act}:${next.kind}`;
  const seen = new Set(history[historyKey] ?? []);
  const available = policy === "cycle" ? pool.filter((candidate) => !seen.has(typeof candidate === "string" ? candidate : candidate.id)) : pool;
  const options = available.length ? available : pool;
  const draw = randomInt(session.run.rngState, options.length);
  const choice = options[draw.value]!;
  if (typeof choice !== "string" && !choice.id.trim()) throw new RangeError("encounter formation ID is empty");
  const enemyIds = typeof choice === "string" ? choice : choice.enemyIds;
  const moved = moveToConnectedNode({ ...session.run, rngState: draw.state }, next.id);
  const encounterHistory = policy === "cycle"
    ? { ...history, [historyKey]: [...(available.length ? history[historyKey] ?? [] : []), typeof choice === "string" ? choice : choice.id] }
    : history;
  return { ...session, run: createEncounter(moved, enemyIds, content, ai), screen: "combat", rewardCardIds: [], encounterHistory };
}

export function chooseRunTreasure(session: RunSession, offerId: string | null, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): RunSession {
  if (session.screen !== "treasure") throw new Error("expected treasure screen");
  const run = offerId === null ? leaveTreasure(session.run) : claimTreasure(session.run, offerId, content, config);
  return { ...session, run, screen: "map", completedNodeIds: [...session.completedNodeIds, run.map.currentNodeId] };
}

export function settleRunCombat(session: RunSession, content: ContentRegistry, economy: EconomyOptions = DEFAULT_ECONOMY_OPTIONS, rewardGenerator: RewardGenerator = generateCardRewards): RunSession {
  if (session.screen !== "combat" || !session.run.combat) throw new Error("expected active combat");
  if (session.run.combat.phase === "LOST") return { ...session, screen: "lost" };
  if (session.run.combat.phase !== "WON") throw new Error("combat has not ended");
  const node = currentNode(session.run);
  if (session.run.event?.pendingCombat) {
    return { ...session, run: { ...session.run, combat: null, event: null }, screen: "map", completedNodeIds: [...session.completedNodeIds, node.id] };
  }
  if (node.kind !== "combat" && node.kind !== "elite" && node.kind !== "boss") throw new Error("combat ended at a non-combat node");
  const rewardedRun = awardEncounterGold(session.run, node.kind, economy);
  const club = content.clubs.find((item) => item.id === session.run.clubId);
  if (!club) throw new RangeError(`unknown club: ${session.run.clubId}`);
  if (node.kind === "boss" && node.act === 3) {
    return { ...session, run: { ...rewardedRun, combat: null }, screen: "won", completedNodeIds: [...session.completedNodeIds, node.id], rewardCardIds: [] };
  }
  const offered = rewardGenerator(rewardedRun.rngState, club);
  if (offered.cardIds.length === 0) throw new RangeError("empty reward card pool");
  createRandomState(offered.state);
  if (new Set(offered.cardIds).size !== offered.cardIds.length || offered.cardIds.some((cardId) => !club.cardPoolIds.includes(cardId))) {
    throw new RangeError("reward generator returned duplicate or out-of-pool cards");
  }
  return { ...session, run: { ...rewardedRun, rngState: offered.state }, screen: "reward", rewardCardIds: offered.cardIds };
}

export function chooseRunEventChoice(session: RunSession, choiceId: string, content: ContentRegistry, ai: EnemyAiRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): RunSession {
  if (session.screen !== "event") throw new Error("expected event screen");
  const result = resolveEventChoice(session.run, choiceId, content, config);
  if (result.run.player.hp === 0) return { ...session, run: result.run, screen: "lost" };
  if (result.battleEnemyId) return { ...session, run: createEncounter(result.run, result.battleEnemyId, content, ai), screen: "combat" };
  const nodeId = result.run.map.currentNodeId;
  return { ...session, run: { ...result.run, event: null }, screen: "map", completedNodeIds: [...session.completedNodeIds, nodeId] };
}

export function chooseRunReward(session: RunSession, cardId: string | null): RunSession {
  if (session.screen !== "reward" || session.run.combat?.phase !== "WON") throw new Error("expected reward after victory");
  if (cardId !== null && !session.rewardCardIds.includes(cardId)) throw new RangeError(`card is not a reward choice: ${cardId}`);
  const existing = new Set(session.run.deck.map((card) => card.instanceId));
  let nextIndex = session.run.deck.length + 1;
  while (existing.has(`deck-${nextIndex}`)) nextIndex++;
  const deck = cardId === null ? session.run.deck : [...session.run.deck, { instanceId: `deck-${nextIndex}`, cardId, upgraded: false }];
  const nodeId = session.run.map.currentNodeId;
  return { ...session, run: { ...session.run, deck, combat: null }, screen: "map", completedNodeIds: [...session.completedNodeIds, nodeId], rewardCardIds: [] };
}

export function buyRunShopCard(session: RunSession, offerId: string): RunSession {
  if (session.screen !== "shop") throw new Error("expected shop screen");
  return { ...session, run: buyShopCard(session.run, offerId) };
}

export function buyRunShopRelic(session: RunSession, offerId: string, content: ContentRegistry): RunSession {
  if (session.screen !== "shop") throw new Error("expected shop screen");
  return { ...session, run: buyShopRelic(session.run, offerId, content) };
}

export function buyRunShopPotion(session: RunSession, offerId: string, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): RunSession {
  if (session.screen !== "shop") throw new Error("expected shop screen");
  return { ...session, run: buyShopPotion(session.run, offerId, content, config) };
}

export function removeRunShopCard(session: RunSession, cardInstanceId: string): RunSession {
  if (session.screen !== "shop") throw new Error("expected shop screen");
  return { ...session, run: removeShopCard(session.run, cardInstanceId) };
}

export function leaveRunShop(session: RunSession): RunSession {
  if (session.screen !== "shop") throw new Error("expected shop screen");
  const nodeId = session.run.map.currentNodeId;
  return { ...session, run: closeShop(session.run), screen: "map", completedNodeIds: [...session.completedNodeIds, nodeId] };
}

export function useRunRest(session: RunSession, action: { kind: "heal" } | { kind: "upgrade"; cardInstanceId: string }, economy: EconomyOptions = DEFAULT_ECONOMY_OPTIONS): RunSession {
  if (session.screen !== "rest") throw new Error("expected rest screen");
  const run = action.kind === "heal" ? healAtRest(session.run, economy) : upgradeAtRest(session.run, action.cardInstanceId);
  return { ...session, run, screen: "map", completedNodeIds: [...session.completedNodeIds, run.map.currentNodeId] };
}
