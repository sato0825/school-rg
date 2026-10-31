import { describe, expect, it } from "vitest";
import { demoContent, createDemoBattle } from "../../src/content/demo-battle.js";
import { literatureCardDefinitions } from "../../src/content/literature-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { dispositionForCard } from "../../src/domain/card-keywords.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import type { RunState } from "../../src/domain/schema.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import { selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { describeCard } from "../../src/ui/battle-view.js";

function inHand(cardId: string, upgraded = false) {
  const run = createDemoBattle();
  const existing = run.combat!.cards.find((item) => item.cardId === cardId);
  const injected = existing ? run.combat! : createCombatCard(run.combat!, demoContent, cardId, upgraded, "hand", { maxHandSize: 10 }).combat;
  const card = injected.cards.find((item) => item.cardId === cardId)!;
  const allPiles = [injected.drawPile, injected.hand, injected.discardPile, injected.exhaustPile, injected.resolvingPile];
  const drawPile = allPiles.flat().filter((id) => id !== card.instanceId);
  return { run: { ...run, combat: { ...injected, phase: "PLAYER_INPUT" as const, cards: injected.cards.map((item) => item.instanceId === card.instanceId ? { ...item, upgraded } : item), hand: [card.instanceId], drawPile, discardPile: [], exhaustPile: [], resolvingPile: [], clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } } }, cardId: card.instanceId };
}

function typeWord(run: RunState, word: string, use: Parameters<typeof submitPlayerKey>[5]): RunState {
  let current = run;
  for (const [index, key] of [...word].entries()) {
    current = submitPlayerKey(current, { key }, { nowMs: () => (index + 1) * 10 }, DEFAULT_GAME_CONFIG, demoContent, use,
      (instanceId, combat) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, instanceId));
  }
  return current;
}

describe("literature club card identity", () => {
  it("ships distinct starter and reward words with visible compound effects", () => {
    const club = demoContent.clubs.find((item) => item.id === "literature-demo")!;
    expect(club.starterCardIds.filter((id) => id.startsWith("LIT-"))).toHaveLength(4);
    expect(literatureCardDefinitions).toHaveLength(12);
    expect(literatureCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    expect(new Set(literatureCardDefinitions.map((card) => card.input.text)).size).toBe(12);
    expect(describeCard(literatureCardDefinitions[0]!, demoContent)).toBe("攻撃 4 · 1枚ドロー");
  });

  it("resolves typed-card effects in order, including upgrade and card circulation", () => {
    for (const upgraded of [false, true]) {
      const staged = inHand("LIT-001", upgraded);
      const before = staged.run.combat!.drawPile.length;
      let used: RunState = staged.run;
      let now = 0;
      for (const key of "jot") {
        now += 10;
        used = submitPlayerKey(used, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
          (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
      }
      expect(used.combat!.enemies[0]!.hp).toBe(26 - (upgraded ? 6 : 4));
      expect(used.combat!.hand).toHaveLength(1);
      expect(used.combat!.drawPile).toHaveLength(before - 1);
      expect(used.combat!.discardPile).toContain(staged.cardId);
      expect(parseRunState(used, demoContent)).toEqual(used);
    }
  });

  it("lets reread recover a chosen discard before applying its block", () => {
    const staged = inHand("LIT-005");
    const recoveredId = staged.run.combat!.drawPile[0]!;
    const run: RunState = { ...staged.run, combat: { ...staged.run.combat!, drawPile: staged.run.combat!.drawPile.slice(1), discardPile: [recoveredId] } };
    const used = typeWord(run, "reread", (state, instanceId, targetEnemyInstanceId) =>
      useCardEffects(state, instanceId, { targetEnemyInstanceId, targetDiscardInstanceId: recoveredId }, DEFAULT_GAME_CONFIG, demoContent));
    expect(used.combat!.hand).toEqual([recoveredId]);
    expect(used.combat!.discardPile).toContain(staged.cardId);
    expect(used.combat!.discardPile).not.toContain(recoveredId);
    expect(used.player.block).toBe(2);
    expect(parseRunState(used, demoContent)).toEqual(used);
  });

  it("edits a selected hand card, then draws replacements without adding time", () => {
    const staged = inHand("LIT-009");
    const targetId = staged.run.combat!.drawPile[0]!;
    const run: RunState = { ...staged.run, combat: { ...staged.run.combat!, hand: [staged.cardId, targetId], drawPile: staged.run.combat!.drawPile.slice(1) } };
    const use: Parameters<typeof submitPlayerKey>[5] = (state, instanceId, targetEnemyInstanceId, targetHandInstanceId) =>
      useCardEffects(state, instanceId, { targetEnemyInstanceId, targetHandInstanceId }, DEFAULT_GAME_CONFIG, demoContent);
    const typed = typeWord(run, "edit", use);
    expect(typed.combat!.typing.selectedCardInstanceId).toBe(staged.cardId);
    const used = selectTypedHandTarget(typed, targetId, { nowMs: () => 50 }, DEFAULT_GAME_CONFIG, demoContent, use,
      (instanceId, combat) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, instanceId));
    expect(used.combat!.exhaustPile).toContain(targetId);
    expect(used.combat!.discardPile).toContain(staged.cardId);
    expect(used.combat!.hand).toHaveLength(2);
    expect(used.combat!.clock.remainingMs).toBe(9_950);
    expect(parseRunState(used, demoContent)).toEqual(used);
  });

  it("keeps an unusable opening bookmark for a later turn and restores it from save", () => {
    const staged = inHand("LIT-010");
    const card = literatureCardDefinitions.find((item) => item.id === "LIT-010")!;
    expect(describeCard(card, demoContent)).toContain("保持");
    const expired = tickPlayerTurn(staged.run, { nowMs: () => 10_000 },
      (instanceId, combat) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, instanceId));
    expect(expired.combat!.phase).toBe("PLAYER_END");
    expect(expired.combat!.hand).toEqual([staged.cardId]);
    const saved = serializeRunSession({ run: expired, screen: "combat", completedNodeIds: [], rewardCardIds: [], encounterHistory: {} },
      demoContent, { nowMs: () => 10_000 }, (instanceId, combat) => dispositionForCard(combat, demoContent, DEFAULT_GAME_CONFIG, instanceId));
    const loaded = deserializeRunSession(saved, demoContent, { nowMs: () => 20_000 });
    expect(loaded.run.combat!.hand).toEqual([staged.cardId]);
    expect(loaded.run.combat!.discardPile).not.toContain(staged.cardId);
    expect(parseRunState(loaded.run, demoContent)).toEqual(loaded.run);
  });
});
