import { describe, expect, it } from "vitest";
import { baseCardDefinitions, baseCardEffects } from "../../src/content/base-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import type { ContentRegistry, RunState } from "../../src/domain/schema.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

const content: ContentRegistry = {
  ...validContent,
  cards: [...validContent.cards, ...baseCardDefinitions],
  effects: [...validContent.effects, ...baseCardEffects],
};

function typedCard(cardId: string, setup?: (run: RunState) => void): RunState {
  const card = baseCardDefinitions.find((item) => item.id === cardId)!;
  let run = structuredClone(validRun);
  run.combat!.cards = [{ instanceId: "combat-1", cardId, upgraded: false }];
  run.combat!.hand = ["combat-1"];
  run.combat!.drawPile = [];
  run.combat!.discardPile = [];
  run.combat!.exhaustPile = [];
  run.combat!.resolvingPile = [];
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: "enemy-1" };
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  setup?.(run);
  let now = 0;
  const clock = { nowMs: () => now };
  for (const key of card.input.text) {
    now += 10;
    run = submitPlayerKey(run, { key }, clock, DEFAULT_GAME_CONFIG, content,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, content),
      () => "discard");
  }
  expect(run.combat!.resolvingPile).toEqual([]);
  expect(run.combat!.hand).not.toContain("combat-1");
  expect(parseRunState(JSON.parse(JSON.stringify(run)), content)).toEqual(run);
  return run;
}

describe("typed basic card effects", () => {
  it("resolves basic, heavy, multi, all-target and piercing attacks", () => {
    expect(typedCard("BASE-001").combat!.enemies[0]!.hp).toBe(14);
    expect(typedCard("BASE-003").combat!.enemies[0]!.hp).toBe(6);
    expect(typedCard("BASE-004").combat!.enemies[0]!.hp).toBe(12);
    const sweep = typedCard("BASE-011", (run) => run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" }));
    expect(sweep.combat!.enemies.map((enemy) => enemy.hp)).toEqual([15, 15]);
    const pierced = typedCard("BASE-012", (run) => { run.combat!.enemies[0]!.block = 10; });
    expect(pierced.combat!.enemies[0]).toMatchObject({ hp: 12, block: 10 });
  });

  it("resolves block, healing, draw and status applications", () => {
    expect(typedCard("BASE-002").player.block).toBe(5);
    expect(typedCard("BASE-005").player.block).toBe(8);
    const healed = typedCard("BASE-006", (run) => { run.player.hp = 37; });
    expect(healed.player.hp).toBe(40);
    const drawn = typedCard("BASE-007", (run) => {
      run.combat!.cards.push({ instanceId: "combat-2", cardId: "BASE-001", upgraded: false });
      run.combat!.drawPile.push("combat-2");
    });
    expect(drawn.combat!.hand).toEqual(["combat-2"]);
    expect(drawn.combat!.discardPile).toEqual(["combat-1"]);
    expect(typedCard("BASE-008").combat!.statuses.player.strength).toBe(2);
    expect(typedCard("BASE-009").combat!.statuses.enemies["enemy-1"]?.weak).toBe(2);
    expect(typedCard("BASE-010").combat!.statuses.enemies["enemy-1"]?.poison).toBe(4);
  });

  it("adds time after typing, evaluates provisional finish and removes all block", () => {
    expect(typedCard("BASE-017").combat!.clock.remainingMs).toBe(11_950);
    expect(typedCard("BASE-023").combat!.clock.remainingMs).toBe(13_950);
    expect(typedCard("BASE-022").combat!.enemies[0]!.hp).toBe(12);
    expect(typedCard("BASE-022", (run) => { run.combat!.enemies[0]!.hp = 10; }).combat!.enemies[0]!.hp).toBe(0);
    const broken = typedCard("BASE-024", (run) => { run.combat!.enemies[0]!.block = 7; });
    expect(broken.combat!.enemies[0]).toMatchObject({ hp: 20, block: 0 });
  });
});
