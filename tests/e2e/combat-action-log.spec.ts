import { expect, test } from "@playwright/test";

test("combat actions persist without a battle-history screen", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: /戦闘ログ/ })).toHaveCount(0);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.actionLog);
  expect(before.some((entry: { kind: string; actionId: string }) => entry.kind === "card" && entry.actionId)).toBe(true);
  await page.reload();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.actionLog);
  expect(after).toEqual(before);
});

test("timeout and enemy phase records remain ordered", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  await page.clock.runFor(11_000);
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.actionLog);
  const boundaries = entries.filter((entry: { kind: string }) => entry.kind === "turn").map((entry: { actionId: string }) => entry.actionId);
  expect(boundaries).toEqual(["player-start", "player-input-end", "player-end", "enemy-start", "enemy-end", "player-start"]);
  expect(entries.filter((entry: { kind: string }) => entry.kind === "enemy")).toHaveLength(1);
});
