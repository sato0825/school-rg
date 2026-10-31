import { expect, test } from "@playwright/test";

const prototype = "/docs/design/issue245-intent-prototype.html";

test("intent candidate keeps all ordered effects and targets at desktop size", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${prototype}?case=mop`);
  const enemy = page.locator(".enemy");
  await expect(enemy).toHaveCount(1);
  await expect(enemy.locator(".step-text")).toHaveText(["3×2", "+4"]);
  await expect(enemy.locator(".target-mark")).toHaveText(["↙", "◎"]);
  await expect(enemy).toHaveAttribute("aria-label", /攻撃 3×2、味方へ、続いて 防御 \+4、自分へ/);
  await expect(enemy.locator(".enemy-hp")).toHaveAttribute("aria-valuenow", "25");
  await expect(enemy.locator(".enemy-art")).toHaveJSProperty("complete", true);
  const art = await enemy.locator(".enemy-art").evaluate((image: HTMLImageElement) => image.naturalWidth);
  expect(art).toBeGreaterThan(0);
  await enemy.click();
  await expect(page.locator("#stage-detail")).toContainText("1. 攻撃 3×2、味方へ");
  await expect(page.locator("#stage-detail")).toContainText("2. 防御 +4、自分へ");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toBeDisabled();
  await expect(page.locator("#play")).toBeEnabled();
  await expect(enemy.locator(".feedback")).toHaveText("+4");
});

test("five enemies retain separate HP and intent at iPad landscape size", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`${prototype}?case=five`);
  const enemies = page.locator(".enemy");
  await expect(enemies).toHaveCount(5);
  await expect(enemies.first().locator(".step-text")).toHaveText(["3×2", "+4"]);
  await expect(enemies.nth(3).locator(".step-text")).toHaveText(["+4", "3"]);
  await expect(enemies.locator(".enemy-hp")).toHaveCount(5);
  const bounds = await enemies.evaluateAll(nodes => nodes.map(node => {
    const art = node.querySelector(".enemy-art")!.getBoundingClientRect();
    const plate = node.querySelector(".enemy-id")!.getBoundingClientRect();
    const stage = node.closest(".stage")!.getBoundingClientRect();
    return { artBottom: art.bottom, plateTop: plate.top, plateBottom: plate.bottom, stageBottom: stage.bottom, width: plate.width };
  }));
  for (const box of bounds) {
    expect(box.artBottom).toBeLessThanOrEqual(box.plateTop + 12);
    expect(box.plateBottom).toBeLessThan(box.stageBottom);
    expect(box.width).toBeGreaterThan(120);
  }
  await page.locator("#quiet").click();
  await expect(page.locator(".game-frame")).toHaveAttribute("data-quiet", "true");
  await enemies.nth(3).click();
  await expect(page.locator("#stage-detail")).toContainText("1. 防御 +4、自分へ");
  await expect(page.locator("#stage-detail")).toContainText("2. 攻撃 3、味方へ");
});

test("encounter class and composite elite intent stay explicit", async ({ page }) => {
  await page.goto(`${prototype}?case=elite`);
  await expect(page.locator("#class-text")).toHaveText("強敵戦");
  await expect(page.locator(".enemy")).toHaveAttribute("data-class", "elite");
  await expect(page.locator(".enemy .step-text")).toHaveText(["4", "+3"]);
  await page.goto(`${prototype}?case=boss`);
  await expect(page.locator("#class-text")).toHaveText("ボス戦");
  await expect(page.locator(".enemy")).toHaveAttribute("data-class", "boss");
  await expect(page.locator(".enemy .step-text")).toHaveText(["7"]);
});
