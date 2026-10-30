import { describe, expect, it } from "vitest";
import { baseCardDefinitions, baseCardEffects, baseCardSpecs } from "../../src/content/base-cards.js";
import { parseContentRegistry } from "../../src/domain/validate.js";
import { validContent } from "../fixtures/domain.js";

const sheetWords = [
  "strike", "defend", "heavy strike", "quick attack", "guard", "heal", "draw", "strengthen",
  "weaken", "poison", "sweep", "pierce", "counter", "recover", "exhaust", "duplicate",
  "boost", "cleanse", "barrier", "focus", "sacrifice", "finish", "delay", "shield break",
];

describe("basic card catalog from the source sheet", () => {
  it("keeps all 24 source rows, unique IDs and exact typing words in order", () => {
    expect(baseCardSpecs.map((spec) => spec.sourceRow)).toEqual(Array.from({ length: 24 }, (_, index) => index + 2));
    expect(baseCardDefinitions.map((card) => card.id)).toEqual(Array.from({ length: 24 }, (_, index) => `BASE-${String(index + 1).padStart(3, "0")}`));
    expect(baseCardDefinitions.map((card) => card.input.text)).toEqual(sheetWords);
    expect(new Set(baseCardDefinitions.map((card) => card.input.text)).size).toBe(24);
  });

  it("has valid targets and resolvable effects in the full content registry", () => {
    const content = structuredClone(validContent);
    content.effects.push(...baseCardEffects);
    content.cards.push(...baseCardDefinitions);
    expect(parseContentRegistry(content)).toEqual(content);
    expect(baseCardDefinitions.find((card) => card.id === "BASE-011")?.target).toBe("all_enemies");
    expect(baseCardDefinitions.filter((card) => card.target === "hand").map((card) => card.id)).toEqual(["BASE-015", "BASE-016"]);
    expect(baseCardEffects.find((effect) => effect.id === "BASE-022-effect")?.parameters).toMatchObject({ thresholdPercent: 50 });
    expect(baseCardSpecs.find((spec) => spec.id === "BASE-022")?.decisionIssue).toBe(48);
  });

  it("rejects a missing future upgrade effect reference", () => {
    const content = structuredClone(validContent);
    content.effects.push(...baseCardEffects);
    content.cards.push(...baseCardDefinitions);
    content.cards.find((card) => card.id === "BASE-001")!.upgradeEffectIds = ["missing-upgrade-effect"];
    expect(() => parseContentRegistry(content)).toThrow("missing-upgrade-effect");
  });
});
