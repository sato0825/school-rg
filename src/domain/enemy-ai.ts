import { assessCombatOutcome } from "./combat-outcome.js";
import { randomInt } from "./random.js";
import { statusAmount, type StatusKind } from "./status-engine.js";
import type { ContentRegistry, EnemyInstance, Intent, RunState } from "./schema.js";

export type IntentCondition =
  | { kind: "hp_at_most_percent"; percent: number }
  | { kind: "turn_at_least"; turn: number }
  | { kind: "living_allies_at_most"; count: number }
  | { kind: "player_status_at_least"; status: StatusKind; amount: number };

export type IntentPattern =
  | { kind: "sequence"; intentIds: string[] }
  | { kind: "weighted"; choices: { intentId: string; weight: number }[] }
  | { kind: "conditional"; branches: { when: IntentCondition; intentId: string }[]; fallbackIntentId: string };

export type EnemyAiRegistry = Record<string, IntentPattern>;
export type ExecuteIntent = (run: RunState, enemyInstanceId: string, intent: Intent) => RunState;

function requireEnemy(run: RunState, instanceId: string): EnemyInstance {
  if (!run.combat) throw new Error("combat is required");
  const enemy = run.combat.enemies.find((item) => item.instanceId === instanceId);
  if (!enemy) throw new RangeError(`unknown enemy instance: ${instanceId}`);
  return enemy;
}

function matches(run: RunState, enemy: EnemyInstance, condition: IntentCondition, intendedTurn: number): boolean {
  const combat = run.combat!;
  switch (condition.kind) {
    case "hp_at_most_percent":
      if (!Number.isSafeInteger(condition.percent) || condition.percent < 0 || condition.percent > 100) throw new RangeError("invalid HP threshold");
      return enemy.hp * 100 <= enemy.maxHp * condition.percent;
    case "turn_at_least":
      if (!Number.isSafeInteger(condition.turn) || condition.turn < 1) throw new RangeError("invalid turn threshold");
      return intendedTurn >= condition.turn;
    case "living_allies_at_most":
      if (!Number.isSafeInteger(condition.count) || condition.count < 0) throw new RangeError("invalid ally threshold");
      return combat.enemies.filter((item) => item.instanceId !== enemy.instanceId && item.hp > 0).length <= condition.count;
    case "player_status_at_least":
      if (!Number.isSafeInteger(condition.amount) || condition.amount < 0) throw new RangeError("invalid status threshold");
      return statusAmount(run, { side: "player" }, condition.status) >= condition.amount;
  }
}

function choosePatternIntent(run: RunState, enemy: EnemyInstance, pattern: IntentPattern, intendedTurn: number): { intentId: string; rngState: number } {
  if (pattern.kind === "sequence") {
    if (pattern.intentIds.length === 0) throw new RangeError("empty enemy sequence");
    return { intentId: pattern.intentIds[enemy.intentHistoryIds.length % pattern.intentIds.length]!, rngState: run.rngState };
  }
  if (pattern.kind === "conditional") {
    const selected = pattern.branches.find((branch) => matches(run, enemy, branch.when, intendedTurn));
    return { intentId: selected?.intentId ?? pattern.fallbackIntentId, rngState: run.rngState };
  }
  if (pattern.choices.length === 0) throw new RangeError("empty enemy weights");
  let total = 0;
  for (const choice of pattern.choices) {
    if (!Number.isSafeInteger(choice.weight) || choice.weight < 1) throw new RangeError("invalid intent weight");
    total += choice.weight;
    if (!Number.isSafeInteger(total) || total > 0x1_0000_0000) throw new RangeError("intent weights overflow");
  }
  const draw = randomInt(run.rngState, total);
  let position = draw.value;
  for (const choice of pattern.choices) {
    if (position < choice.weight) return { intentId: choice.intentId, rngState: draw.state };
    position -= choice.weight;
  }
  throw new Error("weighted intent selection failed");
}

/** Selects and publishes the next Intent; the visible ID is the action to execute. */
export function selectEnemyIntent(run: RunState, instanceId: string, ai: EnemyAiRegistry, content: ContentRegistry, intendedTurn = run.combat?.turn): RunState {
  if (!Number.isSafeInteger(intendedTurn) || intendedTurn === undefined || intendedTurn < 1) throw new RangeError("invalid intended turn");
  const enemy = requireEnemy(run, instanceId);
  if (enemy.hp === 0) throw new RangeError("defeated enemies cannot choose an Intent");
  const definition = content.enemies.find((item) => item.id === enemy.enemyId);
  if (!definition) throw new RangeError(`unknown enemy definition: ${enemy.enemyId}`);
  const pattern = ai[enemy.enemyId];
  if (!pattern) throw new RangeError(`missing AI pattern: ${enemy.enemyId}`);
  const selected = choosePatternIntent(run, enemy, pattern, intendedTurn);
  if (!definition.intentIds.includes(selected.intentId)) throw new RangeError(`AI chose an unregistered Intent: ${selected.intentId}`);
  return {
    ...run,
    rngState: selected.rngState,
    combat: {
      ...run.combat!,
      enemies: run.combat!.enemies.map((item) => item.instanceId === instanceId ? { ...item, intentId: selected.intentId } : item),
    },
  };
}

/** Resolves each living enemy present at phase start once, in encounter order. */
export function resolveEnemyIntents(run: RunState, ai: EnemyAiRegistry, content: ContentRegistry, execute: ExecuteIntent): RunState {
  if (run.combat?.phase !== "ENEMY_PHASE") throw new Error("expected ENEMY_PHASE");
  const actingIds = run.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.instanceId);
  let current = run;
  for (const instanceId of actingIds) {
    if (current.combat?.phase !== "ENEMY_PHASE") break;
    const enemy = requireEnemy(current, instanceId);
    if (enemy.hp === 0) continue;
    const intent = content.intents.find((item) => item.id === enemy.intentId);
    if (!intent) throw new RangeError(`unknown Intent: ${enemy.intentId}`);
    const definition = content.enemies.find((item) => item.id === enemy.enemyId);
    if (!definition?.intentIds.includes(intent.id)) throw new RangeError(`Intent is not available to enemy: ${intent.id}`);
    const acted = execute(current, instanceId, intent);
    if (!acted.combat || acted.combat.turn !== current.combat.turn || !["ENEMY_PHASE", "WON", "LOST"].includes(acted.combat.phase)) {
      throw new Error("enemy Intent executor returned an invalid phase");
    }
    current = assessCombatOutcome(acted);
    current = {
      ...current,
      combat: {
        ...current.combat!,
        enemies: current.combat!.enemies.map((item) => item.instanceId === instanceId
          ? { ...item, intentHistoryIds: [...item.intentHistoryIds, intent.id] } : item),
      },
    };
    if (current.combat!.phase === "ENEMY_PHASE" && requireEnemy(current, instanceId).hp > 0) {
      current = selectEnemyIntent(current, instanceId, ai, content, current.combat!.turn + 1);
    }
  }
  return current;
}
