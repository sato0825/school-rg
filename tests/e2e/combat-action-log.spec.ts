import { expect, test } from "@playwright/test";

test("combat history is keyboard accessible, freezes time, and survives reload", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  const word = await page.locator(".card-word").first().innerText();
  await page.evaluate((text) => {
    for (const key of text) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }, word);
  if (await page.locator(".typing-hint").filter({ hasText: "攻撃対象の敵を選択" }).count()) await page.locator(".enemy-slot").first().click();
  expect(await page.locator(".combat-log-entry").count()).toBe(0);
  const remainingBefore = await page.locator('[data-role="time"]').getAttribute("aria-label");
  await page.getByRole("button", { name: "戦闘ログ" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "この戦闘の記録" })).toBeVisible();
  await expect(page.locator('.combat-log-entry[data-kind="turn"]').first()).toContainText("入力ターン開始");
  await expect(page.locator('.combat-log-entry[data-kind="turn"]').first()).toContainText("入力時間 10秒");
  await expect(page.locator('.combat-log-entry[data-kind="card"]').first()).toContainText(word);
  await expect(page.getByRole("button", { name: "戦闘に戻る" })).toBeFocused();
  await page.clock.runFor(2_000);
  await expect(page.getByRole("button", { name: "戦闘に戻る" })).toBeFocused();
  await page.keyboard.press("Enter");
  const remainingAfter = await page.locator('[data-role="time"]').getAttribute("aria-label");
  expect(Number(remainingBefore!.match(/[\d.]+/)![0]) - Number(remainingAfter!.match(/[\d.]+/)![0])).toBeLessThan(0.3);
  await page.reload();
  await expect(page.getByRole("button", { name: "戦闘ログ" })).toBeVisible();
  await page.getByRole("button", { name: "戦闘ログ" }).click();
  await expect(page.locator('.combat-log-entry[data-kind="card"]').first()).toContainText(word);
  await expect(page.locator(".combat-log-entry").first()).toContainText("TURN 1");
});

test("timeout and enemy phase entries stay ordered with the next turn", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  await page.clock.runFor(11_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "戦闘ログ" }).click();
  const turnLabels = await page.locator('.combat-log-entry[data-kind="turn"] strong').allTextContents();
  expect(turnLabels).toEqual(["入力ターン開始", "入力時間終了", "プレイヤーターン終了", "敵フェーズ開始", "敵フェーズ終了", "入力ターン開始"]);
  await expect(page.locator('.combat-log-entry[data-kind="enemy"]')).toHaveCount(1);
  await expect(page.locator('.combat-log-entry[data-kind="turn"]').first()).toContainText("入力時間 10秒");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.getByRole("button", { name: "戦闘に戻る" })).toBeVisible();
});
