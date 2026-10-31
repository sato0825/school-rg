import { expect, test } from "@playwright/test";

async function enterMusicBattle(page: import("@playwright/test").Page) {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  return actor;
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`music beat stays grounded through card use and hit at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(viewport);
    const actor = await enterMusicBattle(page);
    const stage = page.locator(".game-shell .stage");
    await expect(actor).toHaveAttribute("data-actor-rig", "music-v1");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(8);
    const actorBefore = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    const node = await actor.locator(".hero-rig").elementHandle();
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((element, previous) => element === previous, node)).toBe(true);
    const word = await page.locator(".card-word").first().innerText();
    await page.keyboard.type(word);
    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    expect(await actor.locator('[data-part="right-arm"]').evaluate((element) => getComputedStyle(element).animationName)).toBe("music-cue-arm");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
    await page.clock.runFor(remainingMs + 651);
    await expect(actor).toHaveAttribute("data-actor-motion", "hit");
    expect(await actor.locator('[data-part="head-hit"]').evaluate((element) => getComputedStyle(element).animationName)).toBe("music-hit-head");
    expect(await actor.locator('[data-part="head"]').evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
  });
}

test("music portrait is complete before replacing the reference sprite, including after reload", async ({ page }) => {
  await page.route("**/music-rig-parts-v1/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).not.toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-art").evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  expect(await actor.locator(".hero-rig").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await page.reload();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(8);
});

test("low stimulus keeps an understandable still card pose", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.setViewportSize({ width: 1024, height: 768 });
  const actor = await enterMusicBattle(page);
  const word = await page.locator(".card-word").first().innerText();
  await page.keyboard.type(word);
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  expect(await actor.locator('[data-part="right-arm"]').evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await actor.locator('[data-part="right-arm"]').evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
});
