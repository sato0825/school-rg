import { expect, test } from "@playwright/test";

test("a real ten-second turn ends and the next turn accepts typing", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/?seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().click();
  await expect(page.locator(".typing-input")).toBeEnabled();
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat);
  expect(initial.turn).toBe(1);
  expect(initial.clock.remainingMs).toBeGreaterThan(9_000);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat?.turn ?? 0), { timeout: 18_000 }).toBeGreaterThan(1);
  await expect(page.locator(".typing-input")).toBeEnabled();
  const word = await page.locator(".card-word").first().innerText();
  await page.locator(".typing-input").focus();
  await page.keyboard.type(word, { delay: 40 });
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat?.actionLog?.filter((entry: { kind: string }) => entry.kind === "card").length ?? 0)).toBeGreaterThan(0);
});
