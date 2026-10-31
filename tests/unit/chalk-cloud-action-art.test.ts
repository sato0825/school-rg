import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { chalkCloudActionArt } from "../../src/ui/chalk-cloud-action-art.js";
import { enemyActionArtById, enemyActionForIntent } from "../../src/ui/enemy-action-art.js";

describe("chalk cloud action candidate", () => {
  it("maps every live Intent to a distinct authored pose without storing gameplay values in art", () => {
    const enemy = demoContent.enemies.find((candidate) => candidate.id === chalkCloudActionArt.enemyId)!;
    expect(Object.keys(chalkCloudActionArt.intents).sort()).toEqual([...enemy.intentIds].sort());
    expect(new Set(Object.values(chalkCloudActionArt.intents).map(({ pose }) => pose)).size).toBe(enemy.intentIds.length);
    expect(chalkCloudActionArt.intents["chalk-intent-hit"].pose).toBe("attack");
    expect(chalkCloudActionArt.intents["chalk-intent-weak"].pose).toBe("status");
    expect(chalkCloudActionArt.hit).toContain("chalk-cloud-hit-candidate-v1.png");
    expect(enemyActionArtById[enemy.id]).toBe(chalkCloudActionArt);
    expect(enemyActionForIntent(enemyActionArtById[enemy.id], "chalk-intent-hit")?.pose).toBe("attack");
    expect(enemyActionForIntent(enemyActionArtById[enemy.id], "chalk-intent-weak")?.pose).toBe("status");
    expect(enemyActionForIntent(enemyActionArtById[enemy.id], "paper-intent-hit")).toBeNull();
  });
});
