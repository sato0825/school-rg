import { expect, test } from "@playwright/test";

async function enterNextNode(page: import("@playwright/test").Page): Promise<void> {
  const combat = page.locator(".map-node.available").filter({ hasText: "戦闘" });
  if (await combat.count()) await combat.last().click();
  else await page.locator(".map-node.available").first().click();
}

async function typeThroughBattle(page: import("@playwright/test").Page, completion = ".reward-panel"): Promise<void> {
  const priorities = ["heavy strike", "sweep", "strike", "finish", "poison", "defend", "counter", "draw", "boost", "delay"];
  for (let turn = 0; turn < 12; turn++) {
    for (let use = 0; use < 12; use++) {
      if (await page.locator(completion).count()) return;
      const words = await page.locator(".card-word").allInnerTexts();
      const word = priorities.find((item) => words.includes(item));
      if (!word) break;
      await page.keyboard.type(word);
      if (await page.locator(completion).count()) return;
      if ((await page.locator(".typing-buffer").innerText()).trim() === word) {
        await page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: new RegExp(`^${word}$`) }) }).first().click();
      }
      if (await page.locator(completion).count()) return;
      if ((await page.locator(".typing-buffer").innerText()).trim()) await page.keyboard.press("Escape");
    }
    await page.clock.runFor(11_000);
  }
  throw new Error("the battle did not reach a reward within 12 turns");
}

test("renders the combat HUD and accepts direct keyboard input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "学園タイピングローグライク" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  await enterNextNode(page);
  await expect(page.locator(".card")).toHaveCount(5);
  await expect(page.locator(".enemy-slot")).toHaveCount(1);
  const seconds = Number((await page.locator("[data-role=time]").innerText()).replace("sec", "").trim());
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(10);
  await page.keyboard.press("z");
  await expect(page.locator(".typing-buffer .placeholder")).toBeVisible();
  await page.keyboard.type("heavy strike");
  await expect(page.locator(".enemy-hud")).toContainText("12/26");
  await expect(page.locator(".card")).toHaveCount(4);
});

test("a typed battle reaches victory with the visible Intent and pile counts", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await enterNextNode(page);
  await expect(page.locator(".intent-ticket")).toContainText("飛び散る答案");
  await page.keyboard.type("heavy strike");
  await page.keyboard.type("strike");
  await expect(page.locator(".enemy-hud")).toContainText("6/26");
  await page.getByRole("button", { name: "一時停止" }).click();
  const pausedTime = await page.locator("[data-role=time]").innerText();
  await page.locator(".enemy-slot").click();
  await expect(page.locator(".enemy-slot")).not.toHaveClass(/targeted/);
  await page.clock.runFor(3_000);
  await expect(page.locator("[data-role=time]")).toHaveText(pausedTime);
  await page.getByRole("button", { name: "再開" }).click();
  await page.clock.runFor(11_000);
  await expect(page.locator(".run-meta")).toContainText("TURN 2");
  await expect(page.locator(".player-hud")).toContainText("36/40");
  await expect(page.locator(".relic-row")).toContainText("図書室のしおり");
  await expect(page.locator(".pile-counts")).toContainText("捨て札 5");
  await expect(page.locator(".intent-ticket")).toContainText("机を積む");
  await page.keyboard.type("sweep");
  await page.keyboard.type("strike");
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
});

