import { selectEnemyIntent, type EnemyAiRegistry } from "./enemy-ai.js";
import { availableNextNodes, generateRunMap, moveToConnectedNode, type MapGenerationOptions } from "./map-generation.js";
import { randomInt, shuffle } from "./random.js";
import type { CombatState, ContentRegistry, MapNode, RunState } from "./schema.js";
import { createTypingState } from "./typing.js";
import { parseRunState } from "./validate.js";

export type RunScreen = "map" | "combat" | "reward" | "won" | "lost";
export type EncounterTable = Readonly<Record<"combat" | "elite" | "boss", readonly string[]>>;
export type RunSession = {
  run: RunState;
  screen: RunScreen;
  completedNodeIds: readonly string[];
  rewardCardIds: readonly string[];
};

function currentNode(run: RunState): MapNode {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new RangeError(`unknown current node: ${run.map.currentNodeId}`);
  return node;
}

export function createRunSession(seed: number, clubId: string, content: ContentRegistry, mapOptions?: MapGenerationOptions): RunSession {
  const club = content.clubs.find((item) => item.id === clubId);
  if (!club) throw new RangeError(`unknown club: ${clubId}`);
  const map = generateRunMap(seed, mapOptions);
  const deck = club.starterCardIds.map((cardId, index) => ({ instanceId: `deck-${index + 1}`, cardId, upgraded: false }));
  const run = parseRunState({
    schemaVersion: 1, seed, rngState: map.rngState, clubId, act: 1,
    player: { hp: club.startingHp, maxHp: club.startingHp, block: 0 },
    deck, relicIds: club.startingRelicId ? [club.startingRelicId] : [], potionIds: [],
    map: { nodes: map.nodes, currentNodeId: map.currentNodeId }, combat: null,
  }, content);
  return { run, screen: "map", completedNodeIds: [map.currentNodeId], rewardCardIds: [] };
}

export function availableRunNodes(session: RunSession): MapNode[] {
  if (session.screen !== "map" || !session.completedNodeIds.includes(session.run.map.currentNodeId)) return [];
  return availableNextNodes(session.run.map);
}

function createEncounter(run: RunState, enemyId: string, content: ContentRegistry, ai: EnemyAiRegistry): RunState {
  const definition = content.enemies.find((item) => item.id === enemyId);
  if (!definition) throw new RangeError(`unknown encounter enemy: ${enemyId}`);
  const cards = run.deck.map((card, index) => ({ ...card, instanceId: `combat-${index + 1}` }));
  const shuffled = shuffle(run.rngState, cards.map((card) => card.instanceId));
  const enemyInstanceId = "enemy-1";
  const combat: CombatState = {
    phase: "PLAYER_START", turn: 1, cards, drawPile: shuffled.items,
    hand: [], discardPile: [], exhaustPile: [], resolvingPile: [],
    enemies: [{ instanceId: enemyInstanceId, enemyId, hp: definition.maxHp, maxHp: definition.maxHp, block: 0, intentId: definition.intentIds[0]!, intentHistoryIds: [] }],
    typing: createTypingState([]), clock: { remainingMs: 0, lastEventAtMs: 0, paused: false }, nextTurnBonusMs: 0,
    statuses: { player: {}, enemies: {} },
  };
  return selectEnemyIntent({ ...run, rngState: shuffled.state, player: { ...run.player, block: 0 }, combat }, enemyInstanceId, ai, content, 1);
}

export function enterRunNode(session: RunSession, nextNodeId: string, content: ContentRegistry, ai: EnemyAiRegistry, encounters: EncounterTable): RunSession {
  if (session.screen !== "map") throw new Error("expected map screen");
  const next = availableRunNodes(session).find((node) => node.id === nextNodeId);
  if (!next) throw new RangeError(`node is not available: ${nextNodeId}`);
  if (next.kind === "start") {
    const moved = moveToConnectedNode(session.run, next.id);
    return { ...session, run: moved, completedNodeIds: [...session.completedNodeIds, next.id] };
  }
  if (next.kind !== "combat" && next.kind !== "elite" && next.kind !== "boss") {
    throw new Error(`node kind ${next.kind} requires its own system before entry`);
  }
  const pool = encounters[next.kind];
  if (!pool.length) throw new RangeError(`empty encounter pool for ${next.kind}`);
  const draw = randomInt(session.run.rngState, pool.length);
  const enemyId = pool[draw.value]!;
  const moved = moveToConnectedNode({ ...session.run, rngState: draw.state }, next.id);
  return { ...session, run: createEncounter(moved, enemyId, content, ai), screen: "combat", rewardCardIds: [] };
}

export function settleRunCombat(session: RunSession, content: ContentRegistry): RunSession {
  if (session.screen !== "combat" || !session.run.combat) throw new Error("expected active combat");
  if (session.run.combat.phase === "LOST") return { ...session, screen: "lost" };
  if (session.run.combat.phase !== "WON") throw new Error("combat has not ended");
  const node = currentNode(session.run);
  const club = content.clubs.find((item) => item.id === session.run.clubId);
  if (!club) throw new RangeError(`unknown club: ${session.run.clubId}`);
  const shuffled = shuffle(session.run.rngState, [...new Set(club.cardPoolIds)]);
  const rewardCardIds = shuffled.items.slice(0, 3);
  if (rewardCardIds.length === 0 && node.act !== 3) throw new RangeError("empty reward card pool");
  if (node.kind === "boss" && node.act === 3) {
    return { ...session, run: { ...session.run, rngState: shuffled.state, combat: null }, screen: "won", completedNodeIds: [...session.completedNodeIds, node.id], rewardCardIds: [] };
  }
  return { ...session, run: { ...session.run, rngState: shuffled.state }, screen: "reward", rewardCardIds };
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
