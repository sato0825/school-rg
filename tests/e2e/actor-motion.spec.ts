import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`literature candidate follows the card event on a fixed stage at ${viewport.width}`, async ({ page }) => {
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
    await page.keyboard.type("outline");

    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    await expect(actor.locator(".hero-art")).toHaveAttribute("src", /literature-activate-candidate-v2/);
    await expect(actor.locator(".hero-motion-frame")).toHaveAttribute("src", /literature-idle-candidate-v1/);
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
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});
