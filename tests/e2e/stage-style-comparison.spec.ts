import { expect, test } from "@playwright/test";

const alternativeUrl = "/src/assets/stages/act1-paper-library-candidate-v2.png";

test("previewing another candidate does not alter the run-selected atrium", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.getByRole("button", { name: "一時停止" }).click();
  for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
    await page.setViewportSize({ width, height });
    const stage = page.locator(".stage");
    await expect(stage).toHaveAttribute("style", /act1-paper-atrium-candidate-v1/);
    for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]"]) {
      await expect(page.locator(selector).first()).toBeInViewport();
    }
    await stage.evaluate(async (element, url) => {
      const image = new Image(); image.src = url; await image.decode();
      if (image.naturalWidth < 1500) throw new Error("candidate background did not decode");
      (element as HTMLElement).style.backgroundImage = `url('${url}')`;
    }, alternativeUrl);
    await expect(stage).toHaveAttribute("style", /act1-paper-library-candidate-v2/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await stage.evaluate((element) => (element as HTMLElement).style.removeProperty("background-image"));
    // A preview-only DOM style does not replace the location selected from run state.
    await page.reload();
    await expect(page.locator(".stage")).toHaveAttribute("style", /act1-paper-atrium-candidate-v1/);
  }
});
