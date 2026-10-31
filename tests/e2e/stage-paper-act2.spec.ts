import { expect, test } from "@playwright/test";

const plates = [
  { name: "entry-v2", url: "/src/assets/stages/act2-paper-science-entry-candidate-v2.png" },
  { name: "physics", url: "/src/assets/stages/act2-paper-physics-candidate-v1.png" },
  { name: "biology", url: "/src/assets/stages/act2-paper-biology-room-candidate-v1.png" },
  { name: "terrace", url: "/src/assets/stages/act2-paper-observation-terrace-candidate-v1.png" },
  { name: "entry-v1-excluded", url: "/src/assets/stages/act2-paper-science-entry-candidate-v1.png" },
] as const;

test("Act 2 science places and excluded exploration keep the same foreground at PC and iPad widths", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.getByRole("button", { name: "一時停止" }).click();
  const foreground = async () => ({
    hero: await page.locator(".hero-art").first().getAttribute("src"),
    enemy: await page.locator(".enemy-art").first().getAttribute("src"),
    intent: await page.locator(".intent-ticket").first().textContent(),
    cards: await page.locator(".hand .card").allTextContents(),
  });
  const baseline = await foreground();
  for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
    await page.setViewportSize({ width, height });
    for (const plate of plates) {
      const stage = page.locator(".stage");
      await stage.evaluate(async (element, url) => {
        const image = new Image(); image.src = url; await image.decode();
        if (image.naturalWidth < 1500) throw new Error("background did not decode at source size");
        (element as HTMLElement).style.backgroundImage = `url('${url}')`;
      }, plate.url);
      await expect(stage).toHaveAttribute("style", new RegExp(plate.url.split("/").pop()!));
      for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]", ".hand .card"]) {
        await expect(page.locator(selector).first()).toBeInViewport();
      }
      expect(await foreground()).toEqual(baseline);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (process.env.SCHOOL_RG_CAPTURE_PAPER_ACT2 === "1") {
        await page.screenshot({ path: `docs/art/previews/issue264-${plate.name}-${width}.png`, fullPage: true });
      }
    }
  }
});
