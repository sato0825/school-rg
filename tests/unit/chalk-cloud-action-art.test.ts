import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { chalkCloudActionArt } from "../../src/ui/chalk-cloud-action-art.js";

describe("chalk cloud action candidate", () => {
  it("maps every live Intent to a distinct authored pose without storing gameplay values in art", () => {
    const enemy = demoContent.enemies.find((candidate) => candidate.id === chalkCloudActionArt.enemyId)!;
    expect(Object.keys(chalkCloudActionArt.intentPoseById).sort()).toEqual([...enemy.intentIds].sort());
    expect(new Set(Object.values(chalkCloudActionArt.intentPoseById)).size).toBe(enemy.intentIds.length);
    expect(chalkCloudActionArt.intentPoseById["chalk-intent-hit"]).toBe("attack");
    expect(chalkCloudActionArt.intentPoseById["chalk-intent-weak"]).toBe("weak");
    expect(chalkCloudActionArt.poses.hit).toContain("chalk-cloud-hit-candidate-v1.png");
  });
});
