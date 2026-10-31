import { expect, test } from "@playwright/test";

const plates = [
  { name: "act1-atrium", url: "/src/assets/stages/act1-paper-atrium-candidate-v1.png" },
  { name: "act1-library", url: "/src/assets/stages/act1-paper-library-candidate-v1.png" },
  { name: "act2-physics", url: "/src/assets/stages/act2-paper-physics-candidate-v1.png" },
  { name: "act3-stage", url: "/src/assets/stages/act3-paper-auditorium-stage-candidate-v1.png" },
] as const;

test("compare three Act room types with the same hero, enemy, cards, and Intent", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.getByRole("button", { name: "一時停止" }).click();
  const baseline = await page.locator(".stage").evaluate((element) => ({
    hero: element.querySelector(".hero-art")?.getAttribute("src"),
    enemy: element.querySelector(".enemy-art")?.getAttribute("src"),
    intent: element.querySelector(".intent-ticket")?.textContent,
  }));
  const cards = await page.locator(".hand .card").allTextContents();
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
      expect(await stage.evaluate((element) => ({
        hero: element.querySelector(".hero-art")?.getAttribute("src"),
        enemy: element.querySelector(".enemy-art")?.getAttribute("src"),
        intent: element.querySelector(".intent-ticket")?.textContent,
      }))).toEqual(baseline);
      expect(await page.locator(".hand .card").allTextContents()).toEqual(cards);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (process.env.SCHOOL_RG_CAPTURE_PAPER_STAGES === "1") {
        await page.screenshot({ path: `docs/art/previews/issue266-${plate.name}-${width}.png`, fullPage: true });
      }
    }
  }
});
