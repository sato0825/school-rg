import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

test.use({ video: "on" });
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function artOpening() {
  const start = createRunSession(42, "art-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const combat = entered.run.combat!;
  const sketch = combat.cards.find((card) => card.cardId === "ART-001")!.instanceId;
  const frame = combat.cards.find((card) => card.cardId === "ART-002")!.instanceId;
  const hand = [sketch, frame];
  const staged = { ...combat, phase: "PLAYER_INPUT" as const, hand,
    drawPile: combat.cards.map((card) => card.instanceId).filter((id) => !hand.includes(id)),
    discardPile: [], exhaustPile: [], resolvingPile: [],
    typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0,
      targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return serializeRunSession({ ...entered, run: { ...entered.run, combat: staged } }, demoContent,
    { nowMs: () => 0 }, () => "discard");
}

async function openArtBattle(page: import("@playwright/test").Page) {
  await page.clock.install();
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("art-rig-seeded")) return;
    localStorage.setItem("school-rg-run-v1", value);
    sessionStorage.setItem("art-rig-seeded", "1");
  }, artOpening());
  await page.goto("/");
  await page.getByRole("button", { name: "再開" }).click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-actor-rig", "art-v1");
  return actor;
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`art rig has grounded brush/card action at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const actor = await openArtBattle(page);
    const stage = page.locator(".game-shell .stage");
    await expect(actor).toHaveAttribute("data-rig-ready", "true");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(7);
    const before = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((node, previous) => node === previous, rigNode)).toBe(true);
    await page.keyboard.type("frame");
    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    expect(await actor.locator('[data-part="right-arm-brush"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("art-use-brush");
    expect(await actor.locator('[data-part="left-arm-board"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("art-use-board");
    expect(await actor.boundingBox()).toEqual(before);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
  });
}

test("the whole-body fallback stays visible until every art layer decodes", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route("**/art-rig-parts-v2/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  const actor = await openArtBattle(page);
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
});

test("quiet/reload preserves complete art layers and a readable hit", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  const actor = await openArtBattle(page);
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await page.reload();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await page.keyboard.type("frame");
  await page.clock.runFor(500);
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});
