import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import { enqueueEffectAction, resolveDueEffects, type ActorRef, type EffectEvent } from "../../src/domain/effect-primitives.js";
import type { RunState } from "../../src/domain/schema.js";
import { validRun } from "../fixtures/domain.js";

const player: ActorRef = { side: "player" };
const enemy: ActorRef = { side: "enemy", instanceId: "enemy-1" };

function freshRun(): RunState {
  return structuredClone(validRun);
}

function queue() {
  return createEventQueue<EffectEvent>();
}

describe("effect primitives", () => {
  it("resolves block before attacks in insertion order, then pierces remaining block", () => {
    const run = freshRun();
    let pending = enqueueEffectAction(queue(), run, 100, { kind: "block", target: enemy, amount: 5 });
    pending = enqueueEffectAction(pending, run, 100, { kind: "attack", source: player, target: enemy, amount: 7, hits: 1, pierceBlock: false });
    pending = enqueueEffectAction(pending, run, 100, { kind: "attack", source: player, target: enemy, amount: 3, hits: 1, pierceBlock: true });
    const early = resolveDueEffects(run, pending, 99, DEFAULT_GAME_CONFIG);
    expect(early.run).toEqual(run);
    expect(early.trace).toEqual([]);
    const result = resolveDueEffects(run, pending, 100, DEFAULT_GAME_CONFIG);
    expect(result.trace.map((entry) => entry.kind)).toEqual(["block", "damage", "damage"]);
    expect(result.run.combat!.enemies[0]!.hp).toBe(15);
    expect(result.run.combat!.enemies[0]!.block).toBe(0);
    expect(result.queue.pending).toEqual([]);
  });

  it("clamps overkill and records later hits against a dead target", () => {
    const run = freshRun();
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    const pending = enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: enemy, amount: 99, hits: 3, pierceBlock: false });
    const result = resolveDueEffects(run, pending, 0, DEFAULT_GAME_CONFIG);
    expect(result.run.combat!.enemies[0]!.hp).toBe(0);
    expect(result.run.combat!.enemies[1]!.hp).toBe(20);
    expect(result.run.combat!.phase).toBe("PLAYER_INPUT");
    expect(result.trace.map((entry) => entry.kind)).toEqual(["damage", "skipped", "skipped"]);
    expect(result.trace[0]).toMatchObject({ hpLost: 20 });
  });

  it("executes a surviving defender's counter after each hit without recursion", () => {
    const run = freshRun();
    const pending = enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: enemy, amount: 2, hits: 2, pierceBlock: false });
    const result = resolveDueEffects(run, pending, 0, DEFAULT_GAME_CONFIG, { player: 0, enemies: { "enemy-1": 3 } });
    expect(result.trace.map((entry) => entry.kind)).toEqual(["damage", "counter", "damage", "counter"]);
    expect(result.run.player.hp).toBe(34);
    expect(result.run.combat!.enemies[0]!.hp).toBe(16);
  });

  it("keeps lethal-counter policy provisional and gives loss priority if both die", () => {
    const run = freshRun();
    run.player.hp = 2;
    run.combat!.enemies[0]!.hp = 2;
    const pending = enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: enemy, amount: 9, hits: 1, pierceBlock: false });
    const safe = resolveDueEffects(run, pending, 0, DEFAULT_GAME_CONFIG, { player: 0, enemies: { "enemy-1": 9 } });
    expect(safe.run.combat!.phase).toBe("WON");
    expect(safe.run.player.hp).toBe(2);
    const alternate = parseGameConfig({ ...DEFAULT_GAME_CONFIG, counterAfterLethal: { ...DEFAULT_GAME_CONFIG.counterAfterLethal, value: true } });
    const lethalCounter = resolveDueEffects(run, pending, 0, alternate, { player: 0, enemies: { "enemy-1": 9 } });
    expect(lethalCounter.run.player.hp).toBe(0);
    expect(lethalCounter.run.combat!.phase).toBe("LOST");
  });

  it("reports missing targets and rejects targets absent at scheduling time", () => {
    const run = freshRun();
    const pending = enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: enemy, amount: 5, hits: 1, pierceBlock: false });
    const disappeared = freshRun();
    disappeared.combat!.enemies = [];
    const result = resolveDueEffects(disappeared, pending, 0, DEFAULT_GAME_CONFIG);
    expect(result.trace).toMatchObject([{ kind: "skipped", reason: "target_missing" }]);
    expect(() => enqueueEffectAction(queue(), run, 0, { kind: "block", target: { side: "enemy", instanceId: "missing" }, amount: 1 })).toThrow("unknown enemy target");
  });

  it("heals and adjusts max HP while respecting caps", () => {
    const run = freshRun();
    run.player.hp = 30;
    let pending = enqueueEffectAction(queue(), run, 0, { kind: "heal", target: player, amount: 99 });
    pending = enqueueEffectAction(pending, run, 0, { kind: "max_hp", target: player, delta: 5, healByIncrease: true });
    const result = resolveDueEffects(run, pending, 0, DEFAULT_GAME_CONFIG);
    expect(result.run.player).toEqual({ hp: 45, maxHp: 45, block: 0 });
    expect(result.trace.map((entry) => entry.kind)).toEqual(["heal", "max_hp"]);
    expect(() => enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: enemy, amount: -1, hits: 1, pierceBlock: false })).toThrow(RangeError);
  });

  it("attacks all enemies in stable order and leaves later events pending after victory", () => {
    const run = freshRun();
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2", hp: 5 });
    let pending = enqueueEffectAction(queue(), run, 0, { kind: "attack", source: player, target: "all_enemies", amount: 30, hits: 1, pierceBlock: false });
    pending = enqueueEffectAction(pending, run, 0, { kind: "block", target: player, amount: 2 });
    const result = resolveDueEffects(run, pending, 0, DEFAULT_GAME_CONFIG);
    expect(result.trace.map((entry) => entry.kind)).toEqual(["damage", "damage"]);
    expect(result.run.combat!.phase).toBe("WON");
    expect(result.queue.pending).toHaveLength(1);
  });
});
