import type { CombatActionLogEntry, CombatState, RunState } from "./schema.js";

type Action = Pick<CombatActionLogEntry, "kind" | "actionId" | "actorEnemyInstanceId" | "targetEnemyInstanceId">
  & Partial<Pick<CombatActionLogEntry, "relicTrigger" | "relicRuleId" | "relicStacks" | "sourceCardInstanceId" | "triggerHpLost">>;

export const TURN_BOUNDARIES = ["player-start", "player-input-end", "player-end", "enemy-start", "enemy-end"] as const;
export type TurnBoundary = typeof TURN_BOUNDARIES[number];

export function recordTurnBoundary(before: RunState, after: RunState, boundary: TurnBoundary): RunState {
  return recordCombatAction(before, after, { kind: "turn", actionId: boundary, actorEnemyInstanceId: null, targetEnemyInstanceId: null });
}

function statusDeltas(before: CombatState, after: CombatState): CombatActionLogEntry["statusDeltas"] {
  const result: CombatActionLogEntry["statusDeltas"] = [];
  const collect = (side: "player" | "enemy", enemyInstanceId: string | null, oldBag: Record<string, number>, newBag: Record<string, number>) => {
    for (const status of [...new Set([...Object.keys(oldBag), ...Object.keys(newBag)])].sort()) {
      const delta = (newBag[status] ?? 0) - (oldBag[status] ?? 0);
      if (delta !== 0) result.push({ side, enemyInstanceId, status, delta });
    }
  };
  collect("player", null, before.statuses.player, after.statuses.player);
  for (const enemy of after.enemies) {
    collect("enemy", enemy.instanceId, before.statuses.enemies[enemy.instanceId] ?? {}, after.statuses.enemies[enemy.instanceId] ?? {});
  }
  return result;
}

/** Capture the resolved state transition, not a prediction from effect definitions. */
export function recordCombatAction(before: RunState, after: RunState, action: Action): RunState {
  const previous = before.combat;
  const resolved = after.combat;
  if (!previous || !resolved || previous.turn !== resolved.turn) throw new Error("action log requires one live combat turn");
  const knownEnemies = new Set(previous.enemies.map((enemy) => enemy.instanceId));
  if ((action.actorEnemyInstanceId && !knownEnemies.has(action.actorEnemyInstanceId)) || (action.targetEnemyInstanceId && !knownEnemies.has(action.targetEnemyInstanceId))) {
    throw new RangeError("action log references an unknown enemy");
  }
  const enemyDeltas = resolved.enemies.flatMap((enemy) => {
    const old = previous.enemies.find((item) => item.instanceId === enemy.instanceId);
    if (!old) return [];
    const hpDelta = enemy.hp - old.hp;
    const blockDelta = enemy.block - old.block;
    return hpDelta || blockDelta ? [{ instanceId: enemy.instanceId, hpDelta, blockDelta }] : [];
  });
  const entries = resolved.actionLog ?? previous.actionLog ?? [];
  const entry: CombatActionLogEntry = {
    sequence: (entries.at(-1)?.sequence ?? 0) + 1,
    turn: previous.turn,
    ...action,
    playerHpDelta: after.player.hp - before.player.hp,
    playerBlockDelta: after.player.block - before.player.block,
    enemyDeltas,
    summonedEnemyIds: resolved.enemies.filter((enemy) => !knownEnemies.has(enemy.instanceId)).map((enemy) => enemy.instanceId),
    statusDeltas: statusDeltas(previous, resolved),
    handAddedCount: resolved.hand.filter((id) => !previous.hand.includes(id)).length,
    // A turn reset and time spent typing are not time-granting card effects.
    timeDeltaMs: action.kind === "turn" ? 0 : resolved.clock.remainingMs - previous.clock.remainingMs,
    goldDelta: after.gold - before.gold,
    ...(action.kind === "turn" ? {
      discardedCount: resolved.discardPile.filter((id) => !previous.discardPile.includes(id)).length,
      exhaustedCount: resolved.exhaustPile.filter((id) => !previous.exhaustPile.includes(id)).length,
      ...(action.actionId === "player-start" && resolved.phase === "PLAYER_INPUT" ? { turnClockMs: resolved.clock.remainingMs } : {}),
    } : {}),
  };
  return { ...after, combat: { ...resolved, actionLog: [...entries, entry] } };
}

