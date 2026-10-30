import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { applyStatus, cleanseDebuffs, clearStatus, modifiedAttackAmount, modifiedBlockAmount, statusAmount, tickStatuses } from "../../src/domain/status-engine.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

const player = { side: "player" } as const;
const enemy = { side: "enemy", instanceId: "enemy-1" } as const;

describe("status engine", () => {
  it("stacks, reduces and clears statuses without mutating the source", () => {
    const source = structuredClone(validRun);
    let run = applyStatus(source, enemy, "poison", 2);
    run = applyStatus(run, enemy, "poison", 3);
    run = applyStatus(run, player, "strength", -2);
    expect(statusAmount(run, enemy, "poison")).toBe(5);
    expect(statusAmount(run, player, "strength")).toBe(-2);
    run = applyStatus(run, enemy, "poison", -20);
    expect(statusAmount(run, enemy, "poison")).toBe(0);
    run = applyStatus(run, player, "weak", 2);
    run = applyStatus(run, player, "vulnerable", 1);
    run = cleanseDebuffs(run, player);
    expect(statusAmount(run, player, "weak")).toBe(0);
    expect(statusAmount(run, player, "strength")).toBe(-2);
    expect(statusAmount(clearStatus(run, player, "strength"), player, "strength")).toBe(0);
    expect(source.combat!.statuses).toEqual({ player: {}, enemies: {} });
  });

  it("modifies attack and block with switchable provisional multipliers", () => {
    let run = structuredClone(validRun);
    run = applyStatus(run, player, "strength", 2);
    run = applyStatus(run, player, "weak", 1);
    run = applyStatus(run, enemy, "vulnerable", 1);
    run = applyStatus(run, player, "dexterity", 2);
    run = applyStatus(run, player, "frail", 1);
    expect(modifiedAttackAmount(run, player, enemy, 6, DEFAULT_GAME_CONFIG)).toBe(9);
    expect(modifiedBlockAmount(run, player, 6, DEFAULT_GAME_CONFIG)).toBe(6);
    const alternate = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      weakMultiplierPercent: { ...DEFAULT_GAME_CONFIG.weakMultiplierPercent, value: 50 },
    });
    expect(modifiedAttackAmount(run, player, enemy, 6, alternate)).toBe(6);
  });

  it("ticks poison through block and defeats an enemy at the configured start boundary", () => {
    let run = structuredClone(validRun);
    run.combat!.enemies[0]!.hp = 3;
    run.combat!.enemies[0]!.block = 99;
    run = applyStatus(run, enemy, "poison", 4);
    const tick = tickStatuses(run, "enemy_start", DEFAULT_GAME_CONFIG);
    expect(tick.run.combat!.enemies[0]!.hp).toBe(0);
    expect(tick.run.combat!.enemies[0]!.block).toBe(99);
    expect(tick.run.combat!.phase).toBe("WON");
    expect(tick.events).toEqual([{ kind: "poison", target: enemy, damage: 3 }]);
    expect(statusAmount(tick.run, enemy, "poison")).toBe(3);
  });

  it("decays debuffs at owner end and can move poison to owner end", () => {
    let run = structuredClone(validRun);
    run = applyStatus(run, player, "weak", 2);
    run = applyStatus(run, player, "poison", 2);
    const start = tickStatuses(run, "player_start", DEFAULT_GAME_CONFIG);
    expect(start.run.player.hp).toBe(38);
    expect(statusAmount(start.run, player, "weak")).toBe(2);
    const end = tickStatuses(start.run, "player_end", DEFAULT_GAME_CONFIG);
    expect(statusAmount(end.run, player, "weak")).toBe(1);
    const alternate = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      poisonTickTiming: { ...DEFAULT_GAME_CONFIG.poisonTickTiming, value: "owner_end" },
    });
    expect(tickStatuses(run, "player_start", alternate).run.player.hp).toBe(40);
    expect(tickStatuses(run, "player_end", alternate).run.player.hp).toBe(38);
  });

  it("restores older combat states with empty statuses and rejects orphan enemy status refs", () => {
    const legacy = structuredClone(validRun) as unknown as Record<string, unknown>;
    const combat = legacy.combat as Record<string, unknown>;
    delete combat.statuses;
    expect(parseRunState(legacy, validContent).combat!.statuses).toEqual({ player: {}, enemies: {} });
    const orphan = structuredClone(validRun);
    orphan.combat!.statuses.enemies.ghost = { poison: 2 };
    expect(() => parseRunState(orphan, validContent)).toThrow("Unregistered ID: ghost");
  });
});
