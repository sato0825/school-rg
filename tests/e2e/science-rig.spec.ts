import { expect, test } from "@playwright/test";

async function enterScienceBattle(page: import("@playwright/test").Page) {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /科学部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  return actor;
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`science rig anchors idle and card-use on the fixed stage at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(viewport);
    const actor = await enterScienceBattle(page);
    const stage = page.locator(".game-shell .stage");
    const actorBefore = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await expect(actor).toHaveAttribute("data-actor-rig", "science-v1");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(8);
    expect(await actor.locator('[data-part="left-leg"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("science-observe-left-leg");
    expect(await actor.locator('[data-part="right-leg"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("science-observe-right-leg");
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((node, previous) => node === previous, rigNode)).toBe(true);
    const word = (await page.locator(".card-word").first().textContent())!.trim();
    await page.keyboard.type(word);
    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    expect(await actor.locator('[data-part="right-arm-pen"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("science-card-pen");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
  });
}

test("first render and reload hide unfinished layers, including quiet mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.route("**/science-rig-parts-v1/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /科学部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).not.toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  const word = (await page.locator(".card-word").first().textContent())!.trim();
  await page.keyboard.type(word);
  const savedHand = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.hand.length as number);
  await page.reload();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.hand.length as number)).toBe(savedHand);
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await actor.locator('[data-part="left-leg"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await actor.locator('[data-part="right-leg"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("enemy turn reveals hit expression while actor anchor remains fixed", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const actor = await enterScienceBattle(page);
  const before = await actor.boundingBox();
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.boundingBox()).toEqual(before);
});