/** The result marker precedes combat-end relic rewards and is idempotent. */
export function recordCombatResult(run: RunState): RunState {
  if (run.combat?.phase !== "WON" && run.combat?.phase !== "LOST") return run;
  if (run.combat.actionLog?.some((entry) => entry.kind === "result")) return run;
  return recordCombatAction(run, run, { kind: "result", actionId: run.combat.phase === "WON" ? "won" : "lost", actorEnemyInstanceId: null, targetEnemyInstanceId: null });
}

function subtractNested(total: CombatActionLogEntry, nested: CombatActionLogEntry[]): CombatActionLogEntry {
  const sum = (select: (entry: CombatActionLogEntry) => number) => nested.reduce((value, entry) => value + select(entry), 0);
  const enemyDeltas = total.enemyDeltas.map((delta) => ({
    ...delta,
    hpDelta: delta.hpDelta - sum((entry) => entry.enemyDeltas.find((item) => item.instanceId === delta.instanceId)?.hpDelta ?? 0),
    blockDelta: delta.blockDelta - sum((entry) => entry.enemyDeltas.find((item) => item.instanceId === delta.instanceId)?.blockDelta ?? 0),
  })).filter((delta) => delta.hpDelta !== 0 || delta.blockDelta !== 0);
  const statusDeltas = total.statusDeltas.map((delta) => ({
    ...delta,
    delta: delta.delta - sum((entry) => entry.statusDeltas.find((item) => item.side === delta.side && item.enemyInstanceId === delta.enemyInstanceId && item.status === delta.status)?.delta ?? 0),
  })).filter((delta) => delta.delta !== 0);
  const handAddedCount = total.handAddedCount - sum((entry) => entry.handAddedCount);
  if (handAddedCount < 0) throw new Error("nested relic history exceeds enemy action draw count");
  return {
    ...total,
    playerHpDelta: total.playerHpDelta - sum((entry) => entry.playerHpDelta),
    playerBlockDelta: total.playerBlockDelta - sum((entry) => entry.playerBlockDelta),
    enemyDeltas,
    statusDeltas,
    summonedEnemyIds: total.summonedEnemyIds.filter((id) => !nested.some((entry) => entry.summonedEnemyIds.includes(id))),
    handAddedCount,
    timeDeltaMs: total.timeDeltaMs - sum((entry) => entry.timeDeltaMs),
    goldDelta: (total.goldDelta ?? 0) - sum((entry) => entry.goldDelta ?? 0),
  };
}

/** Put an Intent before hit-triggered relics without counting their effects twice. */
export function recordEnemyActionWithReactions(before: RunState, after: RunState, actorEnemyInstanceId: string, actionId: string): RunState {
  const base = before.combat?.actionLog ?? [];
  const nested = after.combat?.actionLog?.slice(base.length) ?? [];
  const action: Action = { kind: "enemy", actionId, actorEnemyInstanceId, targetEnemyInstanceId: null };
  if (!nested.length) return recordCombatAction(before, after, action);
  const withoutNested: RunState = { ...after, combat: { ...after.combat!, actionLog: base } };
  const total = recordCombatAction(before, withoutNested, action).combat!.actionLog!.at(-1)!;
  const parent = subtractNested(total, nested);
  return { ...after, combat: { ...after.combat!, actionLog: [...base, parent, ...nested.map((entry, index) => ({ ...entry, sequence: base.length + index + 2 }))] } };
}
