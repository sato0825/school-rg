import { describe, expect, it } from "vitest";
import { destinationAfterUse, prepareOpeningHand, settleHandWithKeywords } from "../../src/domain/card-keywords.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import type { CombatState, ContentRegistry, RunState } from "../../src/domain/schema.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";
import { validContent, validRun } from "../fixtures/domain.js";

function keywordFixture(): { content: ContentRegistry; combat: CombatState } {
  const content = structuredClone(validContent);
  const definitions = [
    ["plain", []], ["retained", ["retain"]], ["vanishing", ["ethereal"]],
    ["both", ["retain", "ethereal"]], ["spent", ["exhaust"]],
  ] as const;
  for (const [id, keywordIds] of definitions) {
    content.cards.push({ ...content.cards[0]!, id: `card-${id}`, keywordIds: [...keywordIds] });
  }
  const combat = structuredClone(validRun.combat!);
  combat.cards = definitions.map(([id]) => ({ instanceId: id, cardId: `card-${id}`, upgraded: false }));
  combat.hand = definitions.map(([id]) => id);
  combat.drawPile = [];
  combat.discardPile = [];
  combat.exhaustPile = [];
  combat.typing = { buffer: "", candidateCardInstanceIds: [...combat.hand], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null };
  return { content, combat };
}

describe("card keyword lifecycle", () => {
  it("settles conflicting Retain/Ethereal by provisional priority in hand order", () => {
    const { content, combat } = keywordFixture();
    const result = settleHandWithKeywords(combat, content, DEFAULT_GAME_CONFIG);
    expect(result.combat.hand).toEqual(["retained"]);
    expect(result.combat.discardPile).toEqual(["plain", "spent"]);
    expect(result.combat.exhaustPile).toEqual(["vanishing", "both"]);
    expect(result.events.map((event) => event.kind)).toEqual(["discarded", "retained", "exhausted", "exhausted", "discarded"]);
    const alternate = parseGameConfig({
      ...DEFAULT_GAME_CONFIG,
      etherealRetainPriority: { ...DEFAULT_GAME_CONFIG.etherealRetainPriority, value: "retain" },
    });
    expect(settleHandWithKeywords(combat, content, alternate).combat.hand).toEqual(["retained", "both"]);
    expect(combat.hand).toHaveLength(5);
  });

  it("uses Exhaust only after use and rejects missing references", () => {
    const { content, combat } = keywordFixture();
    expect(destinationAfterUse(combat, content, "spent")).toBe("exhaust");
    expect(destinationAfterUse(combat, content, "vanishing")).toBe("discard");
    expect(() => destinationAfterUse(combat, content, "missing")).toThrow("unknown card instance");
  });

  it("pulls Innate in top-to-bottom order and lets the config change draw count", () => {
    const content = structuredClone(validContent);
    content.cards.push({ ...content.cards[0]!, id: "card-innate", keywordIds: ["innate"] });
    const run: RunState = structuredClone(validRun);
    run.combat!.phase = "PLAYER_START";
    run.combat!.cards = ["a", "b", "c", "d", "e"].map((instanceId) => ({
      instanceId, cardId: ["a", "c"].includes(instanceId) ? "card-innate" : "card-strike", upgraded: false,
    }));
    run.combat!.drawPile = ["a", "b", "c", "d", "e"];
    run.combat!.hand = [];
    run.combat!.typing = { buffer: "", candidateCardInstanceIds: [], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null };
    const opening = prepareOpeningHand(run.combat!, content);
    expect(opening.innateIds).toEqual(["c", "a"]);
    expect(opening.combat.drawPile).toEqual(["b", "d", "e"]);
    expect(opening.events).toEqual([{ instanceId: "c", kind: "innate" }, { instanceId: "a", kind: "innate" }]);
    const cappedOpening = prepareOpeningHand(run.combat!, content, 1);
    expect(cappedOpening.innateIds).toEqual(["c"]);
    expect(cappedOpening.combat.drawPile).toEqual(["a", "b", "d", "e"]);
    const config = parseGameConfig({ ...DEFAULT_GAME_CONFIG, cardsDrawnPerTurn: { ...DEFAULT_GAME_CONFIG.cardsDrawnPerTurn, value: 3 } });
    const counted = beginPlayerTurn(run, { nowMs: () => 0 }, config, content);
    expect(counted.combat!.hand).toEqual(["c", "a", "e"]);
    const extra = parseGameConfig({ ...config, innateCountsTowardDraw: { ...config.innateCountsTowardDraw, value: false } });
    expect(beginPlayerTurn(run, { nowMs: () => 0 }, extra, content).combat!.hand).toEqual(["c", "a", "e", "d", "b"]);
  });
});
