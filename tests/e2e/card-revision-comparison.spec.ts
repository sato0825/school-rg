import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";

const stage = process.env.SCHOOL_RG_REVISION_STAGE === "before" ? "before" : "after";
const versions = stage === "before" ? {
  "KEN-002": "issue277-v1", "KEN-004": "issue284-v1", "KEN-009": "issue269-v1", "KEN-011": "issue269-v2",
  "BASE-017": "issue284-v2", "BASE-023": "issue242-v1",
} : {
  "KEN-002": "issue343-v2", "KEN-004": "issue343-v2", "KEN-009": "issue343-v2", "KEN-011": "issue343-v4",
  "BASE-017": "issue343-v3", "BASE-023": "issue343-v2",
};
const affected = new Set(Object.keys(versions));
const pool: EncounterPool = { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] };
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
const clubs = [
  { id: "literature-demo", name: "literature", hand: ["BASE-017", "BASE-023", "LIT-003", "LIT-004"], reward: [["BASE-017", "BASE-023", "LIT-003"]] },
  { id: "science-demo", name: "science", hand: ["BASE-017", "BASE-023", "SCI-002", "SCI-003"], reward: [["BASE-017", "BASE-023", "SCI-002"]] },
  { id: "kendo-demo", name: "kendo", hand: ["KEN-002", "KEN-004", "KEN-009", "KEN-011", "BASE-017", "BASE-023"], reward: [["KEN-002", "KEN-004", "KEN-009"], ["KEN-011", "BASE-017", "BASE-023"]] },
  { id: "music-demo", name: "music", hand: ["BASE-017", "BASE-023", "MUS-001", "MUS-002"], reward: [["BASE-017", "BASE-023", "MUS-001"]] },
  { id: "art-demo", name: "art", hand: ["BASE-017", "BASE-023", "ART-002", "ART-003"], reward: [["BASE-017", "BASE-023", "ART-002"]] },
] as const;

function combatSave(club: string, ids: readonly string[]) {
  const start = createRunSession(46, club, demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, pool);
  const active = beginPlayerTurn(entered.run, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, demoContent);
  let combat = active.combat!;
  const hand: string[] = [];
  for (const cardId of ids) {
    const result = createCombatCard(combat, demoContent, cardId, false, "hand", { maxHandSize: null });
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

function rewardSave(club: string, ids: readonly string[]) {
  const start = createRunSession(46, club, demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, pool);
  return serializeRunSession({ ...entered, run: { ...entered.run, combat: { ...entered.run.combat!, phase: "WON" } },
    screen: "reward", rewardCardIds: [...ids] }, demoContent, { nowMs: () => 0 }, () => "discard");
}

async function assertCard(card: import("@playwright/test").Locator, id: string, reward: boolean) {
  await expect(card.locator('.card-art[data-art-state="candidate"] img')).toBeVisible();
  expect(await card.locator(".card-art img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), id).toBe(true);
  if (affected.has(id)) await expect(card).toHaveAttribute("data-art-version", versions[id as keyof typeof versions]);
  const geometry = await card.evaluate((element, isReward) => {
    const word = element.querySelector(isReward ? "strong" : ".card-word")!.getBoundingClientRect();
    const effect = element.querySelector(isReward ? ".offer-description" : ".card-effect")!.getBoundingClientRect();
    const frame = element.getBoundingClientRect();
    return { wordBottom: word.bottom, effectTop: effect.top, effectBottom: effect.bottom, frameBottom: frame.bottom };
  }, reward);
  expect(geometry.wordBottom <= geometry.effectTop && geometry.effectBottom <= geometry.frameBottom, `${id}: ${JSON.stringify(geometry)}`).toBe(true);
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  for (const club of clubs) {
    test(`${stage} ${club.name} revised candidates at ${viewport.width}`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize(viewport);
      await page.addInitScript((saved) => localStorage.setItem("school-rg-run-v1", saved), combatSave(club.id, club.hand));
      await page.goto("/?seed=46");
      await expect(page.locator(".game")).toHaveAttribute("data-club", club.id);
      for (const id of club.hand) await assertCard(page.locator(`.hand .card[data-art-id="card.${id}"]`), id, false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/art/previews/issue352/${club.name}-${viewport.width}-hand-${stage}.png` });
      const context = page.context();
      await page.close();

      for (const [index, ids] of club.reward.entries()) {
        const rewardPage = await context.newPage();
        await rewardPage.setViewportSize(viewport);
        await rewardPage.addInitScript((saved) => localStorage.setItem("school-rg-run-v1", saved), rewardSave(club.id, ids));
        await rewardPage.goto("/?seed=46");
        for (const id of ids) await assertCard(rewardPage.locator(`.reward-card[data-art-id="card.${id}"]`), id, true);
        expect(await rewardPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await rewardPage.screenshot({ path: `docs/art/previews/issue352/${club.name}-${viewport.width}-reward-${index + 1}-${stage}.png` });
        await rewardPage.close();
      }
    });
  }
}
