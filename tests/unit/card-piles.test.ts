import { describe, expect, it } from "vitest";
import { drawCards, moveCardFromHand, settleHandAtTurnEnd } from "../../src/domain/card-piles.js";
import type { CombatState } from "../../src/domain/schema.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

function combatWithPiles(): CombatState {
  return {
    ...validRun.combat!,
    cards: ["a", "b", "c", "d"].map((instanceId) => ({ instanceId, cardId: "card-strike", upgraded: false })),
    drawPile: ["a", "b"],
    hand: ["c"],
    discardPile: ["d"],
    exhaustPile: [],
    typing: { buffer: "", candidateCardInstanceIds: ["c"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null },
  };
}

function placedIds(combat: CombatState): string[] {
  return [...combat.drawPile, ...combat.hand, ...combat.discardPile, ...combat.exhaustPile].sort();
}

describe("card piles", () => {
  it("draws multiple cards from the top without mutating the source", () => {
    const before = combatWithPiles();
    const result = drawCards(before, 42, 2);
    expect(result.drawnIds).toEqual(["b", "a"]);
    expect(result.combat.hand).toEqual(["c", "b", "a"]);
    expect(result.combat.drawPile).toEqual([]);
    expect(result.combat.discardPile).toEqual(["d"]);
    expect(result.rngState).toBe(42);
    expect(before.drawPile).toEqual(["a", "b"]);
    expect(placedIds(result.combat)).toEqual(["a", "b", "c", "d"]);
    expect(drawCards(before, 42, 0).combat.typing).toBe(before.typing);
  });

  it("reshuffles discard when draw pile runs out and replays the same seed", () => {
    const before = combatWithPiles();
    const first = drawCards(before, 42, 4);
    const replay = drawCards(before, 42, 4);
    expect(first).toEqual(replay);
    expect(first.drawnIds).toEqual(["b", "a", "d"]);
    expect(first.combat.discardPile).toEqual([]);
    expect(placedIds(first.combat)).toEqual(["a", "b", "c", "d"]);
    expect(() => drawCards(before, 42, -1)).toThrow(RangeError);
  });

  it("leaves undrawn cards in place when the provisional hand cap is reached", () => {
    const before = combatWithPiles();
    const capped = drawCards(before, 42, 4, 2);
    expect(capped.drawnIds).toEqual(["b"]);
    expect(capped.combat.hand).toEqual(["c", "b"]);
    expect(capped.combat.drawPile).toEqual(["a"]);
    expect(capped.combat.discardPile).toEqual(["d"]);
    expect(placedIds(capped.combat)).toEqual(["a", "b", "c", "d"]);
    expect(() => drawCards(before, 42, 1, 0)).toThrow(RangeError);
  });

  it("does not auto-draw when the hand is empty", () => {
    const before = { ...combatWithPiles(), hand: [], typing: { ...combatWithPiles().typing, candidateCardInstanceIds: [] }, discardPile: ["c", "d"] };
    const settled = settleHandAtTurnEnd(before, () => "discard");
    expect(settled.hand).toEqual([]);
    expect(settled.drawPile).toEqual(["a", "b"]);
  });

  it("moves played, retained and ethereal cards into the correct zones", () => {
    const before = combatWithPiles();
    const played = moveCardFromHand(before, "c", "discard");
    expect(played.discardPile).toEqual(["d", "c"]);
    expect(played.hand).toEqual([]);
    expect(() => moveCardFromHand(played, "c", "discard")).toThrow(RangeError);

    const turnHand = { ...before, hand: ["b", "c", "d"], drawPile: ["a"], discardPile: [], typing: { ...before.typing, candidateCardInstanceIds: ["b", "c", "d"] } };
    const settled = settleHandAtTurnEnd(turnHand, (id) => id === "b" ? "retain" : id === "c" ? "exhaust" : "discard");
    expect(settled.hand).toEqual(["b"]);
    expect(settled.discardPile).toEqual(["d"]);
    expect(settled.exhaustPile).toEqual(["c"]);
    expect(settled.typing.candidateCardInstanceIds).toEqual(["b"]);
    expect(placedIds(settled)).toEqual(["a", "b", "c", "d"]);
  });

  it("round-trips the moved zones through run-state validation", () => {
    const before = combatWithPiles();
    const moved = moveCardFromHand(before, "c", "exhaust");
    const run = { ...validRun, rngState: 42, combat: moved };
    expect(parseRunState(JSON.parse(JSON.stringify(run)), validContent)).toEqual(run);
    const lost = { ...run, combat: { ...moved, exhaustPile: [] } };
    expect(() => parseRunState(lost, validContent)).toThrow("Card is not in any pile");
  });
});
