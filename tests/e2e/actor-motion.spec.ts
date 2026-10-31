import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`six-layer literature rig follows the card event on a fixed stage at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(viewport);
    await page.goto("/?shortRun=1&seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /文芸部/ }).click();
    await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();

    const stage = page.locator(".game-shell .stage");
    const actor = stage.locator(".ally-slot").first();
    const actorBefore = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
    await expect(actor).toHaveAttribute("data-actor-rig", "literature-v1");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(7);
    await page.keyboard.type("outline");

    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    await expect(actor.locator(".hero-art")).toHaveAttribute("src", /literature-activate-candidate-v2/);
    await expect(actor.locator(".hero-motion-frame")).toHaveCount(0);
    expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("rig-use-notebook");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
    await expect(actor.locator(".hero-art")).toHaveAttribute("src", /literature-idle-candidate-v1/);
  });
}

test("reduced motion keeps the event pose as a still with no overlay animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.keyboard.type("outline");
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  await expect(actor.locator(".hero-motion-frame")).toHaveCount(0);
  expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
});

test("the enemy hit changes the same body parts without moving the stage", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const stage = page.locator(".game-shell .stage");
  const actor = stage.locator(".ally-slot").first();
  const before = await actor.boundingBox();
  await page.keyboard.type("outline");
  await page.clock.runFor(500);
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  await expect(actor.locator('[data-part="head"]')).toHaveCount(1);
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("rig-hit-head");
  expect(await actor.boundingBox()).toEqual(before);
  await expect(page.locator(".player-health strong")).not.toContainText("40/40");
});
