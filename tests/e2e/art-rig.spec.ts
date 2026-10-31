import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

test.use({ video: "on" });
const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function artOpening(options: { enemyCount?: number; enemyHp?: number; playerHp?: number; handCardIds?: readonly string[] } = {}) {
  const start = createRunSession(42, "art-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const combat = entered.run.combat!;
  const cards = [...combat.cards];
  const hand = (options.handCardIds ?? ["ART-001", "ART-002"]).map((cardId) => {
    const existing = cards.find((card) => card.cardId === cardId);
    if (existing) return existing.instanceId;
    const replaceIndex = cards.findIndex((card) => card.cardId === "BASE-001");
    if (replaceIndex < 0) throw new Error(`no available card slot for ${cardId}`);
    cards[replaceIndex] = { ...cards[replaceIndex]!, cardId };
    return cards[replaceIndex]!.instanceId;
  });
  const enemies = options.enemyCount === 2
    ? [...combat.enemies, { ...combat.enemies[0]!, instanceId: "enemy-2" }]
    : [...combat.enemies];
  if (options.enemyHp !== undefined) enemies[0] = { ...enemies[0]!, hp: options.enemyHp };
  const staged = { ...combat, phase: "PLAYER_INPUT" as const, hand, enemies, cards,
    drawPile: cards.map((card) => card.instanceId).filter((id) => !hand.includes(id)),
    discardPile: [], exhaustPile: [], resolvingPile: [],
    typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0,
      targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return serializeRunSession({ ...entered, run: { ...entered.run,
    player: options.playerHp === undefined ? entered.run.player : { ...entered.run.player, hp: options.playerHp, block: 0 },
    combat: staged } }, demoContent,
    { nowMs: () => 0 }, () => "discard");
}

async function openArtBattle(page: import("@playwright/test").Page, saved = artOpening()) {
  await page.clock.install();
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("art-rig-seeded")) return;
    localStorage.setItem("school-rg-run-v1", value);
    sessionStorage.setItem("art-rig-seeded", "1");
  }, saved);
  await page.goto("/", { waitUntil: "domcontentloaded" });
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
    await expect(actor.locator(".hero-rig")).toHaveAttribute("data-rig-id", "art-rig-candidate-v3");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(7);
    await expect(actor.locator('[data-part="head"]')).toHaveCSS("scale", "1.1");
    const before = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    await page.screenshot({ path: test.info().outputPath("idle.png") });
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((node, previous) => node === previous, rigNode)).toBe(true);
    await page.keyboard.type("frame");
    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    await expect(actor.locator('[data-part="right-arm-brush"]')).toHaveCSS("animation-name", "art-use-brush");
    await expect(actor.locator('[data-part="left-arm-board"]')).toHaveCSS("animation-name", "art-use-board");
    await expect(actor.locator(".rig-paint-trace")).toHaveCSS("animation-name", "art-paint-trace");
    await expect(actor).toHaveAttribute("data-art-action", "retain");
    await page.screenshot({ path: test.info().outputPath("card-use.png") });
    expect(await actor.boundingBox()).toEqual(before);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
  });
}

test("the whole-body fallback stays visible until every art layer decodes", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  let routed = 0;
  await page.route("**/art-rig-parts-v2/*.png", async (route) => {
    routed++;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.continue();
  });
  const actor = await openArtBattle(page);
  expect(routed).toBeGreaterThan(0);
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
});

test("quiet/reload preserves complete art layers", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  const actor = await openArtBattle(page);
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await page.reload();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("quiet effects retain the art student hit expression without moving limbs", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  const actor = await openArtBattle(page);
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("two enemies preserve the art student floor anchor and target display", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const actor = await openArtBattle(page, artOpening({ enemyCount: 2 }));
  await expect(page.locator(".stage")).toHaveAttribute("data-enemy-count", "2");
  await expect(page.locator(".enemy-slot")).toHaveCount(2);
  const before = await actor.boundingBox();
  await page.keyboard.type("frame");
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  expect(await actor.boundingBox()).toEqual(before);
  await page.screenshot({ path: test.info().outputPath("two-enemies.png") });
});

test("art student stays on stage for the last typed hit before victory", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const actor = await openArtBattle(page, artOpening({ enemyHp: 1 }));
  await page.keyboard.type("sketch");
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  await expect(actor.locator('[data-part="right-arm-brush"]')).toHaveCSS("animation-name", "art-use-brush");
  await page.clock.runFor(380);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.screen)).toBe("reward");
});

test("art student reacts to a terminal enemy hit before defeat", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const actor = await openArtBattle(page, artOpening({ playerHp: 1 }));
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  await expect(actor.locator('[data-part="head-hit"]')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("last-hit.png") });
  await page.clock.runFor(420);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.screen)).toBe("lost");
});

for (const [cardId, word, cue] of [["ART-003", "paint", "copy"], ["ART-005", "redraw", "transform"]] as const) {
  test(`art ${word} shows its own ${cue} mark after choosing a hand target`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const actor = await openArtBattle(page, artOpening({ handCardIds: [cardId, "ART-002"] }));
    await page.keyboard.type(word);
    await page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: /^frame$/ }) }).click();
    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    await expect(actor).toHaveAttribute("data-art-action", cue);
    await expect(actor.locator(".rig-art-token")).toHaveCSS("animation-name", "art-token-in");
    await page.clock.runFor(220);
    expect(Number(await actor.locator(".rig-art-token").evaluate((node) => getComputedStyle(node).opacity))).toBeGreaterThan(0.5);
    await page.screenshot({ path: test.info().outputPath(`${cue}-mark.png`) });
  });
}
