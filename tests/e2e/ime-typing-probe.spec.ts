import { expect, test } from "@playwright/test";

async function startBattle(page: import("@playwright/test").Page): Promise<void> {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
}

test("Latin key values during IME composition activate an English card", async ({ page }) => {
  await startBattle(page);
  const beforeHp = Number(await page.locator(".enemy-health-track").getAttribute("aria-valuenow"));
  await page.locator(".typing-input").focus();
  await page.locator(".typing-input").dispatchEvent("compositionstart");
  for (const key of ["z", "Enter", " "]) {
    await page.locator(".typing-input").evaluate((input, value) => input.dispatchEvent(new KeyboardEvent("keydown", {
      key: value, code: value === " " ? "Space" : value === "Enter" ? "Enter" : "KeyZ",
      isComposing: true, bubbles: true, cancelable: true,
    })), key);
  }
  await expect(page.locator(".typing-input")).toHaveValue("");
  await page.locator(".typing-input").evaluate((input) => input.dispatchEvent(new KeyboardEvent("keydown", {
    key: "s", code: "KeyS", isComposing: true, repeat: true, bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".typing-input")).toHaveValue("");
  for (const letter of "strike") {
    await page.locator(".typing-input").evaluate((input, key) => input.dispatchEvent(new KeyboardEvent("keydown", {
      key, code: `Key${key.toUpperCase()}`, isComposing: true, bubbles: true, cancelable: true,
    })), letter);
  }
  await expect(page.locator(".battle-message")).toContainText("strike を発動");
  expect(Number(await page.locator(".enemy-health-track").getAttribute("aria-valuenow"))).toBeLessThan(beforeHp);
  await expect(page.locator(".typing-input")).toBeFocused();
  await page.locator(".typing-input").dispatchEvent("compositionend", { data: "strike" });
  await page.locator(".typing-input").evaluate((input) => input.dispatchEvent(new InputEvent("beforeinput", {
    inputType: "insertFromComposition", data: "strike", bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".battle-message")).toContainText("strike を発動");
});

test("Process key uses the layout map and ignores IME Enter", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "keyboard", {
    configurable: true,
    value: { getLayoutMap: async () => new Map([["KeyQ", "o"], ["KeyS", "s"]]) },
  }));
  await startBattle(page);
  await page.locator(".typing-input").focus();
  await page.locator(".typing-input").dispatchEvent("compositionstart");
  await page.locator(".typing-input").evaluate((input) => input.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Process", code: "KeyQ", isComposing: true, bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".typing-input")).toHaveValue("o");
  await page.locator(".typing-input").evaluate((input) => input.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter", code: "Enter", isComposing: true, bubbles: true, cancelable: true,
  })));
  await expect(page.locator(".typing-input")).toHaveValue("o");
});
