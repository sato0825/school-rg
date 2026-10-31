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
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", isComposing: true, bubbles: true })));
  await expect(page.locator("#battle-ime-notice")).toContainText("日本語入力中");
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
  if (process.env.SCHOOL_RG_CAPTURE_IME === "1") await page.screenshot({ path: "docs/art/previews/issue176-ime-feedback-v4-390.png" });
  await input.press(firstLetter);
  await expect(input).toHaveValue(firstLetter.toLowerCase());
  await expect(input).toBeFocused();
  await expect(page.locator("#battle-ime-notice")).toBeEmpty();
});

for (const width of [1024, 1440]) test(`IME guidance stays clear of the card hand at ${width}px`, async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const input = page.getByRole("textbox", { name: "カード名をタイプ" });
  await input.focus();
  await input.evaluate((element) => element.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", code: "KeyA", isComposing: true, bubbles: true, cancelable: true })));
  const notice = page.locator("#battle-ime-notice");
  await expect(notice).toBeVisible();
  const bounds = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    return { input: box(".typing-buffer").toJSON(), notice: box("#battle-ime-notice").toJSON(), cards: box(".hand").toJSON(), viewportWidth: document.documentElement.clientWidth, contentWidth: document.documentElement.scrollWidth };
  });
  expect(bounds.input.width).toBeGreaterThan(200);
  expect(bounds.notice.top).toBeGreaterThanOrEqual(bounds.input.bottom);
  expect(bounds.cards.top).toBeGreaterThanOrEqual(bounds.notice.bottom);
  expect(bounds.notice.right).toBeLessThanOrEqual(bounds.viewportWidth);
  expect(bounds.contentWidth).toBeLessThanOrEqual(bounds.viewportWidth);
  await expect(input).toBeFocused();
  if (process.env.SCHOOL_RG_CAPTURE_IME === "1") await page.screenshot({ path: `docs/art/previews/issue176-ime-feedback-v4-${width}.png` });
});
