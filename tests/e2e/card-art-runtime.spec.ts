import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";

const pool: EncounterPool = { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] };
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const clubs = [
  { club: "literature-demo", name: "literature", ids: ["LIT-007", "LIT-012", "LIT-004"] },
  { club: "science-demo", name: "science", ids: ["SCI-008", "SCI-010"] },
  { club: "kendo-demo", name: "kendo", ids: ["KEN-007", "KEN-008"] },
  { club: "music-demo", name: "music", ids: ["MUS-007", "MUS-008"] },
  { club: "art-demo", name: "art", ids: ["ART-007", "ART-009"] },
] as const;

function stagedCombat(club: string, cardIds: readonly string[]) {
  const start = createRunSession(42, club, demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, pool);
  const active = beginPlayerTurn(entered.run, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, demoContent);
  let combat = active.combat!;
  const hand: string[] = [];
  for (const cardId of cardIds) {
    const result = createCombatCard(combat, demoContent, cardId, false, "hand", { maxHandSize: 10 });
    combat = result.combat;
    hand.push(result.instanceId);
  }
  combat = { ...combat, hand, drawPile: combat.cards.map((card) => card.instanceId).filter((id) => !hand.includes(id)),
    discardPile: [], exhaustPile: [], resolvingPile: [], phase: "PLAYER_INPUT",
    typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0,
      targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return serializeRunSession({ ...entered, run: { ...active, combat } }, demoContent, { nowMs: () => 0 }, () => "discard");
}

function stagedReward(club: string, ids: readonly string[]) {
  const start = createRunSession(42, club, demoContent, mapOptions);
  return serializeRunSession({ ...start, screen: "reward", rewardCardIds: [...ids] }, demoContent,
    { nowMs: () => 0 }, () => "discard");
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  for (const { club, name, ids } of clubs) {
    test(`${name} candidate art appears in real hand and rewards at ${viewport.width}`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize(viewport);
      const handIds = [...ids, "BASE-023"];
      await page.addInitScript((saved) => localStorage.setItem("school-rg-run-v1", saved), stagedCombat(club, handIds));
      await page.goto("/?seed=42");
      for (const cardId of handIds) {
        const card = page.locator(`.hand .card[data-art-id="card.${cardId}"]`);
        await expect(card.locator('.card-art[data-art-state="candidate"] img')).toBeVisible();
        expect(await card.locator(".card-art img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        expect(await card.evaluate((element) => {
          const word = element.querySelector(".card-word")!.getBoundingClientRect();
          const effect = element.querySelector(".card-effect")!.getBoundingClientRect();
          const frame = element.getBoundingClientRect();
          return word.bottom <= effect.top && effect.bottom <= frame.bottom;
        })).toBe(true);
      }
      if (name === "kendo") {
        const kendo = await page.locator('.hand .card[data-art-id="card.KEN-007"] .card-art img').getAttribute("src");
        expect(kendo).toContain("ken-sweep-candidate-v1");
        expect(kendo).not.toContain("base-sweep");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/art/previews/issue329/${name}-${viewport.width}-hand.png` });

      await page.evaluate((saved) => localStorage.setItem("school-rg-run-v1", saved), stagedReward(club, [...ids.slice(0, 2), "BASE-023"]));
      await page.reload();
      for (const cardId of [...ids.slice(0, 2), "BASE-023"]) {
        const card = page.locator(`.reward-card[data-art-id="card.${cardId}"]`);
        await expect(card.locator('.card-art[data-art-state="candidate"] img')).toBeVisible();
        expect(await card.locator(".card-art img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        expect(await card.evaluate((element) => {
          const word = element.querySelector("strong")!.getBoundingClientRect();
          const effect = element.querySelector(".offer-description")!.getBoundingClientRect();
          const frame = element.getBoundingClientRect();
          return word.bottom <= effect.top && effect.bottom <= frame.bottom;
        })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/art/previews/issue329/${name}-${viewport.width}-reward.png` });
    });
  }
}
