import { expect, test } from "@playwright/test";

test("the visible typing target is an accessible textbox that keeps focus and game rules", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();

  const input = page.getByRole("textbox", { name: "カード名をタイプ" });
  await expect(input).toBeInViewport();
  await input.focus();
  await input.press("z");
  await expect(input).toHaveValue("");
  const firstWord = (await page.locator(".card-word").first().innerText()).trim();
  await input.press(firstWord[0]!);
  await expect(input).toHaveValue(firstWord[0]!);
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(input).toHaveValue("");

  await input.press("F2");
  const potionInput = page.getByRole("textbox", { name: "ポーション名をタイプ" });
  await expect(potionInput).toBeFocused();
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "true");
  await potionInput.press("F2");
  await expect(page.getByRole("textbox", { name: "カード名をタイプ" })).toBeFocused();
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
