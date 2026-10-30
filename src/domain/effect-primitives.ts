import { requireSetting, type GameConfig } from "./config.js";
import { enqueueEvent, takeNextDueEvent, type EventQueue } from "./event-queue.js";
import type { CombatState, RunState } from "./schema.js";

export type ActorRef = { side: "player" } | { side: "enemy"; instanceId: string };
export type EffectAction =
  | { kind: "attack"; source: ActorRef; target: ActorRef | "all_enemies"; amount: number; hits: number; pierceBlock: boolean }
  | { kind: "block"; target: ActorRef; amount: number }
  | { kind: "heal"; target: ActorRef; amount: number }
  | { kind: "max_hp"; target: ActorRef; delta: number; healByIncrease: boolean };

export type EffectEvent =
  | { kind: "hit"; source: ActorRef; target: ActorRef; amount: number; pierceBlock: boolean }
  | Exclude<EffectAction, { kind: "attack" }>;

export type EffectTrace =
  | { kind: "damage" | "counter"; source: ActorRef; target: ActorRef; requested: number; blockSpent: number; hpLost: number }
  | { kind: "block" | "heal" | "max_hp"; target: ActorRef; before: number; after: number }
  | { kind: "skipped"; event: EffectEvent; reason: "source_dead" | "target_dead" | "target_missing" };

export interface CounterDamage {
  player: number;
  enemies: Record<string, number>;
}

