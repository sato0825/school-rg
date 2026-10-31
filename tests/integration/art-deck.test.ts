import { describe, expect, it } from "vitest";
import { artCardDefinitions } from "../../src/content/art-cards.js";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { dispositionForCard } from "../../src/domain/card-keywords.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";

const disposition = (instanceId: string, combat: NonNullable<RunState["combat"]>) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, instanceId);
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function artHand(cardId: string): { run: RunState; usedId: string; targetId: string } {
  const start = createRunSession(42, "art-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  let combat = entered.run.combat!;
  let usedId = combat.cards.find((card) => card.cardId === cardId)?.instanceId;
  if (!usedId) {
    const created = createCombatCard(combat, demoContent, cardId, false, "hand", { maxHandSize: 10 });
    combat = created.combat;
    usedId = created.instanceId;
  }
  const targetId = combat.cards.find((card) => card.cardId === "ART-002")!.instanceId;
  const hand = [usedId, targetId];
  combat = { ...combat, phase: "PLAYER_INPUT", hand, drawPile: combat.drawPile.filter((id) => !hand.includes(id)),
    typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return { run: { ...entered.run, combat }, usedId, targetId };
}

function typeAndChoose(run: RunState, word: string, targetId: string): RunState {
  let current = run;
  let now = 0;
  const use = (state: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null) =>
    useCardEffects(state, instanceId, { targetEnemyInstanceId, targetHandInstanceId }, DEFAULT_GAME_CONFIG, demoContent);
  for (const key of word) {
    now += 10;
    current = submitPlayerKey(current, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent, use, disposition);
  }
  return selectTypedHandTarget(current, targetId, { nowMs: () => now + 10 }, DEFAULT_GAME_CONFIG, demoContent, use, disposition);
}

function typeWord(run: RunState, word: string): RunState {
  let current = run;
  const startedAt = run.combat!.clock.lastEventAtMs;
  for (const [index, key] of [...word].entries()) {
    current = submitPlayerKey(current, { key }, { nowMs: () => startedAt + (index + 1) * 10 }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), disposition);
  }
  return current;
}

describe("art deck card operations", () => {
  it("has distinct starter, pool and equipment; retained frame survives a timeout", () => {
    const club = demoContent.clubs.find((item) => item.id === "art-demo")!;
    expect(artCardDefinitions).toHaveLength(12);
    expect(club.starterCardIds.filter((id) => id.startsWith("ART-"))).toHaveLength(4);
    expect(artCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    expect(club.startingRelicId).toBe("sketchbook");
    const { run, targetId } = artHand("ART-003");
    const ended = tickPlayerTurn(run, { nowMs: () => 10_000 }, disposition);
    expect(ended.combat!.hand).toEqual([targetId]);
    expect(ended.combat!.discardPile).toContain(run.combat!.hand[0]);
    expect(parseRunState(ended, demoContent)).toEqual(ended);
  });

  it("duplicates, exhausts and transforms a selected hand instance with a valid save", () => {
    const painted = artHand("ART-003");
    const copied = typeAndChoose(painted.run, "paint", painted.targetId);
    expect(copied.combat!.hand).toHaveLength(2);
    expect(copied.combat!.cards.find((card) => card.instanceId === "created-1")?.cardId).toBe("ART-002");

    const erased = artHand("ART-004");
    const exhausted = typeAndChoose(erased.run, "erase", erased.targetId);
    expect(exhausted.combat!.exhaustPile).toContain(erased.targetId);
    expect(exhausted.combat!.resolvingPile).toEqual([]);

    const redrawn = artHand("ART-005");
    const transformed = typeAndChoose(redrawn.run, "redraw", redrawn.targetId);
    expect(transformed.combat!.cards.find((card) => card.instanceId === redrawn.targetId)?.cardId).toBe("ART-006");
    expect(parseRunState(transformed, demoContent)).toEqual(transformed);
    const saved = serializeRunSession({ ...createRunSession(42, "art-demo", demoContent, mapOptions), screen: "combat", run: transformed }, demoContent, { nowMs: () => 100 }, disposition);
    expect(deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 }).run.combat!.cards.find((card) => card.instanceId === redrawn.targetId)?.cardId).toBe("ART-006");
  });

  it("keeps generated retained copies distinct across timeout, save and the next draw", () => {
    const staged = artHand("ART-003");
    const upgraded: RunState = { ...staged.run, combat: { ...staged.run.combat!, cards: staged.run.combat!.cards.map((card) =>
      card.instanceId === staged.targetId ? { ...card, upgraded: true } : card) } };
    const copied = typeAndChoose(upgraded, "paint", staged.targetId);
    const duplicate = copied.combat!.cards.find((card) => card.instanceId === "created-1")!;
    expect(duplicate).toMatchObject({ cardId: "ART-002", upgraded: true });
    expect(copied.combat!.hand).toEqual([staged.targetId, duplicate.instanceId]);

    const expired = tickPlayerTurn(copied, { nowMs: () => 10_000 }, disposition);
    expect(expired.combat!.hand).toEqual([staged.targetId, duplicate.instanceId]);
    expect(expired.combat!.discardPile).toContain(staged.usedId);
    const session = { ...createRunSession(42, "art-demo", demoContent, mapOptions), screen: "combat" as const, run: expired };
    const restored = deserializeRunSession(serializeRunSession(session, demoContent, { nowMs: () => 10_000 }, disposition),
      demoContent, { nowMs: () => 11_000 });
    expect(restored.run.combat!.hand).toEqual([staged.targetId, duplicate.instanceId]);
    const enemyTurn = completeEnemyPhase(beginEnemyPhase(restored.run, DEFAULT_GAME_CONFIG), (state) => state, DEFAULT_GAME_CONFIG);
    const nextTurn = beginPlayerTurn(enemyTurn, { nowMs: () => 11_000 }, DEFAULT_GAME_CONFIG, demoContent);
    const zones = [nextTurn.combat!.drawPile, nextTurn.combat!.hand, nextTurn.combat!.discardPile,
      nextTurn.combat!.exhaustPile, nextTurn.combat!.resolvingPile].flat();
    expect(zones).toHaveLength(nextTurn.combat!.cards.length);
    expect(new Set(zones).size).toBe(zones.length);
    expect(nextTurn.combat!.hand).toEqual(expect.arrayContaining([staged.targetId, duplicate.instanceId]));
    expect(parseRunState(nextTurn, demoContent)).toEqual(nextTurn);
  });

  it("redraws a held card into an all-enemy mural, then gains persistent block next turn", () => {
    const staged = artHand("ART-005");
    const transformed = typeAndChoose(staged.run, "redraw", staged.targetId);
    const firstEnemy = transformed.combat!.enemies[0]!;
    const secondEnemy = { ...firstEnemy, instanceId: "art-second-enemy" };
    const multi: RunState = { ...transformed, combat: { ...transformed.combat!, enemies: [firstEnemy, secondEnemy],
      statuses: { ...transformed.combat!.statuses, enemies: { ...transformed.combat!.statuses.enemies, [secondEnemy.instanceId]: {} } } } };
    const used = typeWord(multi, "mural");
    expect(used.combat!.enemies.map((enemy) => enemy.hp)).toEqual([firstEnemy.hp - 6, secondEnemy.hp - 6]);
    expect(used.combat!.statuses.player.barrier).toBe(2);
    expect(used.combat!.exhaustPile).toContain(staged.targetId);
    const expired = tickPlayerTurn(used, { nowMs: () => 10_000 }, disposition);
    const nextTurn = beginPlayerTurn(completeEnemyPhase(beginEnemyPhase(expired, DEFAULT_GAME_CONFIG), (state) => state, DEFAULT_GAME_CONFIG),
      { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, demoContent);
    expect(nextTurn.player.block).toBe(2);
    expect(nextTurn.combat!.statuses.player.barrier).toBe(2);
    expect(parseRunState(nextTurn, demoContent)).toEqual(nextTurn);
  });
});
