import { expect, test } from "@playwright/test";

test("a typed victory keeps its result and reward history visible after reload", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("test-log-enemy-hp-set")) return;
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.combat.enemies[0].hp = 1;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
    sessionStorage.setItem("test-log-enemy-hp-set", "1");
  });
  await page.reload();
  if (await page.getByRole("button", { name: "再開" }).count()) await page.getByRole("button", { name: "再開" }).click();
  await expect(page.locator(".card-word").filter({ hasText: /^strike$/ })).toBeVisible();
  await page.evaluate(() => {
    for (const key of "strike") window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /戦闘ログ/ })).toHaveCount(0);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.lastCombatLog);
  expect(before.entries.some((entry: { kind: string; actionId: string }) => entry.kind === "card" && entry.actionId === "strike")).toBe(true);
  expect(before.entries.filter((entry: { kind: string }) => entry.kind === "result")).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.reload();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.lastCombatLog);
  expect(after).toEqual(before);
});