function unsigned(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a nonnegative safe integer`);
}

function actor(run: RunState, ref: ActorRef): { hp: number; maxHp: number; block: number } | null {
  if (ref.side === "player") return run.player;
  return run.combat?.enemies.find((enemy) => enemy.instanceId === ref.instanceId) ?? null;
}

function replaceActor(run: RunState, ref: ActorRef, updated: { hp: number; maxHp: number; block: number }): RunState {
  if (ref.side === "player") return { ...run, player: updated };
  const combat = run.combat;
  if (!combat) throw new Error("combat is required");
  return {
    ...run,
    combat: {
      ...combat,
      enemies: combat.enemies.map((enemy) => enemy.instanceId === ref.instanceId ? { ...enemy, ...updated } : enemy),
    },
  };
}

function setOutcome(run: RunState): RunState {
  const combat = run.combat;
  if (!combat) throw new Error("combat is required");
  let phase: CombatState["phase"] = combat.phase;
  if (run.player.hp === 0) phase = "LOST";
  else if (combat.enemies.every((enemy) => enemy.hp === 0)) phase = "WON";
  return phase === combat.phase ? run : { ...run, combat: { ...combat, phase } };
}

function requireKnownActor(run: RunState, ref: ActorRef): void {
  if (!actor(run, ref)) throw new RangeError(`unknown ${ref.side} target${ref.side === "enemy" ? `: ${ref.instanceId}` : ""}`);
}

/** Expands all-enemy and multi-hit actions at scheduling time for stable order. */
export function enqueueEffectAction(
  queue: EventQueue<EffectEvent>,
  run: RunState,
  dueAtMs: number,
  action: EffectAction,
): EventQueue<EffectEvent> {
  if (!run.combat) throw new Error("combat is required");
  let next = queue;
  if (action.kind === "attack") {
    unsigned(action.amount, "attack amount");
    if (!Number.isSafeInteger(action.hits) || action.hits < 1) throw new RangeError("hits must be positive");
    requireKnownActor(run, action.source);
    const targets: ActorRef[] = action.target === "all_enemies"
      ? run.combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => ({ side: "enemy", instanceId: enemy.instanceId }))
      : [action.target];
    targets.forEach((target) => requireKnownActor(run, target));
    for (const target of targets) {
      for (let index = 0; index < action.hits; index++) {
        next = enqueueEvent(next, dueAtMs, { kind: "hit", source: action.source, target, amount: action.amount, pierceBlock: action.pierceBlock });
      }
    }
  } else {
    const value = action.kind === "max_hp" ? action.delta : action.amount;
    if (action.kind === "max_hp") {
      if (!Number.isSafeInteger(value)) throw new RangeError("max HP delta must be a safe integer");
    } else unsigned(value, `${action.kind} amount`);
    requireKnownActor(run, action.target);
    next = enqueueEvent(next, dueAtMs, action);
  }
  return next;
}

function damage(
  run: RunState,
  source: ActorRef,
  target: ActorRef,
  amount: number,
  pierceBlock: boolean,
  kind: "damage" | "counter",
): { run: RunState; trace: EffectTrace } {
  const recipient = actor(run, target);
  if (!recipient) return { run, trace: { kind: "skipped", event: { kind: "hit", source, target, amount, pierceBlock }, reason: "target_missing" } };
  if (recipient.hp === 0) return { run, trace: { kind: "skipped", event: { kind: "hit", source, target, amount, pierceBlock }, reason: "target_dead" } };
  const blockSpent = pierceBlock ? 0 : Math.min(recipient.block, amount);
  const hpLost = Math.min(recipient.hp, amount - blockSpent);
  const updated = { ...recipient, hp: recipient.hp - hpLost, block: recipient.block - blockSpent };
  return {
    run: replaceActor(run, target, updated),
    trace: { kind, source, target, requested: amount, blockSpent, hpLost },
  };
}

/** Only due events resolve. Terminal combat retains pending events for explicit cleanup. */
export function resolveDueEffects(
  run: RunState,
  queue: EventQueue<EffectEvent>,
  nowMs: number,
  config: GameConfig,
  counterDamage: CounterDamage = { player: 0, enemies: {} },
): { run: RunState; queue: EventQueue<EffectEvent>; trace: EffectTrace[] } {
  if (!run.combat) throw new Error("combat is required");
  unsigned(counterDamage.player, "player counter damage");
  Object.values(counterDamage.enemies).forEach((value) => unsigned(value, "enemy counter damage"));
  const trace: EffectTrace[] = [];
  let current = run;
  let pending = queue;
  while (current.combat?.phase !== "WON" && current.combat?.phase !== "LOST") {
    const taken = takeNextDueEvent(pending, nowMs);
    if (!taken.event) break;
    pending = taken.queue;
    const event = taken.event.payload;
    const target = actor(current, event.target);
    if (!target) {
      trace.push({ kind: "skipped", event, reason: "target_missing" });
      continue;
    }
    if (target.hp === 0) {
      trace.push({ kind: "skipped", event, reason: "target_dead" });
      continue;
    }
    if (event.kind === "hit") {
      const attacker = actor(current, event.source);
      if (!attacker || attacker.hp === 0) {
        trace.push({ kind: "skipped", event, reason: "source_dead" });
        continue;
      }
      const first = damage(current, event.source, event.target, event.amount, event.pierceBlock, "damage");
      current = first.run;
      trace.push(first.trace);
      const defender = actor(current, event.target)!;
      const counter = event.target.side === "player" ? counterDamage.player : (counterDamage.enemies[event.target.instanceId] ?? 0);
      if (counter > 0 && event.amount > 0 && (defender.hp > 0 || requireSetting(config.counterAfterLethal))) {
        const reaction = damage(current, event.target, event.source, counter, false, "counter");
        current = reaction.run;
        trace.push(reaction.trace);
      }
      current = setOutcome(current);
      continue;
    }
    if (event.kind === "block") {
      const after = target.block + event.amount;
      if (!Number.isSafeInteger(after)) throw new RangeError("block overflow");
      current = replaceActor(current, event.target, { ...target, block: after });
      trace.push({ kind: "block", target: event.target, before: target.block, after });
    } else if (event.kind === "heal") {
      const after = Math.min(target.maxHp, target.hp + event.amount);
      current = replaceActor(current, event.target, { ...target, hp: after });
      trace.push({ kind: "heal", target: event.target, before: target.hp, after });
    } else {
      const maxHp = target.maxHp + event.delta;
      if (!Number.isSafeInteger(maxHp) || maxHp < 1) throw new RangeError("resulting max HP must be positive");
      const hp = event.healByIncrease && event.delta > 0 ? Math.min(maxHp, target.hp + event.delta) : Math.min(target.hp, maxHp);
      current = replaceActor(current, event.target, { ...target, maxHp, hp });
      trace.push({ kind: "max_hp", target: event.target, before: target.maxHp, after: maxHp });
    }
  }
  return { run: current, queue: pending, trace };
}
