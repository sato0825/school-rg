import type { CombatActionLogEntry, CombatState, RunState } from "./schema.js";

type Action = Pick<CombatActionLogEntry, "kind" | "actionId" | "actorEnemyInstanceId" | "targetEnemyInstanceId">;

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
    timeDeltaMs: resolved.clock.remainingMs - previous.clock.remainingMs,
  };
  return { ...after, combat: { ...resolved, actionLog: [...entries, entry] } };
}
