import { expect, test } from "@playwright/test";

async function startDemoRun(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
}

async function enterNextNode(page: import("@playwright/test").Page): Promise<void> {
  const combat = page.locator(".map-node.available").filter({ hasText: "戦闘" });
  if (await combat.count()) await combat.last().click();
  else await page.locator(".map-node.available").first().click();
}

async function typeThroughBattle(page: import("@playwright/test").Page, completion = ".reward-panel"): Promise<void> {
  const priorities = ["heavy strike", "sweep", "proof", "verse", "reaction", "strike", "jot", "sample", "distill", "observe", "finish", "poison", "leaf", "formula", "quarantine", "outline", "defend", "counter", "draw", "boost", "delay"];
  for (let turn = 0; turn < 12; turn++) {
    for (let use = 0; use < 12; use++) {
      if (await page.locator(completion).count()) return;
      const words = await page.locator(".card-word").allInnerTexts();
      const word = priorities.find((item) => words.includes(item));
      if (!word) break;
      await page.keyboard.type(word);
      if (await page.locator(completion).count()) return;
      if ((await page.locator(".typing-buffer").innerText()).trim() === word) {
        await page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: new RegExp(`^${word}$`) }) }).first().focus();
        await page.keyboard.press("Enter");
      }
      if (await page.locator(completion).count()) return;
      if ((await page.locator(".typing-buffer").innerText()).trim()) await page.keyboard.press("Escape");
    }
    await page.clock.runFor(11_000);
  }
  throw new Error("the battle did not reach a reward within 12 turns");
}

test("title, compendium, club selection, map and battle controls work by keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
  await page.getByRole("button", { name: "図鑑を見る" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "学園図鑑" })).toBeVisible();
  await expect(page.locator(".compendium-list details")).toHaveCount(4);
  await page.getByRole("button", { name: "戻る" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "ランを始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "所属する部活を選ぶ" })).toBeVisible();
  await page.getByRole("button", { name: /文芸部/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  await page.locator(".map-compendium").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "学園図鑑" })).toBeVisible();
  await page.getByRole("button", { name: "戻る" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".card")).toHaveCount(5);
  await page.locator(".pause-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".pause-button")).toHaveText("再開");
  await page.locator(".pause-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".pause-button")).toHaveText("一時停止");
});

test("shop and event choices accept focused keyboard activation", async ({ page }) => {
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "購買" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "購買" })).toBeVisible();
  await page.locator(".reward-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".reward-card").first()).toBeDisabled();
  await page.getByRole("button", { name: "購買を出る" }).focus();
  await page.keyboard.press("Enter");
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".event-panel")).toBeVisible();
  await page.locator("[data-action=event-choice][data-id=help], [data-action=event-choice][data-id=pass]").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
});

test("rest choice accepts focused keyboard activation", async ({ page }) => {
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "休憩" })).toBeVisible();
  await page.locator("[data-action=rest-heal]").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
});

test("a defeated run reaches its result and returns to the title by keyboard", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  for (let turn = 0; turn < 25 && !(await page.locator(".run-result").count()); turn++) await page.clock.runFor(11_000);
  await expect(page.getByRole("heading", { name: "敗北" })).toBeVisible();
  await page.getByRole("button", { name: "新しいランを始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
});

test("renders the combat HUD and accepts direct keyboard input", async ({ page }) => {
  await startDemoRun(page);
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

test("literature starter can activate a unique card by typing its word", async ({ page }) => {
  await startDemoRun(page);
  await enterNextNode(page);
  const words = await page.locator(".card-word").allTextContents();
  const unique = ["jot", "leaf", "verse", "outline"].find((word) => words.includes(word));
  expect(unique).toBeDefined();
  await page.keyboard.type(unique!);
  await expect(page.locator(".battle-message")).toContainText(`${unique} を発動`);
});

test("science club starts with a distinct deck and types a preparation card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /科学部/ }).click();
  await expect(page.locator(".map-stats")).toContainText("38/38");
  await enterNextNode(page);
  await expect(page.locator(".relic-row")).toContainText("観察眼鏡");
  const words = await page.locator(".card-word").allTextContents();
  const unique = ["sample", "observe", "reaction", "formula"].find((word) => words.includes(word));
  expect(unique).toBeDefined();
  await page.keyboard.type(unique!);
  await expect(page.locator(".battle-message")).toContainText(`${unique} を発動`);
});

test("a typed battle reaches victory with the visible Intent and pile counts", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
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

test("a potion is typed in its own mode and consumed after extending the active turn", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  await expect(page.locator(".potion-slot")).toHaveCount(2);
  await page.clock.runFor(1_000);
  const before = Number.parseFloat(await page.locator("[data-role=time]").innerText());
  await page.keyboard.press("F2");
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("clock");
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".potion-slot")).toHaveCount(1);
  await expect(page.locator(".potion-row")).not.toContainText("clock");
  const after = Number.parseFloat(await page.locator("[data-role=time]").innerText());
  expect(after).toBeGreaterThan(before + 2);
});

test("the combatants and controls remain visible on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startDemoRun(page);
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
  await startDemoRun(page);
  for (let encounter = 0; encounter < 3; encounter++) {
    await enterNextNode(page);
    if (encounter === 2) await expect(page.locator(".enemy-hud")).toContainText("追試の番人");
    await typeThroughBattle(page);
    await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
    if (encounter === 0) {
      await page.locator(".reward-card").first().focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".map-stats")).toContainText("デッキ 11枚");
    } else {
      await page.getByRole("button", { name: "報酬を受け取らず進む" }).focus();
      await page.keyboard.press("Enter");
    }
  }
  await expect(page.locator(".run-header")).toContainText("ACT 1 · 3F");
  await expect(page.locator(".map-node.available")).toHaveCount(1);
  await expect(page.locator(".map-node.available")).toContainText("開始");
  await enterNextNode(page);
  await expect(page.locator(".run-header")).toContainText("ACT 2 · 0F");
});

