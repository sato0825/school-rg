import { describe, expect, it } from "vitest";
import { baseCardDefinitions, baseCardEffects } from "../../src/content/base-cards.js";
import { useCardEffects, type CardEffectSelection } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { enqueueEffectAction, resolveDueEffects, type EffectEvent } from "../../src/domain/effect-primitives.js";
import { createEventQueue } from "../../src/domain/event-queue.js";
import type { ContentRegistry, RunState } from "../../src/domain/schema.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

const content: ContentRegistry = {
  ...validContent,
  cards: [...validContent.cards, ...baseCardDefinitions],
  effects: [...validContent.effects, ...baseCardEffects],
};

function typedCard(cardId: string, setup?: (run: RunState) => void, extraSelection: Partial<CardEffectSelection> = {}, upgraded = false): RunState {
  const card = baseCardDefinitions.find((item) => item.id === cardId)!;
  let run = structuredClone(validRun);
  run.combat!.cards = [{ instanceId: "combat-1", cardId, upgraded }];
  run.combat!.hand = ["combat-1"];
  run.combat!.drawPile = [];
  run.combat!.discardPile = [];
  run.combat!.exhaustPile = [];
  run.combat!.resolvingPile = [];
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: ["combat-1"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: "enemy-1", targetHandInstanceId: null };
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  setup?.(run);
  let now = 0;
  const clock = { nowMs: () => now };
  const use = (state: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null) =>
    useCardEffects(state, instanceId, { ...extraSelection, targetEnemyInstanceId, targetHandInstanceId }, DEFAULT_GAME_CONFIG, content);
  for (const key of card.input.text) {
    now += 10;
    run = submitPlayerKey(run, { key }, clock, DEFAULT_GAME_CONFIG, content, use, () => "discard");
  }
  if (card.target === "hand") {
    now += 10;
    run = selectTypedHandTarget(run, extraSelection.targetHandInstanceId ?? "", clock, DEFAULT_GAME_CONFIG, content, use, () => "discard");
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

  it("counter reacts to an enemy hit once and expires before the next player turn", () => {
    let run = typedCard("BASE-013");
    expect(run.combat!.statuses.player.thorns).toBe(3);
    run = tickPlayerTurn(run, { nowMs: () => 10_000 }, () => "discard");
    run = beginEnemyPhase(run, DEFAULT_GAME_CONFIG);
    run = completeEnemyPhase(run, (state) => {
      const queue = enqueueEffectAction(createEventQueue<EffectEvent>(), state, 10_000, {
        kind: "attack", source: { side: "enemy", instanceId: "enemy-1" }, target: { side: "player" }, amount: 5, hits: 1, pierceBlock: false,
      });
      return resolveDueEffects(state, queue, 10_000, DEFAULT_GAME_CONFIG).run;
    }, DEFAULT_GAME_CONFIG);
    expect(run.player.hp).toBe(35);
    expect(run.combat!.enemies[0]!.hp).toBe(17);
    run = beginPlayerTurn(run, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content);
    expect(run.combat!.statuses.player.thorns).toBeUndefined();
  });

  it("persistent block refreshes after ordinary block resets and persistent strength stacks", () => {
    let barrier = typedCard("BASE-019");
    expect(barrier.combat!.exhaustPile).toContain("combat-1");
    expect(barrier.combat!.statuses.player.barrier).toBe(3);
    barrier.player.block = 8;
    barrier = tickPlayerTurn(barrier, { nowMs: () => 10_000 }, () => "discard");
    barrier = beginEnemyPhase(barrier, DEFAULT_GAME_CONFIG);
    barrier = completeEnemyPhase(barrier, (state) => state, DEFAULT_GAME_CONFIG);
    barrier = beginPlayerTurn(barrier, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content);
    expect(barrier.player.block).toBe(3);

    let focus = typedCard("BASE-020");
    expect(focus.combat!.statuses.player.focus).toBe(1);
    focus = tickPlayerTurn(focus, { nowMs: () => 10_000 }, () => "discard");
    focus = beginEnemyPhase(focus, DEFAULT_GAME_CONFIG);
    focus = completeEnemyPhase(focus, (state) => state, DEFAULT_GAME_CONFIG);
    focus = beginPlayerTurn(focus, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content);
    expect(focus.combat!.statuses.player.strength).toBe(1);
    focus = tickPlayerTurn(focus, { nowMs: () => 20_000 }, () => "discard");
    focus = beginEnemyPhase(focus, DEFAULT_GAME_CONFIG);
    focus = completeEnemyPhase(focus, (state) => state, DEFAULT_GAME_CONFIG);
    focus = beginPlayerTurn(focus, { nowMs: () => 20_000 }, DEFAULT_GAME_CONFIG, content);
    expect(focus.combat!.statuses.player.strength).toBe(2);
  });

  it("recovers, exhausts and duplicates explicitly selected card instances", () => {
    const recovered = typedCard("BASE-014", (run) => {
      run.combat!.cards.push({ instanceId: "combat-2", cardId: "BASE-001", upgraded: false });
      run.combat!.discardPile.push("combat-2");
    }, { targetDiscardInstanceId: "combat-2" });
    expect(recovered.combat!.hand).toEqual(["combat-2"]);
    expect(recovered.combat!.discardPile).toEqual(["combat-1"]);

    const setupHand = (run: RunState) => {
      run.combat!.cards.push({ instanceId: "combat-2", cardId: "BASE-001", upgraded: false });
      run.combat!.hand.push("combat-2");
      run.combat!.typing.candidateCardInstanceIds.push("combat-2");
    };
    const exhausted = typedCard("BASE-015", setupHand, { targetHandInstanceId: "combat-2" });
    expect(exhausted.combat!.exhaustPile).toEqual(["combat-2"]);
    expect(exhausted.combat!.discardPile).toEqual(["combat-1"]);
    const duplicated = typedCard("BASE-016", setupHand, { targetHandInstanceId: "combat-2" });
    expect(duplicated.combat!.hand).toEqual(["combat-2", "created-1"]);
    expect(duplicated.combat!.cards.find((card) => card.instanceId === "created-1")?.cardId).toBe("BASE-001");
  });

  it("cleanses one chosen debuff and pays HP before drawing", () => {
    const cleansed = typedCard("BASE-018", (run) => {
      run.combat!.statuses.player = { poison: 3, weak: 2 };
    }, { targetDebuff: "poison" });
    expect(cleansed.combat!.statuses.player).toEqual({ weak: 2 });

    const paid = typedCard("BASE-021", (run) => {
      run.combat!.cards.push(
        { instanceId: "combat-2", cardId: "BASE-001", upgraded: false },
        { instanceId: "combat-3", cardId: "BASE-002", upgraded: false },
      );
      run.combat!.drawPile = ["combat-2", "combat-3"];
    });
    expect(paid.player.hp).toBe(37);
    expect(paid.combat!.hand).toEqual(["combat-3", "combat-2"]);
    expect(paid.combat!.discardPile).toEqual(["combat-1"]);
  });

  it("rejects missing selections and insufficient HP before consuming the card", () => {
    const run = structuredClone(validRun);
    run.combat!.cards[0]!.cardId = "BASE-021";
    run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
    run.player.hp = 3;
    expect(() => useCardEffects(run, "combat-1", { targetEnemyInstanceId: null }, DEFAULT_GAME_CONFIG, content)).toThrow("insufficient HP");
    expect(run.combat!.hand).toEqual(["combat-1"]);
    run.combat!.cards[0]!.cardId = "BASE-014";
    expect(() => useCardEffects(run, "combat-1", { targetEnemyInstanceId: null }, DEFAULT_GAME_CONFIG, content)).toThrow("discard card must be selected");
    expect(run.combat!.resolvingPile).toEqual([]);
  });

  it("types and resolves every provisional upgraded card through its declared targets", () => {
    for (const card of baseCardDefinitions) {
      const selection: Partial<CardEffectSelection> = {};
      const setup = (run: RunState) => {
        if (["BASE-014", "BASE-015", "BASE-016"].includes(card.id)) {
          run.combat!.cards.push({ instanceId: "combat-2", cardId: "card-draft", upgraded: false });
          if (card.id === "BASE-014") {
            run.combat!.discardPile.push("combat-2");
            selection.targetDiscardInstanceId = "combat-2";
          } else {
            run.combat!.hand.push("combat-2");
            run.combat!.typing.candidateCardInstanceIds.push("combat-2");
            selection.targetHandInstanceId = "combat-2";
          }
        }
        if (card.id === "BASE-018") {
          run.combat!.statuses.player = { poison: 2 };
          run.player.hp = 30;
          selection.targetDebuff = "poison";
        }
        if (["BASE-007", "BASE-015", "BASE-021"].includes(card.id)) {
          run.combat!.cards.push({ instanceId: "combat-3", cardId: "card-strike", upgraded: false });
          run.combat!.drawPile.push("combat-3");
        }
        if (card.id === "BASE-021") run.player.hp = 4;
        if (card.id === "BASE-024") run.combat!.enemies[0]!.block = 10;
      };
      const result = typedCard(card.id, setup, selection, true);
      expect(result.combat!.resolvingPile, card.id).toEqual([]);
      expect(result.combat!.discardPile.includes("combat-1") || result.combat!.exhaustPile.includes("combat-1"), card.id).toBe(true);
    }
    expect(typedCard("BASE-001", undefined, {}, true).combat!.enemies[0]!.hp).toBe(12);
    expect(typedCard("BASE-019", undefined, {}, true).combat!.statuses.player.barrier).toBe(4);
    expect(typedCard("BASE-024", (run) => { run.combat!.enemies[0]!.block = 10; }, {}, true).combat!.enemies[0]).toMatchObject({ hp: 17, block: 0 });
  });
});
