import { describe, expect, it } from "vitest";
import { DomainValidationError, parseContentRegistry, parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

function errorIssues(fn: () => unknown) {
  try {
    fn();
    throw new Error("Expected a validation error");
  } catch (error) {
    if (!(error instanceof DomainValidationError)) throw error;
    return error.issues;
  }
}

describe("versioned content and run schemas", () => {
  it("accepts a registry with separate input words, effect IDs, and club decks", () => {
    const registry = parseContentRegistry(validContent);
    expect(registry.cards[0]?.input.text).toBe("strike");
    expect(registry.cards[0]?.effectIds).toEqual(["effect-damage"]);
    expect(registry.clubs.map(({ starterCardIds }) => starterCardIds)).toEqual([["card-strike"], ["card-draft"]]);
    expect(parseRunState(validRun, registry)).toEqual(validRun);
  });

  it("rejects unsupported schema versions and malformed input words", () => {
    const old = structuredClone(validContent) as Record<string, unknown>;
    old.schemaVersion = 0;
    expect(errorIssues(() => parseContentRegistry(old))).toContainEqual(expect.objectContaining({ code: "SCHEMA_INVALID", path: "schemaVersion" }));
    const malformed = structuredClone(validContent);
    malformed.cards[0]!.input.text = "bad\nword";
    expect(errorIssues(() => parseContentRegistry(malformed))).toContainEqual(expect.objectContaining({ code: "SCHEMA_INVALID", path: "cards.0.input.text" }));
  });

  it("reports every unregistered content reference with its path", () => {
    const invalid = structuredClone(validContent);
    invalid.cards[0]!.effectIds = ["effect-missing"];
    invalid.clubs[1]!.starterCardIds = ["card-missing"];
    const issues = errorIssues(() => parseContentRegistry(invalid));
    expect(issues).toContainEqual({ code: "UNKNOWN_REFERENCE", path: "cards.0.effectIds.0", message: "Unregistered ID: effect-missing" });
    expect(issues).toContainEqual({ code: "UNKNOWN_REFERENCE", path: "clubs.1.starterCardIds.0", message: "Unregistered ID: card-missing" });
  });

  it("rejects duplicate definition IDs", () => {
    const invalid = structuredClone(validContent);
    invalid.cards.push(structuredClone(invalid.cards[0]!));
    expect(errorIssues(() => parseContentRegistry(invalid))).toContainEqual(expect.objectContaining({ code: "DUPLICATE_ID", path: "cards.2.id" }));
  });

  it("rejects unknown run IDs and a card in two piles", () => {
    const invalid = structuredClone(validRun);
    invalid.clubId = "club-missing";
    invalid.combat!.discardPile.push("combat-1");
    invalid.combat!.typing.targetEnemyInstanceId = "enemy-missing";
    const issues = errorIssues(() => parseRunState(invalid, validContent));
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_REFERENCE", path: "clubId" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "INVALID_STATE", path: "combat.discardPile.0" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_REFERENCE", path: "combat.typing.targetEnemyInstanceId" }));
  });

  it("rejects unregistered card IDs and disconnected map references", () => {
    const invalid = structuredClone(validRun);
    invalid.deck[0]!.cardId = "card-missing";
    invalid.map.nodes[0]!.nextIds = ["node-missing"];
    const issues = errorIssues(() => parseRunState(invalid, validContent));
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_REFERENCE", path: "deck.0.cardId" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_REFERENCE", path: "map.nodes.0.nextIds.0" }));
  });
});
