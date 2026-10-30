import * as z from "zod";
import { enqueueEffectAction, resolveDueEffects, type ActorRef, type EffectAction, type EffectEvent } from "./effect-primitives.js";
import { selectEnemyIntent, type EnemyAiRegistry } from "./enemy-ai.js";
import { createEventQueue } from "./event-queue.js";
import type { GameConfig } from "./config.js";
import type { ContentRegistry, Intent, RunState } from "./schema.js";

const nonNegative = z.number().int().nonnegative();
const target = z.enum(["self", "player"]);
const attackParameters = z.strictObject({ amount: nonNegative, hits: z.number().int().positive().default(1), pierceBlock: z.boolean().default(false) });
const blockParameters = z.strictObject({ amount: nonNegative, target: target.default("self") });
const healParameters = z.strictObject({ amount: nonNegative, target: target.default("self") });
const statusParameters = z.strictObject({
  status: z.enum(["strength", "dexterity", "weak", "vulnerable", "frail", "poison"]),
  delta: z.number().int(),
  target: target.default("self"),
});
const summonParameters = z.strictObject({ enemyId: z.string().min(1) });

function effectTarget(enemyInstanceId: string, name: "self" | "player"): ActorRef {
  return name === "self" ? { side: "enemy", instanceId: enemyInstanceId } : { side: "player" };
}

function nextSummonId(run: RunState): string {
  const used = new Set(run.combat!.enemies.map((enemy) => enemy.instanceId));
  let index = 1;
  while (used.has(`summoned-${index}`)) index++;
  if (!Number.isSafeInteger(index)) throw new RangeError("summon IDs exhausted");
  return `summoned-${index}`;
}

function summonEnemy(run: RunState, enemyId: string, ai: EnemyAiRegistry, content: ContentRegistry): RunState {
  const definition = content.enemies.find((enemy) => enemy.id === enemyId);
  if (!definition) throw new RangeError(`unknown summoned enemy: ${enemyId}`);
  const instanceId = nextSummonId(run);
  const added: RunState = {
    ...run,
    combat: {
      ...run.combat!,
      enemies: [...run.combat!.enemies, {
        instanceId,
        enemyId,
        hp: definition.maxHp,
        maxHp: definition.maxHp,
        block: 0,
        intentId: definition.intentIds[0]!,
        intentHistoryIds: [],
      }],
    },
  };
  return selectEnemyIntent(added, instanceId, ai, content);
}

/** Default enemy Effect adapter. Content-specific effects can replace this function. */
export function executeEnemyIntentEffects(
  run: RunState,
  enemyInstanceId: string,
  intent: Intent,
  ai: EnemyAiRegistry,
  content: ContentRegistry,
  config: GameConfig,
  onPlayerHit?: (run: RunState, hpLost: number) => RunState,
): RunState {
  if (run.combat?.phase !== "ENEMY_PHASE") throw new Error("expected ENEMY_PHASE");
  let current = run;
  for (const effectId of intent.effectIds) {
    if (current.combat?.phase !== "ENEMY_PHASE") break;
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) throw new RangeError(`unknown enemy effect: ${effectId}`);
    if (effect.kind === "summon") {
      const parameters = summonParameters.parse(effect.parameters);
      current = summonEnemy(current, parameters.enemyId, ai, content);
      continue;
    }
    let action: EffectAction;
    if (effect.kind === "damage") {
      const parameters = attackParameters.parse(effect.parameters);
      action = { kind: "attack", source: { side: "enemy", instanceId: enemyInstanceId }, target: { side: "player" }, ...parameters };
    } else if (effect.kind === "block") {
      const parameters = blockParameters.parse(effect.parameters);
      action = { kind: "block", target: effectTarget(enemyInstanceId, parameters.target), amount: parameters.amount };
    } else if (effect.kind === "heal") {
      const parameters = healParameters.parse(effect.parameters);
      action = { kind: "heal", target: effectTarget(enemyInstanceId, parameters.target), amount: parameters.amount };
    } else if (effect.kind === "status") {
      const parameters = statusParameters.parse(effect.parameters);
      action = { kind: "status", target: effectTarget(enemyInstanceId, parameters.target), status: parameters.status, delta: parameters.delta };
    } else {
      throw new RangeError(`unsupported enemy effect kind: ${effect.kind}`);
    }
    const queue = enqueueEffectAction(createEventQueue<EffectEvent>(), current, 0, action);
    current = resolveDueEffects(current, queue, 0, config, undefined, (state, trace) =>
      trace.target.side === "player" && trace.hpLost > 0 && onPlayerHit ? onPlayerHit(state, trace.hpLost) : state).run;
  }
  return current;
}
