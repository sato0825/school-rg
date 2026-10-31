import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
  test(`seeded paths remain sparse and selectable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/?seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /文芸部/ }).click();

    const firstInteriorRoutes = page.locator('.map-route-lines path[data-from^="a1-f1-"]');
    await expect(firstInteriorRoutes).toHaveCount(5);
    await expect(page.locator(".map-node.available")).toHaveCount(4);
    await expect(page.locator(".map-node.current")).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator(".run-header")).toBeInViewport();
    const screenshot = await page.screenshot();
    await testInfo.attach(`map-${viewport.width}`, { body: screenshot, contentType: "image/png" });
    if (process.env.CAPTURE_MAP_SCREENSHOT === "1") {
      await page.screenshot({ path: `docs/art/previews/issue181-map-${viewport.width}.png` });
    }

    await page.locator(".map-node.available").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".map-panel")).toHaveCount(0);
  });
}
