import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { enemyCandidateUrlById } from "../../src/ui/enemy-presentation.js";

it("has an image source for every registered enemy", () => {
  for (const enemy of demoContent.enemies) expect(demoBattleArt.enemyUrlById[enemy.id]).toBeTruthy();
});

it("gives the representative school enemies distinct, replaceable candidate art", () => {
  expect(Object.keys(enemyCandidateUrlById)).toHaveLength(10);
  expect(new Set(Object.values(enemyCandidateUrlById)).size).toBe(10);
  for (const [id, url] of Object.entries(enemyCandidateUrlById)) {
    expect(demoBattleArt.enemyUrlById[id]).toBe(url);
    expect(demoContent.enemies.some((enemy) => enemy.id === id)).toBe(true);
  }
});
