import { describe, expect, it } from "vitest";
import {
  cardZone,
  createCombatCard,
  duplicateCombatCard,
  moveCombatCard,
  recoverCombatCard,
  transformCombatCard,
} from "../../src/domain/card-operations.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

const noLimit = { maxHandSize: null };

describe("combat card operations", () => {
  it("creates, duplicates and transforms while preserving unique references through save/restore", () => {
    const original = structuredClone(validRun);
    const created = createCombatCard(original.combat!, validContent, "card-draft", false, "hand", noLimit);
    expect(created.instanceId).toBe("created-1");
    expect(created.events.map((event) => event.kind)).toEqual(["created", "moved"]);
    const duplicated = duplicateCombatCard(created.combat, created.instanceId, "discardPile", noLimit);
    expect(duplicated.instanceId).toBe("created-2");
    expect(duplicated.events.map((event) => event.kind)).toEqual(["duplicated", "moved"]);
    const transformed = transformCombatCard(duplicated.combat, validContent, duplicated.instanceId, "card-strike", true);
    expect(transformed.combat.cards.find((card) => card.instanceId === "created-2")).toMatchObject({ cardId: "card-strike", upgraded: true });
    expect(cardZone(transformed.combat, "created-2")).toBe("discardPile");
    const run = { ...original, combat: transformed.combat };
    expect(parseRunState(JSON.parse(JSON.stringify(run)), validContent)).toEqual(run);
    expect(original.combat!.cards).toHaveLength(1);
    expect(original.deck).toHaveLength(1);
    expect(createCombatCard(transformed.combat, validContent, "card-draft", false, "drawPile", noLimit).instanceId).toBe("created-3");
  });

  it("recovers and exhausts from explicit zones with ordered lifecycle events", () => {
    const combat = structuredClone(validRun.combat!);
    const spent = moveCombatCard(combat, "combat-1", "exhaustPile", noLimit);
    expect(spent.combat.hand).toEqual([]);
    expect(spent.events).toEqual([{ kind: "moved", instanceId: "combat-1", from: "hand", to: "exhaustPile" }]);
    const recovered = recoverCombatCard(spent.combat, "combat-1", "hand", noLimit);
    expect(recovered.events.map((event) => event.kind)).toEqual(["moved", "recovered"]);
    expect(recovered.combat.hand).toEqual(["combat-1"]);
    expect(recovered.combat.typing.buffer).toBe("");
    expect(() => recoverCombatCard(recovered.combat, "combat-1", "hand", noLimit)).toThrow("cannot be recovered");
  });

  it("rejects invalid definitions, missing or multiply placed instances and explicit hand caps", () => {
    const combat = structuredClone(validRun.combat!);
    expect(() => createCombatCard(combat, validContent, "missing", false, "hand", noLimit)).toThrow("unknown card definition");
    expect(() => duplicateCombatCard(combat, "missing", "hand", noLimit)).toThrow("unknown card instance");
    expect(() => createCombatCard(combat, validContent, "card-draft", false, "hand", { maxHandSize: 1 })).toThrow("hand limit");
    expect(() => moveCombatCard(combat, "combat-1", "drawPile", { maxHandSize: 0 })).toThrow(RangeError);
    combat.drawPile.push("combat-1");
    expect(() => cardZone(combat, "combat-1")).toThrow("exactly one zone");
  });

  it("does not create a movement event for a same-zone operation", () => {
    const combat = structuredClone(validRun.combat!);
    const same = moveCombatCard(combat, "combat-1", "hand", noLimit);
    expect(same.combat).toBe(combat);
    expect(same.events).toEqual([]);
  });
});