test("the combatants and controls remain visible on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".map-node.available").first()).toBeInViewport();
  await enterNextNode(page);
  await expect(page.locator(".hero-art")).toBeInViewport();
  await expect(page.locator(".enemy-art")).toBeInViewport();
  await expect(page.locator(".intent-ticket")).toBeInViewport();
  await expect(page.getByRole("button", { name: "一時停止" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("a full Act can be finished through typed combat, rewards and a boss", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await page.goto("/");
  for (let encounter = 0; encounter < 3; encounter++) {
    await enterNextNode(page);
    if (encounter === 2) await expect(page.locator(".enemy-hud")).toContainText("追試の番人");
    await typeThroughBattle(page);
    await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
    if (encounter === 0) {
      await page.locator(".reward-card").first().click();
      await expect(page.locator(".map-stats")).toContainText("デッキ 11枚");
    } else await page.getByRole("button", { name: "報酬を受け取らず進む" }).click();
  }
  await expect(page.locator(".run-header")).toContainText("ACT 1 · 3F");
  await expect(page.locator(".map-node.available")).toHaveCount(1);
  await expect(page.locator(".map-node.available")).toContainText("開始");
  await enterNextNode(page);
  await expect(page.locator(".run-header")).toContainText("ACT 2 · 0F");
});

test("a route can upgrade at rest and buy once at the shop", async ({ page }) => {
  await page.goto("/");
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).click();
  await expect(page.getByRole("heading", { name: "休憩" })).toBeVisible();
  await page.locator("[data-action=rest-upgrade]").first().click();
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await expect(page.getByRole("heading", { name: "購買" })).toBeVisible();
  await expect(page.locator(".reward-card")).toHaveCount(3);
  await page.locator(".reward-card").first().click();
  await expect(page.locator(".reward-panel")).toContainText("所持金 10G");
  await expect(page.locator(".reward-card").first()).toBeDisabled();
  await page.locator(".reward-card").nth(1).click();
  await expect(page.getByRole("status")).toContainText("所持金が足りません。");
  await page.getByRole("button", { name: "購買を出る" }).click();
  await expect(page.locator(".map-node.available")).toContainText("ボス");
});

test("an event choice can start typed combat and cannot be entered twice", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await page.goto("/");
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.getByRole("button", { name: "購買を出る" }).click();
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
  await expect(page.locator(".event-panel")).toBeVisible();
  await page.locator("[data-action=event-choice][data-id=fight]").click();
  await expect(page.locator(".enemy-slot")).toHaveCount(1);
  await typeThroughBattle(page, ".map-panel");
  await expect(page.locator(".run-header")).toContainText("ACT 1 · 2F");
  await expect(page.locator(".map-node.available")).toContainText("ボス");
  await expect(page.locator(".map-node.current")).toBeDisabled();
});

test("reload preserves a shop purchase and an unfinished typed card", async ({ page }) => {
  await page.goto("/");
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).click();
  await page.locator("[data-action=rest-upgrade]").first().click();
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.locator(".reward-card").first().click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "購買" })).toBeVisible();
  await expect(page.locator(".reward-panel")).toContainText("所持金 10G");
  await expect(page.locator(".reward-card").first()).toBeDisabled();
  await page.getByRole("button", { name: "購買を出る" }).click();
  await page.locator(".map-node.available").click();
  const word = await page.locator(".card-word").first().innerText();
  await page.keyboard.type(word.slice(0, 1));
  await expect(page.locator(".typing-buffer")).toContainText(word.slice(0, 1));
  await page.reload();
  await expect(page.locator(".typing-buffer")).toContainText(word.slice(0, 1));
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();
  await page.getByRole("button", { name: "再開" }).click();
  await page.keyboard.type(word.slice(1));
  if ((await page.locator(".typing-buffer").innerText()).trim() === word) {
    await page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: new RegExp(`^${word}$`) }) }).first().click();
  }
  await expect(page.locator(".battle-message")).toContainText(`${word} を発動`);
});

test("unsupported save versions leave the stored data intact", async ({ page }) => {
  await page.goto("/");
  const key = "school-rg-run-v1";
  const original = await page.evaluate((saveKey) => localStorage.getItem(saveKey), key);
  const unsupported = JSON.stringify({ formatVersion: 99, session: {} });
  await page.addInitScript(({ saveKey, data }) => localStorage.setItem(saveKey, data), { saveKey: key, data: unsupported });
  await page.reload();
  await expect(page.getByRole("heading", { name: "保存データを読み込めません" })).toBeVisible();
  expect(await page.evaluate((saveKey) => localStorage.getItem(saveKey), key)).toBe(unsupported);
  expect(original).not.toBeNull();
});
