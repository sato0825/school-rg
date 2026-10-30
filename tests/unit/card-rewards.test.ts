import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { generateCardRewards } from "../../src/domain/card-rewards.js";
import { shuffle } from "../../src/domain/random.js";
import { validContent } from "../fixtures/domain.js";

describe("provisional club reward policy", () => {
  it("offers a unique signature choice for every club and replays each seed", () => {
    for (const club of demoContent.clubs) for (const seed of [0, 1, 42, 999]) {
      const offered = generateCardRewards(seed, club);
      expect(offered.cardIds).toHaveLength(3);
      expect(new Set(offered.cardIds).size).toBe(3);
      expect(offered.cardIds.some((id) => club.signatureCardIds?.includes(id))).toBe(true);
      expect(generateCardRewards(seed, club)).toEqual(offered);
    }
    expect(generateCardRewards(42, demoContent.clubs[0]!).cardIds).not.toEqual(generateCardRewards(43, demoContent.clubs[0]!).cardIds);
  });

  it("falls back to uniform draws without a signature pool and handles small pools", () => {
    const club = validContent.clubs[0]!;
    const offered = generateCardRewards(42, club);
    expect(offered.cardIds).toEqual(shuffle(42, club.cardPoolIds).items);
    expect(generateCardRewards(42, { ...club, cardPoolIds: ["card-strike", "card-strike"], signatureCardIds: ["card-strike"] }).cardIds).toEqual(["card-strike"]);
    expect(() => generateCardRewards(42, club, { choiceCount: 3, minimumSignatureCards: 4 })).toThrow(/policy/);
  });
});