async function clearThreeActs(page: import("@playwright/test").Page): Promise<{ battles: number; bosses: number }> {
  let battles = 0;
  let bosses = 0;
  for (let step = 0; step < 36 && !(await page.locator(".run-result").count()); step++) {
    if (await page.locator(".map-panel").count()) {
      const available = page.locator(".map-node.available");
      const fight = available.filter({ hasText: /戦闘|強敵|ボス/ });
      await (await fight.count() ? fight.first() : available.first()).focus();
      await page.keyboard.press("Enter");
    } else if (await page.locator(".treasure-panel").count()) {
      await page.locator(".treasure-offer:not(:disabled)").first().focus();
      await page.keyboard.press("Enter");
    } else if (await page.locator(".reward-panel:not(.run-result):not(.economy-panel):not(.event-panel)").count()) {
      await page.getByRole("button", { name: "報酬を受け取らず進む" }).focus();
      await page.keyboard.press("Enter");
    } else if (await page.locator(".economy-panel").count()) {
      if (await page.getByRole("button", { name: "購買を出る" }).count()) await page.getByRole("button", { name: "購買を出る" }).click();
      else await page.locator("[data-action=rest-heal]").click();
    } else if (await page.locator(".event-panel").count()) {
      await page.locator(".event-choice:not(:disabled)").filter({ hasNotText: "戦う" }).first().click();
    } else if (await page.locator(".enemy-slot").count()) {
      if ((await page.locator(".run-meta").innerText()).includes("boss")) bosses++;
      battles++;
      await typeThroughBattle(page);
    } else throw new Error(`unexpected run screen at step ${step}`);
  }
  await expect(page.getByRole("heading", { name: "全Actクリア" })).toBeVisible();
  expect(bosses).toBe(3);
  expect(battles).toBeGreaterThanOrEqual(3);
  await expect(page.locator(".run-header")).toContainText("全Act完走");
  return { battles, bosses };
}

test("a seeded run clears all three Acts with typed combat", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await startDemoRun(page);
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["literature-demo"])).toBe(1);
  await page.getByRole("button", { name: "新しいランを始める" }).click();
  await page.getByRole("button", { name: "ランを始める" }).click();
  await expect(page.locator(".ascension-choice").nth(1)).toBeEnabled();
  await page.locator(".ascension-choice").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /文芸部/ }).click();
  await expect(page.locator(".map-stats")).toContainText("難度 1");
  await enterNextNode(page);
  await expect(page.locator(".enemy-hud")).toContainText("32/32");
});

test("science deck clears three Acts by typing and unlocks its own Ascension", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /科学部/ }).click();
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["science-demo"])).toBe(1);
});

test("treasure offers survive reload and a focused choice completes its node", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  await typeThroughBattle(page);
  await page.getByRole("button", { name: "報酬を受け取らず進む" }).click();
  await page.locator(".map-node.available").filter({ hasText: "宝箱" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "宝箱から1つ選ぶ" })).toBeVisible();
  const offers = await page.locator(".treasure-offer").allTextContents();
  await page.reload();
  await expect(page.locator(".treasure-offer")).toHaveText(offers);
  await page.locator(".treasure-offer").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.relicIds)).toHaveLength(2);
  await expect(page.locator(".map-node.current")).toBeDisabled();
});

test("a route can upgrade at rest and buy once at the shop", async ({ page }) => {
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).last().click();
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
  await startDemoRun(page);
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

test("an event potion can be typed during combat and damages its enemy target", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.getByRole("button", { name: "購買を出る" }).click();
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
  await page.locator("[data-action=event-choice][data-id=ink]").click();
  await expect(page.locator(".potion-slot")).toHaveCount(3);
  await page.keyboard.press("F2");
  await page.keyboard.type("ink");
  await expect(page.locator(".enemy-hud")).toContainText("19/26");
  await expect(page.locator(".potion-slot")).toHaveCount(2);
});

test("reload preserves an unfinished potion word and its inventory", async ({ page }) => {
  await startDemoRun(page);
  await enterNextNode(page);
  await page.keyboard.press("F2");
  await page.keyboard.type("cl");
  await expect(page.locator(".potion-buffer")).toContainText("cl");
  await page.reload();
  await expect(page.locator(".potion-mode")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".potion-buffer")).toContainText("cl");
  await expect(page.locator(".potion-slot")).toHaveCount(2);
  await page.getByRole("button", { name: "再開" }).click();
  await page.keyboard.type("ock");
  await expect(page.locator(".potion-slot")).toHaveCount(1);
});

test("reload preserves a shop purchase and an unfinished typed card", async ({ page }) => {
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).last().click();
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
  await startDemoRun(page);
  const key = "school-rg-run-v1";
  const original = await page.evaluate((saveKey) => localStorage.getItem(saveKey), key);
  const unsupported = JSON.stringify({ formatVersion: 99, session: {} });
  await page.addInitScript(({ saveKey, data }) => localStorage.setItem(saveKey, data), { saveKey: key, data: unsupported });
  await page.reload();
  await expect(page.getByRole("heading", { name: "保存データを読み込めません" })).toBeVisible();
  expect(await page.evaluate((saveKey) => localStorage.getItem(saveKey), key)).toBe(unsupported);
  expect(original).not.toBeNull();
});
