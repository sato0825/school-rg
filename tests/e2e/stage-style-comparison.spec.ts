import { expect, test } from "@playwright/test";

const paperUrl = "/src/assets/stages/act1-paper-atrium-candidate-v1.png";

test("compare the existing hallway with the paper atrium under identical combat UI", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.getByRole("button", { name: "一時停止" }).click();
  for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
    await page.setViewportSize({ width, height });
    const stage = page.locator(".stage");
    await expect(stage).toHaveAttribute("style", /stage-hallway-v1/);
    for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]"]) {
      await expect(page.locator(selector).first()).toBeInViewport();
    }
    if (process.env.SCHOOL_RG_CAPTURE_STAGE_STYLE === "1") {
      await page.screenshot({ path: `docs/art/previews/issue249-existing-hallway-${width}.png`, fullPage: true });
    }
    await stage.evaluate(async (element, url) => {
      const image = new Image(); image.src = url; await image.decode();
      if (image.naturalWidth < 1500) throw new Error("candidate background did not decode");
      (element as HTMLElement).style.backgroundImage = `url('${url}')`;
    }, paperUrl);
    await expect(stage).toHaveAttribute("style", /act1-paper-atrium-candidate-v1/);
    if (process.env.SCHOOL_RG_CAPTURE_STAGE_STYLE === "1") {
      await page.screenshot({ path: `docs/art/previews/issue249-paper-atrium-${width}.png`, fullPage: true });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await stage.evaluate((element) => (element as HTMLElement).style.removeProperty("background-image"));
    // Reactivity is unchanged: reload restores the existing runtime asset.
    await page.reload();
    await expect(page.locator(".stage")).toHaveAttribute("style", /stage-hallway-v1/);
  }
});
