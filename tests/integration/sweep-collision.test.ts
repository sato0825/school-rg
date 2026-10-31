import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { resumePlayerTurn, selectTypedCard, submitPlayerKey } from "../../src/domain/turn-state.js";
import { exactDuplicateChoices } from "../../src/domain/typing.js";

const disposition = () => "discard" as const;
const useCard = (run: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null) =>
  useCardEffects(run, instanceId, { targetEnemyInstanceId, targetHandInstanceId }, DEFAULT_GAME_CONFIG, demoContent);

function sweepHand(): { run: RunState; baseId: string; kendoId: string } {
  const start = createRunSession(42, "kendo-demo", demoContent);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const original = entered.run.combat!;
  const baseId = original.cards.find((card) => card.cardId === "BASE-011")!.instanceId;
  const added = createCombatCard(original, demoContent, "KEN-007", false, "hand", { maxHandSize: 10 });
  const kendoId = added.instanceId;
  const combat = {
    ...added.combat,
    phase: "PLAYER_INPUT" as const,
    hand: [baseId, kendoId],
    drawPile: added.combat.drawPile.filter((id) => id !== baseId && id !== kendoId),
    discardPile: [...added.combat.discardPile.filter((id) => id !== baseId && id !== kendoId),
      ...added.combat.hand.filter((id) => id !== baseId && id !== kendoId)],
    exhaustPile: added.combat.exhaustPile.filter((id) => id !== baseId && id !== kendoId),
    typing: { buffer: "", candidateCardInstanceIds: [baseId, kendoId], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false },
  };
  return { run: { ...entered.run, combat }, baseId, kendoId };
}

function typeSweep(source: RunState): RunState {
  let run = source;
  for (let index = 0; index < "sweep".length; index++) {
    run = submitPlayerKey(run, { key: "sweep"[index]! }, { nowMs: () => (index + 1) * 100 }, DEFAULT_GAME_CONFIG, demoContent, useCard, disposition);
  }
  return run;
}

describe("BASE-011 and KEN-007 share the provisional sweep input", () => {
  it("does not guess, then applies only the selected card's effect", () => {
    const { run, baseId, kendoId } = sweepHand();
    const initialHp = run.combat!.enemies[0]!.hp;
    const pending = typeSweep(run);
    expect(pending.combat!.typing.buffer).toBe("sweep");
    expect(pending.combat!.hand).toEqual([baseId, kendoId]);
    expect(pending.combat!.enemies[0]!.hp).toBe(initialHp);
    expect(exactDuplicateChoices(pending.combat!.typing, [
      { instanceId: baseId, word: "sweep" }, { instanceId: kendoId, word: "sweep" },
    ], DEFAULT_GAME_CONFIG)).toEqual([baseId, kendoId]);
    const guarded = selectTypedCard(pending, kendoId, { nowMs: () => 600 }, DEFAULT_GAME_CONFIG, demoContent, useCard, disposition);
    expect(guarded.combat!.enemies[0]!.hp).toBe(initialHp - 5);
    expect(guarded.player.block).toBe(3);
    expect(guarded.combat!.hand).toEqual([baseId]);
    const plain = selectTypedCard(typeSweep(run), baseId, { nowMs: () => 600 }, DEFAULT_GAME_CONFIG, demoContent, useCard, disposition);
    expect(plain.combat!.enemies[0]!.hp).toBe(initialHp - 5);
    expect(plain.player.block).toBe(0);
    expect(plain.combat!.hand).toEqual([kendoId]);
  });

  it("does not turn a prefix with a longer possible word into a numbered choice", () => {
    const { baseId, kendoId } = sweepHand();
    expect(exactDuplicateChoices({ buffer: "sweep", candidateCardInstanceIds: [baseId, kendoId, "long"], selectedCardInstanceId: null, progress: 5, targetEnemyInstanceId: null, targetHandInstanceId: null }, [
      { instanceId: baseId, word: "sweep" }, { instanceId: kendoId, word: "sweep" }, { instanceId: "long", word: "sweep1" },
    ], DEFAULT_GAME_CONFIG)).toEqual([]);
  });

  it("preserves the pending choice through save/load and lets a deadline win", () => {
    const { run, baseId, kendoId } = sweepHand();
    const pending = typeSweep(run);
    const start = createRunSession(42, "kendo-demo", demoContent);
    const saved = serializeRunSession({ ...start, screen: "combat", run: pending }, demoContent, { nowMs: () => 500 }, disposition);
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 500 });
    expect(restored.run.combat!.typing.buffer).toBe("sweep");
    expect(restored.run.combat!.hand).toEqual([baseId, kendoId]);
    const resumed = resumePlayerTurn(restored.run, { nowMs: () => 500 });
    const deadline = resumed.combat!.clock.lastEventAtMs + resumed.combat!.clock.remainingMs;
    const expired = selectTypedCard(resumed, kendoId, { nowMs: () => deadline }, DEFAULT_GAME_CONFIG, demoContent, useCard, disposition);
    expect(expired.combat!.phase).toBe("PLAYER_END");
    expect(expired.player.block).toBe(0);
    expect(expired.combat!.hand).toEqual([]);
    expect(expired.combat!.discardPile).toContain(baseId);
    expect(expired.combat!.discardPile).toContain(kendoId);
  });
});
