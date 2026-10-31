import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";

const pool: EncounterPool = { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] };
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const batches = [
  { name: "basic", ids: ["BASE-004", "BASE-005", "BASE-006", "BASE-008", "BASE-009"] },
  { name: "advanced", ids: ["BASE-010", "BASE-012", "BASE-014", "BASE-015", "BASE-018"] },
] as const;

function combatSave(ids: readonly string[]) {
  const start = createRunSession(43, "literature-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, pool);
  const active = beginPlayerTurn(entered.run, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, demoContent);
  let combat = active.combat!;
  const hand: string[] = [];
  for (const cardId of ids) {
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

function rewardSave(ids: readonly string[]) {
  const start = createRunSession(43, "literature-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, pool);
  return serializeRunSession({ ...entered, run: { ...entered.run, combat: { ...entered.run.combat!, phase: "WON" } },
    screen: "reward", rewardCardIds: [...ids] }, demoContent, { nowMs: () => 0 }, () => "discard");
}

async function assertLoadedCard(card: import("@playwright/test").Locator, cardId: string, reward: boolean) {
  await expect(card.locator('.card-art[data-art-state="candidate"] img')).toBeVisible();
  expect(await card.locator(".card-art img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), cardId).toBe(true);
  const geometry = await card.evaluate((element, isReward) => {
    const word = element.querySelector(isReward ? "strong" : ".card-word")!.getBoundingClientRect();
    const effect = element.querySelector(isReward ? ".offer-description" : ".card-effect")!.getBoundingClientRect();
    const frame = element.getBoundingClientRect();
    return { wordBottom: word.bottom, effectTop: effect.top, effectBottom: effect.bottom, frameBottom: frame.bottom };
  }, reward);
  expect(geometry.wordBottom <= geometry.effectTop && geometry.effectBottom <= geometry.frameBottom, `${cardId}: ${JSON.stringify(geometry)}`).toBe(true);
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  for (const batch of batches) {
    test(`${batch.name} common art in live hand and rewards at ${viewport.width}`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize(viewport);
      await page.addInitScript((saved) => localStorage.setItem("school-rg-run-v1", saved), combatSave(batch.ids));
      await page.goto("/?seed=43");
      for (const cardId of batch.ids) await assertLoadedCard(page.locator(`.hand .card[data-art-id="card.${cardId}"]`), cardId, false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/art/previews/issue341/${batch.name}-${viewport.width}-hand-v1.png` });
      const context = page.context();
      await page.close();

      for (const [index, offerIds] of [[...batch.ids.slice(0, 3)], [...batch.ids.slice(3), batch.ids[0]!]].entries()) {
        const rewardPage = await context.newPage();
        await rewardPage.setViewportSize(viewport);
        await rewardPage.addInitScript((saved) => localStorage.setItem("school-rg-run-v1", saved), rewardSave(offerIds));
        await rewardPage.goto("/?seed=43");
        for (const cardId of offerIds) await assertLoadedCard(rewardPage.locator(`.reward-card[data-art-id="card.${cardId}"]`), cardId, true);
        expect(await rewardPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await rewardPage.screenshot({ path: `docs/art/previews/issue341/${batch.name}-${viewport.width}-reward-${index + 1}-v1.png` });
        await rewardPage.close();
      }
    });
  }
}
