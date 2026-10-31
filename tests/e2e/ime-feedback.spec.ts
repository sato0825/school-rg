import { expect, test } from "@playwright/test";

test("Japanese IME composition explains the pause and English typing resumes", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();

  const input = page.getByRole("textbox", { name: "カード名をタイプ" });
  await expect(input).not.toHaveAttribute("placeholder");
  expect(await page.locator(".typing-buffer").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await input.focus();
  const firstWord = (await page.locator(".card-word").first().innerText()).trim();
  const firstLetter = firstWord[0]!;
  const timeBefore = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));

  await input.dispatchEvent("compositionstart", { data: "にほんご" });
  await expect(page.locator("#battle-ime-notice")).toContainText("日本語入力中");
  await input.evaluate((element) => element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true })));
  await page.clock.runFor(150);
  expect(Number(await page.locator(".time-track").getAttribute("aria-valuenow"))).toBeLessThan(timeBefore);
  await expect(input).toHaveValue("");

  await input.dispatchEvent("compositionend", { data: "日本語" });
  await expect(page.locator("#battle-ime-notice")).toContainText("英数入力に切り替えて");
  await expect(input).toBeFocused();
  await input.evaluate((element) => element.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "あ", bubbles: true, cancelable: true })));
  await expect(input).toHaveValue("");
  if (process.env.SCHOOL_RG_CAPTURE_IME === "1") await page.screenshot({ path: "docs/art/previews/issue176-ime-feedback-v2-390.png" });
  await input.press(firstLetter);
  await expect(input).toHaveValue(firstLetter.toLowerCase());
  await expect(page.locator("#battle-ime-notice")).toBeEmpty();
});
