import { assessCombatOutcome } from "./combat-outcome.js";
import { requireSetting, type GameConfig } from "./config.js";
import type { ActorRef } from "./effect-primitives.js";
import type { RunState } from "./schema.js";

export type StatusKind = "strength" | "dexterity" | "weak" | "vulnerable" | "frail" | "poison";
export type StatusBoundary = "player_start" | "player_end" | "enemy_start" | "enemy_end";
export type StatusTickEvent =
  | { kind: "poison"; target: ActorRef; damage: number }
  | { kind: "decay"; target: ActorRef; status: "weak" | "vulnerable" | "frail"; before: number; after: number };

const debuffs = ["weak", "vulnerable", "frail", "poison"] as const;

function actorExists(run: RunState, ref: ActorRef): boolean {
  return ref.side === "player" || Boolean(run.combat?.enemies.some((enemy) => enemy.instanceId === ref.instanceId));
}

function actorHp(run: RunState, ref: ActorRef): number {
  if (ref.side === "player") return run.player.hp;
  const enemy = run.combat?.enemies.find((item) => item.instanceId === ref.instanceId);
  if (!enemy) throw new RangeError(`unknown enemy instance: ${ref.instanceId}`);
  return enemy.hp;
}

export function statusAmount(run: RunState, ref: ActorRef, status: StatusKind): number {
  if (!run.combat || !actorExists(run, ref)) throw new RangeError("status target is not in combat");
  const bag = ref.side === "player" ? run.combat.statuses.player : (run.combat.statuses.enemies[ref.instanceId] ?? {});
  return bag[status] ?? 0;
}

function replaceStatusBag(run: RunState, ref: ActorRef, bag: Record<string, number>): RunState {
  const combat = run.combat;
  if (!combat) throw new Error("combat is required");
  const statuses = ref.side === "player"
    ? { ...combat.statuses, player: bag }
    : { ...combat.statuses, enemies: { ...combat.statuses.enemies, [ref.instanceId]: bag } };
  return { ...run, combat: { ...combat, statuses } };
}

function statusBag(run: RunState, ref: ActorRef): Record<string, number> {
  if (!run.combat || !actorExists(run, ref)) throw new RangeError("status target is not in combat");
  return ref.side === "player" ? run.combat.statuses.player : (run.combat.statuses.enemies[ref.instanceId] ?? {});
}

export function applyStatus(run: RunState, ref: ActorRef, status: StatusKind, delta: number): RunState {
  if (!Number.isSafeInteger(delta)) throw new RangeError("status delta must be a safe integer");
  if (actorHp(run, ref) === 0) throw new RangeError("cannot apply status to a defeated actor");
  const bag = statusBag(run, ref);
  const nextAmount = (bag[status] ?? 0) + delta;
  if (!Number.isSafeInteger(nextAmount)) throw new RangeError("status stack overflow");
  const nextBag = { ...bag };
  if (nextAmount === 0 || (status !== "strength" && status !== "dexterity" && nextAmount < 0)) delete nextBag[status];
  else nextBag[status] = nextAmount;
  return replaceStatusBag(run, ref, nextBag);
}

export function clearStatus(run: RunState, ref: ActorRef, status: StatusKind): RunState {
  const bag = { ...statusBag(run, ref) };
  delete bag[status];
  return replaceStatusBag(run, ref, bag);
}

export function cleanseDebuffs(run: RunState, ref: ActorRef): RunState {
  const bag = { ...statusBag(run, ref) };
  for (const status of debuffs) delete bag[status];
  return replaceStatusBag(run, ref, bag);
}

function percentage(value: number, percent: number): number {
  const adjusted = Math.floor(value * percent / 100);
  if (!Number.isSafeInteger(adjusted) || adjusted < 0) throw new RangeError("status modifier overflow");
  return adjusted;
}

export function modifiedAttackAmount(run: RunState, source: ActorRef, target: ActorRef, baseAmount: number, config: GameConfig): number {
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) throw new RangeError("base attack must be nonnegative");
  let amount = Math.max(0, baseAmount + statusAmount(run, source, "strength"));
  if (statusAmount(run, source, "weak") > 0) amount = percentage(amount, requireSetting(config.weakMultiplierPercent));
  if (statusAmount(run, target, "vulnerable") > 0) amount = percentage(amount, requireSetting(config.vulnerableMultiplierPercent));
  if (!Number.isSafeInteger(amount)) throw new RangeError("modified attack overflow");
  return amount;
}

export function modifiedBlockAmount(run: RunState, target: ActorRef, baseAmount: number, config: GameConfig): number {
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) throw new RangeError("base block must be nonnegative");
  let amount = Math.max(0, baseAmount + statusAmount(run, target, "dexterity"));
  if (statusAmount(run, target, "frail") > 0) amount = percentage(amount, requireSetting(config.frailMultiplierPercent));
  if (!Number.isSafeInteger(amount)) throw new RangeError("modified block overflow");
  return amount;
}

function poisonDamage(run: RunState, ref: ActorRef, amount: number): RunState {
  if (ref.side === "player") return { ...run, player: { ...run.player, hp: Math.max(0, run.player.hp - amount) } };
  const combat = run.combat!;
  return { ...run, combat: { ...combat, enemies: combat.enemies.map((enemy) => enemy.instanceId === ref.instanceId
    ? { ...enemy, hp: Math.max(0, enemy.hp - amount) } : enemy) } };
}

/** Boundary timing is provisional in config. Poison bypasses block and counter. */
export function tickStatuses(run: RunState, boundary: StatusBoundary, config: GameConfig): { run: RunState; events: StatusTickEvent[] } {
  if (!run.combat) throw new Error("combat is required");
  const owner = boundary.startsWith("player") ? "player" : "enemy";
  const edge = boundary.endsWith("start") ? "owner_start" : "owner_end";
  const targets: ActorRef[] = owner === "player" ? [{ side: "player" }]
    : run.combat.enemies.map((enemy) => ({ side: "enemy", instanceId: enemy.instanceId }));
  const events: StatusTickEvent[] = [];
  let current = run;
  for (const target of targets) {
    if (actorHp(current, target) === 0) continue;
    if (edge === requireSetting(config.poisonTickTiming)) {
      const poison = statusAmount(current, target, "poison");
      if (poison > 0) {
        const damage = Math.min(actorHp(current, target), poison);
        current = poisonDamage(current, target, poison);
        events.push({ kind: "poison", target, damage });
        current = applyStatusToLivingOrClear(current, target, "poison", -1);
        current = assessCombatOutcome(current);
      }
    }
    if (actorHp(current, target) === 0) continue;
    if (edge === requireSetting(config.debuffDecayTiming)) {
      for (const status of ["weak", "vulnerable", "frail"] as const) {
        const before = statusAmount(current, target, status);
        if (before > 0) {
          current = applyStatus(current, target, status, -1);
          events.push({ kind: "decay", target, status, before, after: before - 1 });
        }
      }
    }
  }
  return { run: current, events };
}

function applyStatusToLivingOrClear(run: RunState, ref: ActorRef, status: StatusKind, delta: number): RunState {
  if (actorHp(run, ref) === 0) {
    const bag = { ...statusBag(run, ref) };
    const next = Math.max(0, (bag[status] ?? 0) + delta);
    if (next === 0) delete bag[status];
    else bag[status] = next;
    return replaceStatusBag(run, ref, bag);
  }
  return applyStatus(run, ref, status, delta);
}
