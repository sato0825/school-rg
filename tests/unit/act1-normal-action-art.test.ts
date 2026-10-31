import { describe, expect, it } from "vitest";
import { variantEnemyIntents } from "../../src/content/encounter-variants.js";
import { extraEnemyIntents } from "../../src/content/extra-enemies.js";
import { runEnemyIntents } from "../../src/content/run-enemies.js";
import { act1NormalActionArtById } from "../../src/ui/act1-normal-action-art.js";
import { enemyActionForIntent } from "../../src/ui/enemy-action-art.js";

describe("Act 1 normal action art", () => {
  const expected = [
    ["late-pass", "late-pass-intent-hit", "attack"],
    ["late-pass", "late-pass-intent-weak", "status"],
    ["lost-homework", "homework-intent-hit", "attack"],
    ["lost-homework", "homework-intent-weak", "status"],
    ["folded-school-map", "map-intent-hit", "attack"],
    ["folded-school-map", "map-intent-call", "summon"],
  ] as const;

  it.each(expected)("%s selects its own %s pose", (enemyId, intentId, pose) => {
    const art = act1NormalActionArtById[enemyId];
    const intent = [...variantEnemyIntents, ...extraEnemyIntents, ...runEnemyIntents].find((item) => item.id === intentId);
    expect(intent).toBeDefined();
    expect(enemyActionForIntent(art, intentId)?.pose).toBe(pose);
    expect(enemyActionForIntent(art, intentId)?.url).toContain(`${enemyId}-`);
    expect(art.hit).toContain(`${enemyId}-hit`);
  });

  it("does not borrow another enemy's or a missing mixed Intent's image", () => {
    expect(enemyActionForIntent(act1NormalActionArtById["late-pass"], "homework-intent-hit")).toBeNull();
    expect(enemyActionForIntent(act1NormalActionArtById["hall-mop"], "mop-intent-sweep")).toBeNull();
  });
});
