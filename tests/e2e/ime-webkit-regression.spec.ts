import { expect, test, type Page } from "@playwright/test";

test.use({ browserName: "webkit" });

async function startBattle(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
}

async function sendComposingLetter(page: Page, key: string): Promise<void> {
  await page.locator(".typing-input").evaluate((input, letter) => input.dispatchEvent(new KeyboardEvent("keydown", {
    key: letter,
    code: `Key${letter.toUpperCase()}`,
    isComposing: true,
    bubbles: true,
    cancelable: true,
  })), key);
}

test("WebKit resolves a long card through Latin keys during composition without duplicate commit", async ({ page }) => {
  await startBattle(page);
  const input = page.locator(".typing-input");
  await input.focus();
  await input.dispatchEvent("compositionstart");
  await input.evaluate((element) => element.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Process", code: "KeyO", isComposing: true, bubbles: true, cancelable: true,
  })));
  await expect(input).toHaveValue("");
  await expect(page.locator("#battle-ime-notice")).toContainText("英数入力に切り替える");

  for (const letter of "outline") await sendComposingLetter(page, letter);
  await expect(page.locator(".battle-message")).toContainText("outline を発動");
  await expect(page.locator("#battle-ime-notice")).toBeEmpty();
  await expect(input).toBeFocused();

  await input.dispatchEvent("compositionend", { data: "outline" });
  await input.evaluate((element) => element.dispatchEvent(new InputEvent("beforeinput", {
    inputType: "insertFromComposition", data: "outline", bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".battle-message")).toContainText("outline を発動");
  await expect(input).toHaveValue("");

  const afterCardMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(500);
  expect(Number(await page.locator(".time-track").getAttribute("aria-valuenow"))).toBeLessThan(afterCardMs);
});

test("WebKit potion mode accepts composed Latin keys and consumes one potion", async ({ page }) => {
  await startBattle(page);
  const input = page.locator(".typing-input");
  await input.focus();
  await input.press("F2");
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "true");
  await input.dispatchEvent("compositionstart");
  for (const letter of "clock") await sendComposingLetter(page, letter);
  await expect(page.locator(".potion-slot")).toHaveCount(1);
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "false");
  await expect(input).toBeFocused();

  await input.dispatchEvent("compositionend", { data: "clock" });
  await input.evaluate((element) => element.dispatchEvent(new InputEvent("beforeinput", {
    inputType: "insertFromComposition", data: "clock", bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".potion-slot")).toHaveCount(1);
});

test("WebKit ordinary Latin key events activate a card and potion without composition", async ({ page }) => {
  await startBattle(page);
  const input = page.locator(".typing-input");
  await input.focus();
  await page.keyboard.type("outline");
  await expect(page.locator(".battle-message")).toContainText("outline を発動");
  await expect(input).toBeFocused();

  await input.press("F2");
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("clock");
  await expect(page.locator(".potion-slot")).toHaveCount(1);
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "false");
  await expect(input).toBeFocused();
});
