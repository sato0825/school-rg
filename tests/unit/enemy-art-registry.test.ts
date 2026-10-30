import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";

it("has an image source for every registered enemy", () => {
  for (const enemy of demoContent.enemies) expect(demoBattleArt.enemyUrlById[enemy.id]).toBeTruthy();
});
