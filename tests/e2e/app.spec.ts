import { expect, test } from "@playwright/test";

test("renders the combat HUD and accepts direct keyboard input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "学園タイピングローグライク" })).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(5);
  await expect(page.locator(".enemy-slot")).toHaveCount(1);
  const seconds = Number((await page.locator("[data-role=time]").innerText()).replace("sec", "").trim());
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(10);
  await page.keyboard.press("z");
  await expect(page.locator(".typing-buffer .placeholder")).toBeVisible();
  await page.keyboard.type("sweep");
  await expect(page.locator(".enemy-hud")).toContainText("21/26");
  await expect(page.locator(".card")).toHaveCount(4);
});

test("a typed battle reaches victory with the visible Intent and pile counts", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".intent-ticket")).toContainText("飛び散る答案");
  await page.keyboard.type("sweep");
  await page.keyboard.type("strike");
  await expect(page.locator(".enemy-hud")).toContainText("15/26");
  await page.getByRole("button", { name: "一時停止" }).click();
  const pausedTime = await page.locator("[data-role=time]").innerText();
  await page.locator(".enemy-slot").click();
  await expect(page.locator(".enemy-slot")).not.toHaveClass(/targeted/);
  await page.clock.runFor(3_000);
  await expect(page.locator("[data-role=time]")).toHaveText(pausedTime);
  await page.getByRole("button", { name: "再開" }).click();
  await page.clock.runFor(11_000);
  await expect(page.locator(".run-meta")).toContainText("TURN 2");
  await expect(page.locator(".player-hud")).toContainText("35/40");
  await expect(page.locator(".pile-counts")).toContainText("捨て札 5");
  await expect(page.locator(".intent-ticket")).toContainText("机を積む");
  await page.keyboard.type("heavy strike");
  await expect(page.locator(".enemy-hud")).toContainText("1/26");
  await page.keyboard.type("strike");
  await expect(page.getByRole("dialog")).toContainText("勝利");
});
