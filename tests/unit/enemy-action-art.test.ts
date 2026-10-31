import { describe, expect, it } from "vitest";
import { enemyActionArtById, enemyActionForIntent, type EnemyActionArt } from "../../src/ui/enemy-action-art.js";

describe("enemy action art routing", () => {
  it("uses the same enemy's explicit Intent mapping and leaves unknown Intents idle", () => {
    const paper = enemyActionArtById["paper-heap"];
    expect(enemyActionForIntent(paper, "paper-intent-hit")?.pose).toBe("attack");
    expect(enemyActionForIntent(paper, "paper-intent-guard")?.pose).toBe("guard");
    expect(enemyActionForIntent(paper, "hall-intent-hit")).toBeNull();
    expect(enemyActionForIntent(undefined, "paper-intent-hit")).toBeNull();
  });

  it("can route a mixed Intent to its own authored pose without inferring it from effect type", () => {
    const mixed: EnemyActionArt = {
      artId: "enemy-gate-action", version: "candidate-test", hit: "hit.png",
      intents: { "gate-intent-brace": { pose: "mixed", url: "brace.png" } },
    };
    expect(enemyActionForIntent(mixed, "gate-intent-brace")).toEqual({ pose: "mixed", url: "brace.png" });
    expect(enemyActionForIntent(mixed, "gate-intent-heavy")).toBeNull();
  });
});
