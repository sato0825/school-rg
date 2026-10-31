import { expect, test } from "@playwright/test";

async function openKendoBattle(page: import("@playwright/test").Page) {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /剣道部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-actor-rig", "kendo-v1");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  return actor;
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`Kendo rig stays on the same stage through guard, strike and hit at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(Date.now());
    await page.setViewportSize(viewport);
    const actor = await openKendoBattle(page);
    const stage = page.locator(".game-shell .stage");
    const actorBefore = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(8);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
    await page.keyboard.type("counter");
    await expect(actor).toHaveAttribute("data-kendo-action", "counter");
    expect(await actor.locator('[data-part="right-arm-shinai"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("kendo-counter");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    expect(await actor.locator(".hero-rig").evaluate((node, previous) => node === previous, rigNode)).toBe(true);
    await page.clock.runFor(500);
    await page.keyboard.type("strike");
    await expect(actor).toHaveAttribute("data-kendo-action", "strike");
    expect(await actor.locator('[data-part="right-arm-shinai"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("kendo-strike");
    await page.clock.runFor(500);
    const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
    await page.clock.runFor(remainingMs + 1);
    await page.clock.runFor(650);
    await expect(actor).toHaveAttribute("data-actor-motion", "hit");
    expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
    expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
    expect(await actor.locator('[data-part="right-arm-shinai"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("kendo-hit-guard");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
  });
}

test("Kendo rig loads atomically, then restores quietly after reload", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.route("**/kendo-rig-parts-v1/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /剣道部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).not.toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await page.reload();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("Kendo rig leaves both elite enemies readable at PC and iPad widths", async ({ page }) => {
  await page.goto("/?seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /剣道部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "強敵" }).first().click();
  const stage = page.locator(".game-shell .stage");
  const rig = stage.locator('.ally-slot[data-actor-rig="kendo-v1"] .hero-rig');
  await expect(rig.locator(".rig-part")).toHaveCount(8);
  await expect(stage.locator(".enemy-slot")).toHaveCount(2);
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const actorBox = await rig.boundingBox();
    const enemyBoxes = await stage.locator(".enemy-slot").evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }));
    expect(actorBox).not.toBeNull();
    expect(actorBox!.x + actorBox!.width).toBeLessThan(enemyBoxes[0]!.left);
    expect(enemyBoxes[0]!.right).toBeLessThanOrEqual(enemyBoxes[1]!.left);
    expect(enemyBoxes[1]!.right).toBeLessThanOrEqual(viewport.width + 1);
  }
});
