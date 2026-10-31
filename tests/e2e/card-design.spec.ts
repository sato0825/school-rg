import { expect, test } from "@playwright/test";

const clubs = [
  ["literature-demo", /文芸部/],
  ["science-demo", /科学部/],
  ["kendo-demo", /剣道部/],
  ["music-demo", /軽音部/],
  ["art-demo", /美術部/],
] as const;

for (const [clubId, clubName] of clubs) {
  test(`${clubId} uses the same readable card language while typing`, async ({ page }) => {
    await page.goto("/?shortRun=1&seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: clubName }).click();
    await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
    await expect(page.locator(".card")).toHaveCount(5);
    await expect(page.locator(".card-sigil")).toHaveCount(5);
    await expect(page.locator(".intent-ticket")).toBeInViewport();
    await expect(page.locator(".typing-buffer")).toBeInViewport();
    const kinds = await page.locator(".card").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-card-kind")));
    expect(kinds.every((kind) => ["attack", "skill", "power", "status", "curse"].includes(kind ?? ""))).toBe(true);
    const visibleSigils = await page.locator(".card-sigil").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node, "::before").content !== "none"));
    expect(visibleSigils).toBe(true);

    const words = await page.locator(".card-word").allTextContents();
    const narrowingPrefix = words.map((word) => word[0]!).find((letter) => words.some((word) => !word.startsWith(letter)));
    expect(narrowingPrefix).toBeTruthy();
    await page.keyboard.press(narrowingPrefix!);
    expect(await page.locator(".card.candidate").count()).toBeGreaterThan(0);
    expect(await page.locator(".card.dim").count()).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await page.locator(".card").first().focus();
    await expect(page.locator(".card").first()).toBeFocused();

    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(page.locator(".typing-buffer")).toBeInViewport();
      await expect(page.locator(".card").first()).toBeInViewport();
      if (process.env.SCHOOL_RG_CAPTURE_CARD_ART === "1" && ["literature-demo", "science-demo"].includes(clubId)) {
        await page.screenshot({ path: `docs/art/previews/issue142-${clubId}-${width}-20261031.png`, fullPage: true });
      }
    }
  });
}
