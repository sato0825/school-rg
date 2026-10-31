import { expect, test } from "@playwright/test";

test("a typed victory keeps its result and reward history visible after reload", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.combat.enemies[0].hp = 1;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  });
  await page.reload();
  if (await page.getByRole("button", { name: "再開" }).count()) await page.getByRole("button", { name: "再開" }).click();
  await expect(page.locator(".card-word").filter({ hasText: /^strike$/ })).toBeVisible();
  await page.evaluate(() => {
    for (const key of "strike") window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
  await page.getByRole("button", { name: "戦闘ログを見る" }).click();
  await expect(page.locator('.combat-log-entry[data-kind="result"]')).toContainText(["勝利確定", "戦闘報酬"]);
  await expect(page.locator('.combat-log-entry[data-kind="card"]')).toContainText("strike");
  await page.getByRole("button", { name: "前の画面に戻る" }).click();
  await page.reload();
  await page.getByRole("button", { name: "戦闘ログを見る" }).click();
  await expect(page.locator('.combat-log-entry[data-kind="result"]')).toContainText(["勝利確定", "戦闘報酬"]);
});
