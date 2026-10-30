import { describe, expect, it } from "vitest";
import { demoContent, createDemoBattle } from "../../src/content/demo-battle.js";
import { literatureCardDefinitions } from "../../src/content/literature-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { describeCard } from "../../src/ui/battle-view.js";

function inHand(cardId: string, upgraded = false) {
  const run = createDemoBattle();
  const card = run.combat!.cards.find((item) => item.cardId === cardId)!;
  const allPiles = [run.combat!.drawPile, run.combat!.hand, run.combat!.discardPile, run.combat!.exhaustPile, run.combat!.resolvingPile];
  const drawPile = allPiles.flat().filter((id) => id !== card.instanceId);
  return { run: { ...run, combat: { ...run.combat!, phase: "PLAYER_INPUT" as const, cards: run.combat!.cards.map((item) => item.instanceId === card.instanceId ? { ...item, upgraded } : item), hand: [card.instanceId], drawPile, discardPile: [], exhaustPile: [], resolvingPile: [], clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } } }, cardId: card.instanceId };
}

describe("literature club card identity", () => {
  it("ships distinct starter and reward words with visible compound effects", () => {
    const club = demoContent.clubs.find((item) => item.id === "literature-demo")!;
    expect(club.starterCardIds.filter((id) => id.startsWith("LIT-"))).toHaveLength(4);
    expect(literatureCardDefinitions).toHaveLength(6);
    expect(literatureCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    expect(new Set(literatureCardDefinitions.map((card) => card.input.text)).size).toBe(6);
    expect(describeCard(literatureCardDefinitions[0]!, demoContent)).toBe("攻撃 4 · 1枚ドロー");
  });

  it("resolves typed-card effects in order, including upgrade and card circulation", () => {
    for (const upgraded of [false, true]) {
      const staged = inHand("LIT-001", upgraded);
      const before = staged.run.combat!.drawPile.length;
      let used = staged.run;
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
});
