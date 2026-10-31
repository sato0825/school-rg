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
  await expect(page.locator(".combat-log-entry").first()).toContainText(word);
  await expect(page.getByRole("button", { name: "戦闘に戻る" })).toBeFocused();
  await page.clock.runFor(2_000);
  await expect(page.getByRole("button", { name: "戦闘に戻る" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-role="time"]')).toHaveAttribute("aria-label", remainingBefore!);
  await page.reload();
  await expect(page.getByRole("button", { name: "戦闘ログ" })).toBeVisible();
  await page.getByRole("button", { name: "戦闘ログ" }).click();
  await expect(page.locator(".combat-log-entry").first()).toContainText(word);
  await expect(page.locator(".combat-log-entry").first()).toContainText("TURN 1");
});
