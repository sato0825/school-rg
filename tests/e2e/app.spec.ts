import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { demoContent, demoEnemyAi, demoRunContentTables } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

async function startDemoRun(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
}

/** Isolate a feature flow from the provisional seeded route topology. */
async function startScriptedRoute(page: import("@playwright/test").Page, kinds: MapNode["kind"][], playerHp?: number): Promise<void> {
  const start = createRunSession(42, "literature-demo", demoContent);
  const nodes: MapNode[] = [
    { id: "script-start", act: 1, floor: 0, kind: "start", nextIds: ["script-1"] },
    ...kinds.map((kind, index): MapNode => ({ id: `script-${index + 1}`, act: 1, floor: index + 1, kind, nextIds: [index === kinds.length - 1 ? "script-boss" : `script-${index + 2}`] })),
    { id: "script-boss", act: 1, floor: kinds.length + 1, kind: "boss", nextIds: ["script-next-act"] },
    { id: "script-next-act", act: 2, floor: 0, kind: "start", nextIds: [] },
  ];
  const session = { ...start, run: { ...start.run, player: { ...start.run.player, hp: playerHp ?? start.run.player.hp }, map: { nodes, currentNodeId: nodes[0]!.id } }, completedNodeIds: [nodes[0]!.id] };
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => {
    if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", value);
  }, saved);
  await page.goto("/");
}

test("map routes match the saved seed and remain keyboard operable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startDemoRun(page);
  const visible = await page.locator(".map-node").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id")));
  const paths = await page.locator(".map-route-lines path").evaluateAll((nodes) => nodes.map((node) => ({
    from: node.getAttribute("data-from"), to: node.getAttribute("data-to"), state: node.getAttribute("class"),
  })));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
  const nodes: MapNode[] = saved.session.run.map.nodes;
  const expected = nodes.flatMap((node) => visible.includes(node.id) ? node.nextIds.filter((id) => visible.includes(id)).map((id) => `${node.id}:${id}`) : []);
  expect(paths.map((path) => `${path.from}:${path.to}`).sort()).toEqual(expected.sort());
  const available = await page.locator(".map-node.available").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-id")));
  expect(paths.filter((path) => path.state === "route-available").map((path) => path.to).sort()).toEqual(available.sort());
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator(".map-node.available").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".map-panel")).toHaveCount(0);
});

async function enterNextNode(page: import("@playwright/test").Page): Promise<void> {
  const combat = page.locator(".map-node.available").filter({ hasText: "戦闘" });
  if (await combat.count()) await combat.last().click();
  else await page.locator(".map-node.available").first().click();
}

async function expectIntentMatchesSavedBattle(page: import("@playwright/test").Page): Promise<void> {
  const intentId = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.enemies[0].intentId as string);
  const intent = demoContent.intents.find((item) => item.id === intentId);
  expect(intent).toBeDefined();
  await expect(page.locator(".intent-ticket")).toContainText(intent!.label);
}

async function scriptActiveEvent(page: import("@playwright/test").Page, eventId: string): Promise<void> {
  await page.addInitScript((id) => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.event.eventId = id;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  }, eventId);
  await page.reload();
  await expect(page.locator('.location-scene[data-location="event"]')).toBeVisible();
}

async function typeThroughBattle(page: import("@playwright/test").Page, completion = ".reward-panel"): Promise<void> {
  const priorities = ["heavy strike", "sweep", "proof", "verse", "reaction", "thrust", "riposte", "final cut", "beat", "chorus", "crescendo", "mural", "sketch", "strike", "jot", "sample", "distill", "observe", "finish", "poison", "leaf", "formula", "quarantine", "parry", "stance", "kata", "tempo", "sync", "rest", "frame", "outline", "defend", "counter", "draw", "boost", "delay"];
  const artPriorities = ["frame", "defend", ...priorities.filter((word) => word !== "frame" && word !== "defend")];
  const isArt = (await page.locator(".player-hud").innerText()).includes("美術部");
  for (let turn = 0; turn < 20; turn++) {
    for (let use = 0; use < 12; use++) {
      if (await page.locator(completion).count()) return;
      const words = await page.locator(".card-word").allInnerTexts();
      const word = (isArt ? artPriorities : priorities).find((item) => words.includes(item));
      if (!word) break;
      // Keep the long-run bot independent of CI host key-dispatch latency.
      await page.evaluate((value) => {
        for (const key of value) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      }, word);
      if (await page.locator(completion).count()) return;
      if (await page.locator(".typing-hint").filter({ hasText: "攻撃対象の敵を選択" }).count()) {
        await page.locator(".enemy-slot").last().click();
      }
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
  const combat = await page.locator(".run-meta, .player-hud, .enemy-hud, .card-word").allInnerTexts();
  throw new Error(`the battle did not reach a reward within 20 turns: ${combat.join(" | ")}`);
}

test("title, compendium, club selection, map and battle controls work by keyboard", async ({ page }) => {
  await page.goto("/?shortRun=1&seed=42");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
  await page.getByRole("button", { name: "遊び方と図鑑" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "カード名をタイプして行動" })).toBeVisible();
  await expect(page.locator(".compendium-list details")).toHaveCount(5);
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
  await expect(page.getByRole("heading", { name: "カード名をタイプして行動" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /購買/ })).toBeVisible();
  await expect(page.locator('[data-action="buy-relic"]')).toContainText("所持金不足");
  await page.locator('[data-action="buy-offer"]').first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-action="buy-offer"]').first()).toBeDisabled();
  await page.getByRole("button", { name: /購買を出る/ }).focus();
  await page.keyboard.press("Enter");
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.location-scene[data-location="event"]')).toBeVisible();
  await page.locator('[data-action="event-choice"]:not(:disabled)').first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
});

test("run choices show outcomes and unavailable reasons at iPad and desktop widths", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await expect(page.locator(".run-gold")).toHaveAttribute("aria-label", /所持金/);
  await expect(page.locator('[data-action="buy-relic"] .location-choice-outcome')).toContainText("所持金不足");
  await expect(page.locator('[data-action="buy-relic"]')).toBeDisabled();
  await expect(page.locator(".location-choice-icon").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-shop-phone-20261031.png", fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-shop-ipad-20261031.png", fullPage: true });
  await page.getByRole("button", { name: /購買を出る/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
  await scriptActiveEvent(page, "after-school-board");
  await page.setViewportSize({ width: 1024, height: 768 });
  const borrow = page.locator('[data-action="event-choice"][data-id="borrow"]');
  await expect(borrow).toContainText("-10G");
  await expect(borrow).toContainText("を得る");
  expect(await borrow.getAttribute("aria-label")).toBeNull();
  await expect(borrow).toHaveAccessibleName(/資料を借りる.*-10G.*を得る/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-event-phone-20261031.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(borrow).toBeVisible();
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-event-desktop-20261031.png", fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-event-ipad-20261031.png", fullPage: true });
  await page.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.gold = 0;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  });
  await page.reload();
  const unavailable = page.locator('[data-action="event-choice"][data-id="borrow"]');
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toHaveAccessibleName(/10G必要/);
});

test("shop relic, potion and card purchases persist and respect one-time stock", async ({ page }) => {
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("test-shop-gold-set")) return;
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.gold = 200;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
    sessionStorage.setItem("test-shop-gold-set", "1");
  });
  await page.reload();
  const relic = page.locator('[data-action="buy-relic"]');
  const potion = page.locator('[data-action="buy-potion"]');
  await expect(relic).toHaveCount(1);
  await expect(potion).toHaveCount(1);
  await relic.focus();
  await page.keyboard.press("Enter");
  await expect(relic).toBeDisabled();
  await expect(relic).toContainText("購入済み");
  await expect(page.locator(".location-message")).toContainText("レリックを購入");
  await potion.focus();
  await page.keyboard.press("Enter");
  await expect(potion).toBeDisabled();
  await expect(potion).toContainText("購入済み");
  await expect(page.locator(".run-potions")).toHaveAttribute("aria-label", "ポーション 3/3枠");
  await page.locator("[data-action=buy-offer]").first().focus();
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(page.getByRole("heading", { name: /購買/ })).toBeVisible();
  await expect(page.locator("[data-action=buy-relic], [data-action=buy-potion], [data-action=buy-offer]").filter({ hasText: "購入済み" })).toHaveCount(3);
  await expect(page.locator("[data-action=remove-shop-card]").first()).toBeDisabled();
});

test("rest choice accepts focused keyboard activation", async ({ page }) => {
  await startScriptedRoute(page, ["rest"], 20);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /休憩席/ })).toBeVisible();
  await expect(page.locator("[data-action=rest-heal]")).toContainText(/HP \d+ → \d+ \/ \d+/);
  await expect(page.locator("[data-action=rest-heal]")).toHaveAccessibleName(/ひと休み.*HP/);
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-rest-desktop-20261031.png", fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-rest-ipad-20261031.png", fullPage: true });
  await page.locator("[data-action=rest-heal]").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
});

test("a defeated run reaches its result and returns to the title by keyboard", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  for (let turn = 0; turn < 30 && !(await page.locator(".run-result").count()); turn++) await page.clock.runFor(11_000);
  await expect(page.getByRole("heading", { name: "敗北" })).toBeVisible();
  await expect(page.getByRole("button", { name: /戦闘ログ/ })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.lastCombatLog.entries.some((entry: { actionId: string }) => entry.actionId === "lost"))).toBe(true);
  const lostHistory = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-history-v1")!));
  expect(lostHistory.entries).toHaveLength(1);
  expect(lostHistory.entries[0]).toMatchObject({ runId: expect.any(String), clubId: "literature-demo", result: "lost", hp: 0 });
  await page.getByRole("button", { name: "ラン履歴を見る" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".history-club").first()).toContainText("敗北 1");
  await page.getByRole("button", { name: "戻る" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "敗北" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-history-v1")!).entries.length)).toBe(1);
  await page.getByRole("button", { name: "新しいランを始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
});

test("renders the combat HUD and accepts direct keyboard input", async ({ page }) => {
  await startDemoRun(page);
  await expect(page.locator('.game-shell[data-screen="map"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "学園タイピングローグライク" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  await enterNextNode(page);
  await expect(page.locator(".card")).toHaveCount(5);
  await expect(page.locator(".enemy-slot")).toHaveCount(1);
  const seconds = Number.parseFloat(await page.locator("[data-role=time]").innerText());
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(10);
  await page.keyboard.press("z");
  await expect(page.locator(".typing-visual")).toHaveText("");
  await expect(page.locator(".typing-input")).not.toHaveAttribute("placeholder");
  const initialHp = Number(await page.locator(".enemy-health-track").getAttribute("aria-valuenow"));
  await page.keyboard.type("heavy strike");
  await expect(page.locator(".enemy-health-track")).toHaveAttribute("aria-valuenow", String(initialHp - 14));
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
  await page.goto("/?shortRun=1&seed=42");
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

test("kendo club starts with counter equipment and types a guard card", async ({ page }) => {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /剣道部/ }).click();
  await expect(page.locator(".map-stats")).toContainText("44/44");
  await enterNextNode(page);
  await expect(page.locator(".relic-row")).toContainText("竹刀の握り");
  await expect(page.locator('.status-row .status-chip[data-status="thorns"]')).toHaveAttribute("aria-label", /反撃 1/);
  const words = await page.locator(".card-word").allTextContents();
  const unique = ["parry", "stance", "thrust", "riposte"].find((word) => words.includes(word));
  expect(unique).toBeDefined();
  await page.keyboard.type(unique!);
  await expect(page.locator(".battle-message")).toContainText(`${unique} を発動`);
});

test("music club starts with extra time and types a tempo card", async ({ page }) => {
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await expect(page.locator(".map-stats")).toContainText("39/39");
  await enterNextNode(page);
  await expect(page.locator(".relic-row")).toContainText("部室のメトロノーム");
  const time = Number.parseFloat(await page.locator("[data-role=time]").innerText());
  expect(time).toBeGreaterThan(10);
  const words = await page.locator(".card-word").allTextContents();
  const unique = ["tempo", "beat", "rest", "sync"].find((word) => words.includes(word));
  expect(unique).toBeDefined();
  await page.keyboard.type(unique!);
  await expect(page.locator(".battle-message")).toContainText(`${unique} を発動`);
});

test("music chains timed cards by direct input at iPad width after a save reload", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await enterNextNode(page);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    const combat = saved.session.run.combat;
    const cardId = (id: string) => combat.cards.find((card: { cardId: string }) => card.cardId === id).instanceId;
    const tempo = cardId("MUS-001");
    const sync = cardId("MUS-004");
    const beat = cardId("MUS-002");
    combat.hand = [tempo];
    combat.drawPile = [...combat.cards.map((card: { instanceId: string }) => card.instanceId)
      .filter((id: string) => id !== tempo && id !== sync && id !== beat), beat, sync];
    combat.discardPile = [];
    combat.exhaustPile = [];
    combat.resolvingPile = [];
    combat.typing = { buffer: "", candidateCardInstanceIds: [tempo], selectedCardInstanceId: null,
      progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null };
    combat.clock.remainingMs = 10_000;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "再開" }).click();
  const typeWithTime = async (word: string) => {
    for (const key of word) {
      await page.clock.runFor(450);
      await page.keyboard.press(key);
    }
  };
  await typeWithTime("tempo");
  await expect(page.locator(".card-word").filter({ hasText: /^sync$/ })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "再開" }).click();
  await typeWithTime("sync");
  await expect(page.locator(".card-word").filter({ hasText: /^beat$/ })).toBeVisible();
  const enemyBefore = Number(await page.locator(".enemy-health-track").first().getAttribute("aria-valuenow"));
  await typeWithTime("beat");
  await expect(page.locator(".battle-message")).toContainText("beat を発動");
  expect(Number(await page.locator(".enemy-health-track").first().getAttribute("aria-valuenow"))).toBe(enemyBefore - 6);
  expect(Number.parseFloat(await page.locator("[data-role=time]").innerText())).toBeGreaterThan(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (process.env.SCHOOL_RG_CAPTURE_MUSIC === "1") {
    await page.screenshot({ path: "docs/content/previews/issue76-music-chain-ipad-20261031.png", fullPage: true });
  }
});

test("a new club pool card remains readable and activates on a narrow battle screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await enterNextNode(page);
  await page.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    const combat = saved.session.run.combat;
    const held = combat.cards.find((card: { instanceId: string }) => card.instanceId === combat.hand[0]);
    held.cardId = "MUS-007";
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  });
  await page.reload();
  const bridge = page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: /^bridge$/ }) });
  await expect(bridge).toBeVisible();
  await expect(bridge).toContainText("時間 +1秒");
  await page.getByRole("button", { name: "再開" }).click();
  if (process.env.SCHOOL_RG_CAPTURE_CLUB_CARDS === "1") {
    await page.screenshot({ path: "docs/content/previews/issue122-bridge-narrow-v2-20261031.png", fullPage: true });
  }
  await page.keyboard.type("bridge");
  await expect(page.locator(".battle-message")).toContainText("bridge を発動");
});

test("art club types a distinct card and retains a frame through timeout", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /美術部/ }).click();
  await enterNextNode(page);
  await expect(page.locator(".relic-row")).toContainText("ポケットスケッチ帳");
  for (let turn = 0; turn < 3 && !(await page.locator(".card-word").allTextContents()).includes("sketch"); turn++) await page.clock.runFor(11_000);
  await expect(page.locator(".card-word").filter({ hasText: /^sketch$/ })).toHaveCount(1);
  await page.keyboard.type("sketch");
  await expect(page.locator(".battle-message")).toContainText("sketch を発動");
  for (let turn = 0; turn < 5 && !(await page.locator(".card-word").allTextContents()).includes("frame"); turn++) await page.clock.runFor(11_000);
  const frame = page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: /^frame$/ }) });
  await expect(frame).toHaveCount(1);
  await page.clock.runFor(11_000);
  await expect(frame).toHaveCount(1);
});

test("a typed battle reaches victory with the visible Intent and pile counts", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  await page.evaluate(() => {
    const state = window as typeof window & { gameShellAnchors?: { stage: Element; actor: Element; input: Element; background: string; stageRect: DOMRect; actorRect: DOMRect } };
    state.gameShellAnchors = {
      stage: document.querySelector(".stage")!, actor: document.querySelector(".ally-slot")!,
      input: document.querySelector(".typing-input")!,
      background: (document.querySelector(".stage") as HTMLElement).style.backgroundImage,
      stageRect: document.querySelector(".stage")!.getBoundingClientRect(),
      actorRect: document.querySelector(".ally-slot")!.getBoundingClientRect(),
    };
  });
  await expectIntentMatchesSavedBattle(page);
  expect(await page.locator('.enemy-hud .intent-copy strong').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(13);
  if (process.env.SCHOOL_RG_CAPTURE_261 === "1") {
    const original = page.viewportSize()!;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await page.locator(".hero-art,.enemy-art,.card-art img").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
      const longWordFits = await page.locator('.hand .card[data-long-word="true"]').evaluateAll((cards) => cards.every((card) => {
        const effect = card.querySelector('.card-effect');
        return effect !== null && effect.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom - 4;
      }));
      expect(longWordFits).toBe(true);
      await page.screenshot({ path: `docs/art/previews/issue261-combat-${viewport.width}-candidate-v3.png` });
    }
    await page.setViewportSize(original);
  }
  const initialHp = Number(await page.locator(".enemy-health-track").getAttribute("aria-valuenow"));
  await page.keyboard.type("heavy strike");
  await page.keyboard.type("strike");
  await expect(page.locator(".enemy-health-track")).toHaveAttribute("aria-valuenow", String(initialHp - 20));
  await page.getByRole("button", { name: "一時停止" }).click();
  const pausedTime = await page.locator("[data-role=time]").innerText();
  await page.locator(".enemy-slot").click();
  await expect(page.locator(".enemy-slot")).not.toHaveClass(/targeted/);
  await page.clock.runFor(3_000);
  await expect(page.locator("[data-role=time]")).toHaveText(pausedTime);
  await page.getByRole("button", { name: "再開" }).click();
  await page.clock.runFor(11_000);
  await expect(page.locator(".run-meta")).toContainText("TURN 2");
  await expect(page.locator(".relic-row")).toContainText("図書室のしおり");
  await expect(page.locator('.pile-token[data-pile="discard"]')).toHaveAttribute("aria-label", "捨て札 5枚");
  await expectIntentMatchesSavedBattle(page);
  await typeThroughBattle(page);
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
  for (const screen of ["reward", "map"] as const) {
    if (screen === "map") await page.getByRole("button", { name: "報酬を受け取らず進む" }).click();
    await expect(page.locator(`.game-shell[data-screen="${screen}"]`)).toBeVisible();
    expect(await page.evaluate(() => {
      const saved = (window as typeof window & { gameShellAnchors: { stage: Element; actor: Element; input: Element; background: string; stageRect: DOMRect; actorRect: DOMRect } }).gameShellAnchors;
      const stageRect = document.querySelector(".stage")!.getBoundingClientRect();
      const actorRect = document.querySelector(".ally-slot")!.getBoundingClientRect();
      return saved.stage === document.querySelector(".stage") && saved.actor === document.querySelector(".ally-slot")
        && saved.input === document.querySelector(".typing-input")
        && saved.background === (document.querySelector(".stage") as HTMLElement).style.backgroundImage
        && Math.abs(saved.stageRect.top - stageRect.top) < 1 && Math.abs(saved.stageRect.height - stageRect.height) < 1
        && Math.abs(saved.actorRect.left - actorRect.left) < 1 && Math.abs(saved.actorRect.bottom - actorRect.bottom) < 1;
    })).toBe(true);
    if (process.env.SCHOOL_RG_CAPTURE_261 === "1") {
      const original = page.viewportSize()!;
      for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
        await page.setViewportSize(viewport);
        await page.locator(".hero-art,.reward-card .card-art img").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
        await page.screenshot({ path: `docs/art/previews/issue261-${screen}-${viewport.width}-candidate-v3.png` });
      }
      await page.setViewportSize(original);
    }
  }
  await page.reload();
  expect(await page.locator('.game-shell[data-screen="map"] .map-node.available').count()).toBeGreaterThan(0);
  await expect(page.locator('.game-shell .hero-art')).toHaveAttribute("alt", "吉野 こはる、文芸部");
});

test("an elite formation accepts a typed single target and an all-enemy attack", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await page.goto("/?seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "強敵" }).first().click();
  await expect(page.locator(".enemy-slot")).toHaveCount(2);
  await expect(page.locator(".enemy-hud").nth(0)).toContainText("廊下の見回り");
  await expect(page.locator(".enemy-hud").nth(1)).toContainText("答案の切れ端");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    if (process.env.SCHOOL_RG_CAPTURE_ENEMY_ART === "1") {
      await page.screenshot({ path: `docs/art/previews/issue140-two-enemies-${viewport.width}-20261031.png`, fullPage: true });
    }
    for (const selector of [".enemy-slot", ".enemy-hud", ".intent-ticket"]) {
      const boxes = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, bottom: rect.bottom };
      }));
      expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left);
      expect(boxes[1]!.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(boxes.every((box) => box.bottom <= page.viewportSize()!.height)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.type("strike");
  await expect(page.locator(".typing-hint")).toContainText("攻撃対象の敵を選択");
  await page.locator(".enemy-slot").nth(1).click();
  await expect(page.locator(".enemy-hud").nth(0)).toContainText("30/30");
  await expect(page.locator(".enemy-hud").nth(1)).toContainText("6/12");
  await page.keyboard.type("sweep");
  await expect(page.locator(".enemy-hud").nth(0)).toContainText("25/30");
  await expect(page.locator(".enemy-hud").nth(1)).toContainText("1/12");
  await typeThroughBattle(page);
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
});

test("typed card effects stay on their target layer and clear without delaying combat", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?seed=42&layoutPreview=3");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "強敵" }).first().click();
  await page.keyboard.type("strike");
  await page.locator(".enemy-slot").last().click();
  const fx = page.locator(".card-fx-layer");
  await expect(fx).toHaveAttribute("data-kind", "attack");
  await expect(fx).toHaveAttribute("data-target-count", "1");
  await expect(fx.locator(".card-fx-mark")).toHaveAttribute("style", /left:88%/);
  expect(await fx.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  await page.keyboard.type("sweep");
  await expect(fx).toHaveAttribute("data-target-count", "2");
  await expect(fx.locator(".card-fx-mark")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const stage = await page.locator(".stage").boundingBox();
  const intentBottom = await page.locator(".intent-ticket").evaluateAll((nodes) => Math.max(...nodes.map((node) => node.getBoundingClientRect().bottom)));
  const marks = await fx.locator(".card-fx-mark").evaluateAll((nodes) => nodes.map((node) => ({ top: node.getBoundingClientRect().top, right: node.getBoundingClientRect().right })));
  expect(marks.every((box) => box.right <= stage!.x + stage!.width + 1 && box.top > intentBottom)).toBe(true);
  expect(await fx.locator(".card-fx-mark").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.clock.runFor(380);
  await expect(fx).toHaveCount(0);
  await expect(page.locator(".enemy-slot")).toHaveCount(2);
});

test("a typed support card keeps its flash by the player", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  const supportCard = page.locator('.card[data-card-kind="skill"]').first();
  await page.keyboard.type(await supportCard.locator(".card-word").innerText());
  const fx = page.locator(".card-fx-layer");
  await expect(fx).toHaveAttribute("data-kind", "support");
  await expect(fx.locator(".card-fx-mark.support")).toHaveAttribute("style", /left:22%/);
  await expect(fx.locator(".card-fx-trail")).toHaveCount(0);
  await page.clock.runFor(380);
  await expect(fx).toHaveCount(0);
});

for (const [act, kind, enemyId, name] of [
  [1, "combat", "late-pass", "遅刻札の影"],
  [1, "elite", "notice-board", "動く掲示板"],
  [2, "combat", "safety-sign", "理科室の安全標識"],
  [2, "elite", "stairwell-echo", "階段の反響"],
  [3, "combat", "window-shadow", "夜窓の影"],
  [3, "elite", "night-locker", "夜のロッカー"],
  [1, "combat", "lost-homework", "迷子の答案"],
  [1, "elite", "school-gate", "閉まる校門"],
  [2, "combat", "lab-magnet", "理科室の磁石"],
  [2, "elite", "library-index", "動く書架の索引"],
  [3, "combat", "empty-desk", "誰もいない机"],
  [3, "elite", "last-bus", "最終便の影"],
  [1, "combat", "hall-mop", "廊下のモップ"],
  [1, "combat", "folded-school-map", "折れた校内図"],
  [2, "combat", "beaker-mist", "試験管の蒸気"],
  [2, "combat", "lab-coil", "実験台のコイル"],
  [3, "combat", "stage-spotlight", "舞台の追光"],
  [3, "combat", "archive-clock", "閉鎖時刻の時計"],
] as const) {
  test(`Act ${act} ${kind} ${name} shows its Intent and can be defeated by typing`, async ({ page }) => {
    await page.clock.install();
    const start = createRunSession(42, "literature-demo", demoContent);
    const from: MapNode = { id: "test-start", act, floor: 0, kind: "start", nextIds: ["test-fight"] };
    const fight: MapNode = { id: "test-fight", act, floor: 1, kind, nextIds: [] };
    const session = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
    const pool: EncounterPool = { combat: [enemyId], elite: [enemyId], boss: ["final-exam"] };
    const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, pool);
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    await expect(page.locator(".enemy-hud")).toContainText(name);
    const intentId = entered.run.combat!.enemies[0]!.intentId;
    const label = demoContent.intents.find((item) => item.id === intentId)!.label;
    await expect(page.locator(".intent-ticket")).toContainText(label);
    if (["hall-mop", "folded-school-map", "beaker-mist", "lab-coil", "stage-spotlight", "archive-clock"].includes(enemyId)) {
      await page.setViewportSize({ width: 1024, height: 768 });
      const art = page.locator(".enemy-art");
      await expect(art).toHaveAttribute("src", new RegExp(`${enemyId}-candidate-v[0-9]+`));
      expect(await art.evaluate(async (image) => {
        await (image as HTMLImageElement).decode();
        return (image as HTMLImageElement).naturalWidth;
      })).toBeGreaterThan(1_000);
      await expect(page.locator(".intent-ticket")).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (process.env.SCHOOL_RG_CAPTURE_RUN_ENEMIES === "1") {
        await page.screenshot({ path: `docs/art/previews/issue203-${enemyId}-1024.png` });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(art).toBeInViewport();
      await expect(page.locator(".intent-ticket")).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (process.env.SCHOOL_RG_CAPTURE_RUN_ENEMIES === "1") {
        await page.screenshot({ path: `docs/art/previews/issue203-${enemyId}-1440.png` });
      }
    }
    if (["school-gate", "library-index", "last-bus"].includes(enemyId)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator(".intent-ticket")).toBeInViewport();
      await expect(page.locator(".enemy-hud")).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (process.env.SCHOOL_RG_CAPTURE_ENEMIES === "1") {
        await page.screenshot({ path: `docs/content/previews/issue120-act${act}-elite-narrow-20261031.png`, fullPage: true });
      }
    }
    await typeThroughBattle(page);
    await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
  });
}

for (const [act, enemyId, name] of [
  [1, "gym-scoreboard", "体育館の得点板"],
  [2, "lab-ventilation", "実験棟の換気装置"],
  [3, "graduation-curtain", "講堂の閉じる幕"],
] as const) {
  test(`Act ${act} alternate boss ${name} shows its Intent and falls to typed cards`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width: 390, height: 844 });
    const start = createRunSession(42, "literature-demo", demoContent);
    const from: MapNode = { id: "boss-start", act, floor: 0, kind: "start", nextIds: ["boss-fight"] };
    const fight: MapNode = { id: "boss-fight", act, floor: 1, kind: "boss", nextIds: [] };
    const session = { ...start, run: { ...start.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
    const pool: EncounterPool = { combat: [enemyId], elite: [enemyId], boss: [enemyId] };
    const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, pool);
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    await expect(page.locator(".enemy-hud")).toContainText(name);
    const intentId = entered.run.combat!.enemies[0]!.intentId;
    await expect(page.locator(".intent-ticket")).toContainText(demoContent.intents.find((item) => item.id === intentId)!.label);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".intent-ticket")).toBeInViewport();
    if (process.env.SCHOOL_RG_CAPTURE_BOSSES === "1") {
      await page.screenshot({ path: `docs/content/previews/issue124-act${act}-boss-narrow-20261031.png`, fullPage: true });
    }
    await typeThroughBattle(page, ".reward-panel, .run-result");
    await expect(page.locator(".reward-panel, .run-result")).toBeVisible();
  });
}

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

test("three new potions can be typed in combat with visible block, damage and healing", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  const base = createRunSession(42, "literature-demo", demoContent);
  const from: MapNode = { id: "potion-start", act: 1, floor: 0, kind: "start", nextIds: ["potion-fight"] };
  const fight: MapNode = { id: "potion-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const mapped = { ...base, run: { ...base.run, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
  const entered = enterRunNode(mapped, fight.id, demoContent, demoEnemyAi, { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] });
  const stocked = { ...entered, run: { ...entered.run, potionIds: ["potion-splash", "potion-guard", "potion-tea"], player: { ...entered.run.player, hp: 20 } } };
  const saved = serializeRunSession(stocked, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  await expect(page.locator(".potion-slot")).toHaveCount(3);
  await expect(page.locator(".potion-mode")).toBeInViewport();
  for (const potion of await page.locator(".potion-slot").all()) await expect(potion).toBeInViewport();
  const potionBoxes = await page.locator(".potion-slot").evaluateAll((slots) => slots.map((slot) => {
    const { left, right } = slot.getBoundingClientRect();
    return { left, right };
  }));
  expect(potionBoxes[0]!.right).toBeLessThanOrEqual(potionBoxes[1]!.left + 1);
  expect(potionBoxes[1]!.right).toBeLessThanOrEqual(potionBoxes[2]!.left + 1);
  if (process.env.SCHOOL_RG_CAPTURE_POTIONS === "1") {
    await page.screenshot({ path: "docs/art/previews/issue166-three-potions-v5-390.png" });
  }
  await page.keyboard.press("F2");
  await page.keyboard.type("splash");
  await expect(page.locator(".enemy-hud")).toContainText("22/26");
  const beforeBlock = Number((await page.locator(".player-hud b").innerText()).replace(/\D/g, ""));
  await page.keyboard.press("F2");
  await page.keyboard.type("shield");
  expect(Number((await page.locator(".player-hud b").innerText()).replace(/\D/g, ""))).toBe(beforeBlock + 8);
  await page.keyboard.press("F2");
  await page.keyboard.type("tea");
  await expect(page.locator(".player-hud")).toContainText("23/40");
  await expect(page.locator(".potion-slot")).toHaveCount(0);
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

test("candidate pose preview follows enemy damage and typed activation", async ({ page }) => {
  await page.clock.install();
  const start = createRunSession(42, "science-demo", demoContent);
  const from: MapNode = { id: "pose-start", act: 1, floor: 0, kind: "start", nextIds: ["pose-fight"] };
  const fight: MapNode = { id: "pose-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = { ...start, run: { ...start.run, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
  const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["final-exam"] });
  const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/?artPreview=1&shortRun=1&seed=42");
  await expect(page.locator(".enemy-hud")).toContainText("答案の切れ端");
  const hero = page.locator(".hero-art");
  const decoded = () => hero.evaluate((image) => (image as HTMLImageElement).naturalWidth);
  await expect(page.locator(".art-preview-label")).toContainText("未採用");
  await expect(hero).toHaveAttribute("src", /serious-student-idle-candidate-v2/);
  await expect.poll(decoded).toBeGreaterThan(0);
  // The timer starts after the restored battle renders. Observe the short hit
  // state while advancing virtual time instead of assuming an exact boundary.
  let hitObserved = false;
  for (let step = 0; step < 110; step++) {
    await page.clock.runFor(200);
    if ((await hero.getAttribute("src"))?.includes("serious-student-hit-candidate-v2")) {
      expect(await decoded()).toBeGreaterThan(0);
      hitObserved = true;
      break;
    }
  }
  expect(hitObserved).toBe(true);
  await page.clock.runFor(420);
  await expect(hero).toHaveAttribute("src", /serious-student-idle-candidate-v2/);
  await page.clock.runFor(730);
  await page.keyboard.press("z");
  const idlePhase = await hero.evaluate((image) => ({ delay: Number.parseFloat((image as HTMLImageElement).style.animationDelay), now: Math.floor(performance.now()) }));
  expect(Math.abs(idlePhase.delay + idlePhase.now % 3_100)).toBeLessThan(150);
  const word = await page.locator(".card-word").first().innerText();
  await page.keyboard.type(word);
  await expect(hero).toHaveAttribute("src", /serious-student-activate-candidate-v2/);
  await expect.poll(decoded).toBeGreaterThan(0);
  await page.clock.runFor(170);
  await page.keyboard.press("z");
  await expect(hero).toHaveClass(/act/);
  const actionDelay = await hero.evaluate((image) => Number.parseFloat((image as HTMLImageElement).style.animationDelay));
  expect(actionDelay).toBeLessThan(-100);
  expect(actionDelay).toBeGreaterThan(-380);
  await page.clock.runFor(210);
  await expect(hero).toHaveAttribute("src", /serious-student-idle-candidate-v2/);
  await page.setViewportSize({ width: 390, height: 844 });
  const [stage, controls, heroBox] = await Promise.all([
    page.locator(".stage").boundingBox(), page.locator(".control-deck").boundingBox(), hero.boundingBox(),
  ]);
  expect(stage && controls && heroBox).toBeTruthy();
  expect(heroBox!.y + heroBox!.height).toBeLessThanOrEqual(controls!.y);
  expect(heroBox!.x).toBeGreaterThanOrEqual(stage!.x);
});

test("five club candidates stay separate from the stage and controls at desktop and narrow widths", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  const candidates = [
    { club: "文芸部", asset: "literature-idle-candidate-v1" },
    { club: "科学部", asset: "serious-student-idle-candidate-v2" },
    { club: "剣道部", asset: "kendo-idle-candidate-v1" },
    { club: "軽音部", asset: "music-idle-candidate-v1" },
    { club: "美術部", asset: "art-idle-candidate-v1" },
  ];
  for (const candidate of candidates) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?artPreview=1&shortRun=1&seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: new RegExp(candidate.club) }).click();
    await enterNextNode(page);
    const hero = page.locator(".hero-art");
    await expect(hero).toHaveAttribute("src", new RegExp(candidate.asset));
    await expect(page.locator(".art-preview-label")).toContainText("3ポーズ比較");
    await hero.evaluate(async (image) => (image as HTMLImageElement).decode());
    expect(await hero.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1024);
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : width === 1024 ? 768 : 900 });
      const [stage, controls, image] = await Promise.all([page.locator(".stage").boundingBox(), page.locator(".control-deck").boundingBox(), hero.boundingBox()]);
      expect(stage && controls && image).toBeTruthy();
      expect(image!.x).toBeGreaterThanOrEqual(stage!.x - 1);
      expect(image!.x + image!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
      expect(image!.y + image!.height).toBeLessThanOrEqual(controls!.y + 1);
    }
  }
});

for (const [clubId, label, name] of [
  ["literature-demo", "文芸部", "literature"],
  ["kendo-demo", "剣道部", "kendo"],
  ["music-demo", "軽音部", "music"],
  ["art-demo", "美術部", "art"],
] as const) {
  test(`${label} candidate follows typed activation and a known attack Intent`, async ({ page }) => {
    await page.clock.install();
    const start = createRunSession(42, clubId, demoContent);
    const from: MapNode = { id: "pose-start", act: 1, floor: 0, kind: "start", nextIds: ["pose-fight"] };
    const fight: MapNode = { id: "pose-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = { ...start, run: { ...start.run, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
    const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["final-exam"] });
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/?artPreview=1");
    const hero = page.locator(".hero-art");
    await expect(hero).toHaveAttribute("src", new RegExp(`${name}-idle-candidate-v1`));
    await expect(page.locator(".intent-ticket")).toContainText("紙片が飛ぶ");
    const attack = page.locator('.card[data-card-kind="attack"]').first();
    await page.keyboard.type(await (await attack.count() ? attack.locator(".card-word") : page.locator(".card-word").first()).innerText());
    const activateVersion = name === "kendo" ? "v3" : "v2";
    const hitVersion = name === "art" ? "v3" : "v2";
    await expect(hero).toHaveAttribute("src", new RegExp(`${name}-activate-candidate-${activateVersion}`));
    await page.clock.runFor(420);
    await expect(hero).toHaveAttribute("src", new RegExp(`${name}-idle-candidate-v1`));
    // A defensive card may absorb the first attack; each club can also have a different turn clock.
    for (let turn = 0; turn < 6 && !((await hero.getAttribute("src")) ?? "").includes(`${name}-hit-candidate-${hitVersion}`); turn++) {
      const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
      await page.clock.runFor(remainingMs + 1);
      await page.clock.runFor(650);
    }
    await expect(hero).toHaveAttribute("src", new RegExp(`${name}-hit-candidate-${hitVersion}`));
    await page.clock.runFor(420);
    await expect(hero).toHaveAttribute("src", new RegExp(`${name}-idle-candidate-v1`));
  });
}

test("one to three ally slots fit a shared stage at desktop and narrow widths", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  for (const count of [1, 2, 3]) {
    await page.goto(count === 1 ? "/?shortRun=1&seed=42" : `/?layoutPreview=${count}&shortRun=1&seed=42`);
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /文芸部/ }).click();
    await enterNextNode(page);
    await page.locator(".hero-art").evaluate(async (image) => (image as HTMLImageElement).decode());
    await page.locator(".enemy-art").evaluate(async (image) => (image as HTMLImageElement).decode());
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      const boxes = await page.evaluate(() => {
        const rect = (selector: string) => Array.from(document.querySelectorAll(selector), (node) => node.getBoundingClientRect());
        const stage = document.querySelector(".stage")!.getBoundingClientRect();
        const previewLabel = document.querySelector(".layout-preview-label")?.getBoundingClientRect();
        const playerHud = document.querySelector(".player-hud")!.getBoundingClientRect();
        const intent = document.querySelector(".intent-ticket")!.getBoundingClientRect();
        return { stage: { left: stage.left, right: stage.right, bottom: stage.bottom },
          allies: rect(".ally-slot").map((box) => ({ left: box.left, right: box.right, bottom: box.bottom })),
          enemies: rect(".enemy-slot").map((box) => ({ left: box.left, right: box.right, bottom: box.bottom })),
          label: previewLabel && { left: previewLabel.left, right: previewLabel.right },
          hudRight: playerHud.right, hudBottom: playerHud.bottom, stageTop: stage.top, intentLeft: intent.left };
      });
      expect(boxes.allies).toHaveLength(count);
      for (const box of [...boxes.allies, ...boxes.enemies]) {
        expect(box.left).toBeGreaterThanOrEqual(boxes.stage.left - 1);
        expect(box.right).toBeLessThanOrEqual(boxes.stage.right + 1);
        expect(box.bottom).toBeLessThanOrEqual(boxes.stage.bottom + 1);
      }
      for (let index = 1; index < boxes.allies.length; index++) expect(boxes.allies[index - 1]!.right).toBeLessThanOrEqual(boxes.allies[index]!.left + 1);
      expect(boxes.allies.at(-1)!.right).toBeLessThanOrEqual(boxes.enemies[0]!.left + 1);
      if (count > 1) {
        expect(boxes.hudBottom).toBeLessThanOrEqual(boxes.stageTop + 1);
        expect(boxes.label!.left).toBeGreaterThanOrEqual(boxes.stage.left - 1);
        expect(boxes.label!.right).toBeLessThanOrEqual(boxes.intentLeft + 1);
      }
      await expect(page.locator(".control-deck")).toBeVisible();
    }
  }
});

test("a full Act can be finished through typed combat, rewards and a boss", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startScriptedRoute(page, ["combat", "combat"]);
  for (let encounter = 0; encounter < 3; encounter++) {
    await enterNextNode(page);
    if (encounter === 2) await expect(page.locator(".enemy-hud")).toContainText(/追試の番人|体育館の得点板/);
    await typeThroughBattle(page);
    await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
    await expect(page.locator(".reward-card.signature")).not.toHaveCount(0);
    await expect(page.locator(".reward-card.signature").first()).toContainText("部活固有");
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

async function readRunDiagnostic(page: import("@playwright/test").Page, phase: string): Promise<unknown> {
  return page.evaluate((phase) => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    const run = saved.session.run;
    const node = run.map.nodes.find((item: { id: string }) => item.id === run.map.currentNodeId);
    const entries = run.combat?.actionLog ?? run.lastCombatLog?.entries ?? [];
    const count = (kind: string) => entries.filter((entry: { kind: string }) => entry.kind === kind).length;
    const clock = run.combat?.clock;
    return {
      phase, seed: run.seed, rngState: run.rngState, act: run.act, nodeId: node?.id, floor: node?.floor,
      nodeKind: node?.kind, screen: saved.session.screen, hp: run.player.hp, maxHp: run.player.maxHp,
      gold: run.gold, deckSize: run.deck.length, potionCount: run.potionIds.length,
      logicalTurn: run.combat?.turn ?? run.lastCombatLog?.turn ?? null,
      clockSource: "performance.now via Playwright page.clock",
      clockNowMs: Math.floor(performance.now()), clockRemainingMs: clock?.remainingMs ?? null,
      clockDeadlineMs: clock ? clock.lastEventAtMs + clock.remainingMs : null,
      clockPaused: clock?.paused ?? null, cardInputSuccessCount: count("card"),
      potionInputSuccessCount: count("potion"), enemyActionCount: count("enemy"),
      actionCount: entries.length,
    };
  }, phase);
}

async function clearThreeActs(page: import("@playwright/test").Page, maxSteps = 36, reloadAtActTwo = false, onTrace?: (phase: string) => Promise<void>): Promise<{ battles: number; bosses: number }> {
  let battles = 0;
  let bosses = 0;
  let reloadedAtActTwo = false;
  const bossNames = [/追試の番人|体育館の得点板/, /部活監査の影|実験棟の換気装置/, /終業の鐘|講堂の閉じる幕/];
  for (let step = 0; step < maxSteps && !(await page.locator(".run-result").count()); step++) {
    if (onTrace) await onTrace(`step-${step}`);
    if (await page.locator(".map-panel").count()) {
      if (reloadAtActTwo && !reloadedAtActTwo && await page.evaluate(() => {
        const run = JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run;
        return run.act === 2 && run.map.nodes.find((node: { id: string; floor: number }) => node.id === run.map.currentNodeId)?.floor === 0;
      })) {
        await page.reload();
        reloadedAtActTwo = true;
        continue;
      }
      const available = page.locator(".map-node.available");
      const hp = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.player.hp as number);
      const rest = available.filter({ hasText: "休憩" });
      // A fixed three-Act smoke route should use recovery and rewards when the map offers them.
      // Bosses remain mandatory, and dedicated tests cover normal and elite encounters.
      const respite = available.filter({ hasText: /休憩|宝箱|購買|イベント/ });
      await (hp <= 24 && await rest.count() ? rest.first() : await respite.count() ? respite.first() : available.first()).focus();
      await page.keyboard.press("Enter");
    } else if (await page.locator('.location-scene[data-location="treasure"]').count()) {
      await page.locator('[data-action="treasure-offer"]:not(:disabled)').first().focus();
      await page.keyboard.press("Enter");
      await expect(page.locator('.location-scene[data-claiming="true"]')).toBeVisible();
      await page.clock.runFor(350);
      await expect(page.locator(".map-panel")).toBeVisible();
    } else if (await page.locator(".reward-panel:not(.run-result):not(.economy-panel):not(.event-panel)").count()) {
      await page.getByRole("button", { name: "報酬を受け取らず進む" }).focus();
      await page.keyboard.press("Enter");
    } else if (await page.locator('.location-scene[data-location="shop"], .location-scene[data-location="rest"]').count()) {
      if (await page.getByRole("button", { name: /購買を出る/ }).count()) await page.getByRole("button", { name: /購買を出る/ }).click();
      else if (await page.locator("[data-action=rest-heal]:not(:disabled)").count()) await page.locator("[data-action=rest-heal]").click();
      else {
        await page.locator(".location-drawer summary").click();
        await page.locator('[data-action="rest-upgrade"]').first().click();
      }
    } else if (await page.locator('.location-scene[data-location="event"]').count()) {
      const choices = page.locator('[data-action="event-choice"]:not(:disabled)').filter({ hasNotText: "戦闘へ" });
      const heal = choices.filter({ hasText: /回復|手当て|深呼吸/ });
      await (await heal.count() ? heal.first() : choices.first()).click();
    } else if (await page.locator(".enemy-slot").count()) {
      const hp = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.player.hp as number);
      if (hp <= 24 && await page.locator(".potion").filter({ hasText: "bandage" }).count()) {
        await page.keyboard.press("F2");
        await page.keyboard.type("bandage");
      }
      if (await page.locator(".run-meta").getAttribute("data-kind") === "boss") {
        await expect(page.locator(".enemy-hud")).toContainText(bossNames[bosses]!);
        bosses++;
      }
      battles++;
      try { await typeThroughBattle(page, ".reward-panel, .run-result"); }
      finally { if (onTrace) await onTrace(`battle-${battles}-end`); }
    } else throw new Error(`unexpected run screen at step ${step}`);
  }
  const result = await page.locator(".run-result").innerText().catch(() => "ラン結果画面なし");
  expect(result).toContain("全Actクリア");
  expect(bosses).toBe(3);
  expect(battles).toBeGreaterThanOrEqual(3);
  if (reloadAtActTwo) expect(reloadedAtActTwo).toBe(true);
  await expect(page.locator(".run-header")).toContainText("全Act完走");
  return { battles, bosses };
}

test("a seeded run clears all three Acts with typed combat", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await startDemoRun(page);
  await clearThreeActs(page);
  await expect(page.getByRole("button", { name: /戦闘ログ/ })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.lastCombatLog.entries.some((entry: { actionId: string }) => entry.actionId === "won"))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["literature-demo"])).toBe(1);
  const wonHistory = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-history-v1")!));
  expect(wonHistory.entries).toHaveLength(1);
  expect(wonHistory.entries[0]).toMatchObject({ clubId: "literature-demo", result: "won", act: 3 });
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-history-v1")!).entries.length)).toBe(1);
  await page.getByRole("button", { name: "新しいランを始める" }).click();
  await page.getByRole("button", { name: "ランを始める" }).click();
  await expect(page.locator(".ascension-choice").nth(1)).toBeEnabled();
  await page.locator(".ascension-choice").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /文芸部/ }).click();
  await expect(page.locator(".map-stats")).toContainText("難度 1");
  await enterNextNode(page);
  const ascensionEnemy = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.enemies[0] as { enemyId: string; hp: number; maxHp: number });
  expect(ascensionEnemy.hp).toBe(ascensionEnemy.maxHp);
  expect(ascensionEnemy.maxHp).toBeGreaterThan(demoContent.enemies.find((enemy) => enemy.id === ascensionEnemy.enemyId)!.maxHp);
  await expect(page.locator(".enemy-health-track")).toHaveAttribute("aria-valuemax", String(ascensionEnemy.maxHp));
});

test("literature clears three Acts by typing at tablet width after a save reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.clock.install();
  await startDemoRun(page);
  await clearThreeActs(page, 36, true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const [clubLabel, clubId] of [
  ["文芸部", "literature-demo"], ["科学部", "science-demo"], ["剣道部", "kendo-demo"],
  ["軽音部", "music-demo"], ["美術部", "art-demo"],
] as const) {
  test(`${clubLabel} clears the normal 12-floor three-Act map by typing`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.clock.install();
    const startedAt = Date.now();
    await page.goto("/?seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: new RegExp(clubLabel) }).click();
    const diagnostics: unknown[] = [];
    const onTrace = async (phase: string) => { diagnostics.push(await readRunDiagnostic(page, phase)); };
    try { await clearThreeActs(page, 130, true, onTrace); }
    finally {
      await onTrace("final").catch(() => undefined);
      await testInfo.attach("normal-run-diagnostic.json", {
        body: JSON.stringify({ clubId, seed: 42, diagnostics }, null, 2), contentType: "application/json",
      });
    }
    const route = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("school-rg-run-v1")!).session;
      const kinds = Object.fromEntries(session.run.map.nodes.map((node: { id: string; kind: string }) => [node.id, node.kind]));
      return { clubId: session.run.clubId, seed: session.run.seed, completedNodeIds: session.completedNodeIds,
        nodeKinds: session.completedNodeIds.map((id: string) => kinds[id]) };
    });
    expect(route.clubId).toBe(clubId);
    expect(route.seed).toBe(42);
    expect(route.completedNodeIds).toHaveLength(42);
    expect(route.nodeKinds.filter((kind: string) => kind === "boss")).toHaveLength(3);
    const report = { ...route, automatedWallTimeMs: Date.now() - startedAt };
    await testInfo.attach("normal-run-route.json", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
    console.log(`NORMAL_RUN ${clubId} ${report.automatedWallTimeMs}ms ${route.nodeKinds.join(",")}`);
  });
}

test("regular runs use the provisional full map while short E2E runs require an explicit flag", async ({ page, browser }) => {
  await page.goto("/?seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await expect(page.locator(".map-node")).toHaveCount(50);
  await expect(page.locator(".map-node").last()).toHaveAttribute("aria-label", /13階 ボス/);
  await page.goto("/?shortRun=1&seed=42");
  await expect(page.locator(".map-node")).toHaveCount(50);
  const shortContext = await browser.newContext();
  const shortPage = await shortContext.newPage();
  await shortPage.goto(page.url());
  await shortPage.getByRole("button", { name: "ランを始める" }).click();
  await shortPage.getByRole("button", { name: /文芸部/ }).click();
  await expect(shortPage.locator(".map-node")).toHaveCount(10);
  await expect(shortPage.locator(".map-node").last()).toHaveAttribute("aria-label", /3階 ボス/);
  await shortContext.close();
});

test("ordinary new runs draw independent seeds and reload preserves a run seed", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  const firstSeed = Number((await page.locator(".map-stats").innerText()).match(/シード (\d+)/)?.[1]);
  expect(firstSeed).toBeGreaterThanOrEqual(0);
  expect(firstSeed).toBeLessThanOrEqual(0xffffffff);
  await page.reload();
  await expect(page.locator(".map-stats")).toContainText(`シード ${firstSeed}`);

  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/");
    await otherPage.getByRole("button", { name: "ランを始める" }).click();
    await otherPage.getByRole("button", { name: /文芸部/ }).click();
    const secondSeed = Number((await otherPage.locator(".map-stats").innerText()).match(/シード (\d+)/)?.[1]);
    expect(secondSeed).not.toBe(firstSeed);
  } finally {
    await otherContext.close();
  }
});

test("opt-in playtest report survives reload, excludes pause and exports after three Acts", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/?playtest=1&shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.clock.runFor(5_000);
  const mapDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "計測JSONを保存" }).click();
  const mapReport = JSON.parse(await readFile((await (await mapDownload).path())!, "utf8"));
  expect(mapReport.result).toBeNull();
  expect(mapReport.battles).toHaveLength(0);
  await enterNextNode(page);
  const readMetrics = () => page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-playtest-v1")!));
  const beforeReload = await readMetrics();
  expect(beforeReload.activeMs).toBeGreaterThanOrEqual(5_000);
  expect(beforeReload.visits).toHaveLength(2);
  expect(beforeReload.battleNodeIds).toHaveLength(1);
  expect(beforeReload.battles).toHaveLength(1);
  expect(beforeReload.battles[0]).toMatchObject({ act: 1, result: null, partial: false });
  const midRunDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "計測JSONを保存" }).click();
  const midRun = JSON.parse(await readFile((await (await midRunDownload).path())!, "utf8"));
  expect(midRun.result).toBeNull();
  expect(midRun.battles[0].enemyIds.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();
  const pausedAt = (await readMetrics()).activeMs;
  await page.clock.runFor(3_000);
  expect((await readMetrics()).activeMs).toBe(pausedAt);
  await page.getByRole("button", { name: "再開" }).click();
  await page.clock.runFor(1_000);
  await page.getByRole("button", { name: "一時停止" }).click();
  const resumedAt = (await readMetrics()).activeMs;
  expect(resumedAt).toBeGreaterThanOrEqual(pausedAt + 1_000);
  await page.clock.runFor(3_000);
  expect((await readMetrics()).activeMs).toBe(resumedAt);
  await page.getByRole("button", { name: "再開" }).click();
  await clearThreeActs(page);
  await expect(page.locator(".playtest-result")).toContainText("実操作");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "計測JSONを保存" }).click();
  const download = await downloadPromise;
  const report = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(report.result).toBe("won");
  expect(report.partial).toBe(false);
  expect(report.visits.length).toBeGreaterThanOrEqual(9);
  expect(report.battleNodeIds.length).toBeGreaterThanOrEqual(3);
  expect(report.battles.length).toBeGreaterThanOrEqual(3);
  expect(report.battles.every((battle: { result: string | null }) => battle.result === "won")).toBe(true);
  expect(report.battles.every((battle: { endedAtActiveMs: number | null }) => battle.endedAtActiveMs !== null)).toBe(true);
  expect(report.activeMs).toBeGreaterThanOrEqual(resumedAt);
  await page.getByRole("button", { name: "新しいランを始める" }).click();
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  const nextReport = await readMetrics();
  expect(nextReport.runId).not.toBe(report.runId);
  expect(nextReport.partial).toBe(false);
  expect(nextReport.battleNodeIds).toHaveLength(0);
});

test("science deck clears three Acts by typing and unlocks its own Ascension", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /科学部/ }).click();
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["science-demo"])).toBe(1);
});

test("kendo deck clears three Acts by typing and unlocks its own Ascension", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /剣道部/ }).click();
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["kendo-demo"])).toBe(1);
});

test("music deck clears three Acts by typing and unlocks its own Ascension", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /軽音部/ }).click();
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["music-demo"])).toBe(1);
});

test("art deck clears three Acts by typing and unlocks its own Ascension", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /美術部/ }).click();
  await clearThreeActs(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-progression-v1")!).unlockedByClub["art-demo"])).toBe(1);
});

test("treasure offers survive reload and a focused choice completes its node", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startScriptedRoute(page, ["combat", "treasure"]);
  await enterNextNode(page);
  await typeThroughBattle(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator(".reward-card .offer-outcome").first()).toContainText("デッキに追加");
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-reward-phone-20261031.png", fullPage: true });
  await page.getByRole("button", { name: "報酬を受け取らず進む" }).click();
  await page.locator(".map-node.available").filter({ hasText: "宝箱" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "資料保管庫" })).toBeVisible();
  await expect(page.locator('[data-action="treasure-offer"] .location-choice-outcome').first()).toContainText("受け取る");
  if (process.env.SCHOOL_RG_CAPTURE_CHOICES === "1") await page.screenshot({ path: "docs/content/previews/issue175-treasure-phone-20261031.png", fullPage: true });
  const offers = await page.locator('[data-action="treasure-offer"]').allTextContents();
  await page.reload();
  await expect(page.locator('[data-action="treasure-offer"]')).toHaveText(offers);
  await page.locator('[data-action="treasure-offer"]').first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.relicIds)).toHaveLength(2);
  await expect(page.locator(".map-node.current")).toBeDisabled();
});

test("a route can upgrade at rest and buy once at the shop", async ({ page }) => {
  await startScriptedRoute(page, ["rest", "shop"]);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).last().click();
  await expect(page.getByRole("heading", { name: /休憩席/ })).toBeVisible();
  await page.locator('.location-drawer summary').click();
  await page.locator("[data-action=rest-upgrade]").first().click();
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await expect(page.getByRole("heading", { name: /購買/ })).toBeVisible();
  await expect(page.locator("[data-action=buy-offer]")).toHaveCount(3);
  await page.locator("[data-action=buy-offer]").first().click();
  await expect(page.locator(".run-gold")).toHaveAttribute("aria-label", "所持金 10");
  await expect(page.locator("[data-action=buy-offer]").first()).toBeDisabled();
  await expect(page.locator("[data-action=buy-offer]").nth(1)).toBeDisabled();
  await expect(page.locator("[data-action=buy-offer]").nth(1)).toContainText("所持金不足");
  await page.getByRole("button", { name: /購買を出る/ }).click();
  await expect(page.locator(".map-node.available")).toContainText("ボス");
});

test("an event choice can start typed combat and cannot be entered twice", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await startDemoRun(page);
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.getByRole("button", { name: /購買を出る/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
  await expect(page.locator('.location-scene[data-location="event"]')).toBeVisible();
  await scriptActiveEvent(page, "after-school-board");
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
  await page.getByRole("button", { name: /購買を出る/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
  await scriptActiveEvent(page, "after-school-board");
  await page.locator("[data-action=event-choice][data-id=ink]").click();
  await expect(page.locator(".potion-slot")).toHaveCount(3);
  await page.keyboard.press("F2");
  await page.keyboard.type("ink");
  await expect(page.locator(".enemy-hud")).toContainText("19/26");
  await expect(page.locator(".potion-slot")).toHaveCount(2);
});

test("new events in each Act render at narrow width and resolve by keyboard", async ({ page }) => {
  const samples = [
    { act: 1 as const, eventId: "gym-supply-locker", title: "体育倉庫の予備箱" },
    { act: 2 as const, eventId: "lab-cleanup", title: "理科室の後片づけ" },
    { act: 3 as const, eventId: "last-train-board", title: "最終下校の案内板" },
  ];
  for (const sample of samples) {
    const eventPage = await page.context().newPage();
    await eventPage.setViewportSize({ width: 1024, height: 768 });
    const base = createRunSession(42, "literature-demo", demoContent);
    const start: MapNode = { id: `a${sample.act}-start`, act: sample.act, floor: 0, kind: "start", nextIds: [`a${sample.act}-event`] };
    const node: MapNode = { id: `a${sample.act}-event`, act: sample.act, floor: 1, kind: "event", nextIds: [] };
    const mapped = { ...base, run: { ...base.run, act: sample.act, map: { currentNodeId: start.id, nodes: [start, node] } }, completedNodeIds: [start.id] };
    const entered = enterRunNode(mapped, node.id, demoContent, demoEnemyAi, demoRunContentTables);
    const scripted = { ...entered, run: { ...entered.run, event: { ...entered.run.event!, eventId: sample.eventId } } };
    const saved = serializeRunSession(scripted, demoContent, { nowMs: () => 0 }, () => "discard");
    await eventPage.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await eventPage.goto("/");
    await expect(eventPage.locator('.location-scene[data-location="event"] h2')).toHaveText(sample.title);
    await expect(eventPage.locator('[data-action="event-choice"]')).toHaveCount(sample.act === 1 ? 3 : 4);
    expect(await eventPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (process.env.SCHOOL_RG_CAPTURE_EVENTS === "1") {
      await eventPage.screenshot({ path: `docs/content/previews/issue116-act${sample.act}-event-narrow-20261031.png`, fullPage: true });
    }
    await eventPage.locator("[data-action=event-choice][data-id=leave]").focus();
    await eventPage.keyboard.press("Enter");
    await expect(eventPage.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
    await eventPage.close();
  }
});

test("deck-edit events select a specific card by keyboard across all Acts", async ({ page }) => {
  const samples = [
    { act: 1 as const, eventId: "classroom-proofreading", choiceId: "upgrade", cost: 14, removes: false },
    { act: 2 as const, eventId: "archive-return-slip", choiceId: "remove", cost: 18, removes: true },
    { act: 3 as const, eventId: "festival-layout-desk", choiceId: "upgrade", cost: 22, removes: false },
  ];
  for (const sample of samples) {
    const eventPage = await page.context().newPage();
    await eventPage.setViewportSize({ width: 1024, height: 768 });
    const base = createRunSession(42, "literature-demo", demoContent);
    const start: MapNode = { id: `a${sample.act}-start`, act: sample.act, floor: 0, kind: "start", nextIds: [`a${sample.act}-event`] };
    const node: MapNode = { id: `a${sample.act}-event`, act: sample.act, floor: 1, kind: "event", nextIds: [] };
    const mapped = { ...base, run: { ...base.run, act: sample.act, map: { currentNodeId: start.id, nodes: [start, node] } }, completedNodeIds: [start.id] };
    const entered = enterRunNode(mapped, node.id, demoContent, demoEnemyAi, demoRunContentTables);
    const scripted = { ...entered, run: { ...entered.run, event: { ...entered.run.event!, eventId: sample.eventId } } };
    const saved = serializeRunSession(scripted, demoContent, { nowMs: () => 0 }, () => "discard");
    await eventPage.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await eventPage.goto("/");
    await expect(eventPage.locator('.location-scene[data-location="event"]')).toBeVisible();
    const target = eventPage.locator(`.location-event-target:has([data-action=event-choice][data-id=${sample.choiceId}]) input[type=radio]`).nth(2);
    await expect(target).toBeVisible();
    await eventPage.reload();
    await eventPage.locator(`.location-event-target:has([data-action=event-choice][data-id=${sample.choiceId}]) input[type=radio]`).first().focus();
    await eventPage.keyboard.press("ArrowRight");
    await eventPage.keyboard.press("ArrowRight");
    await expect(target).toBeChecked();
    const selectedId = await target.inputValue();
    expect(selectedId).toBe(scripted.run.deck[2]!.instanceId);
    if (process.env.SCHOOL_RG_CAPTURE_DECK_EVENTS === "1") {
      await eventPage.screenshot({ path: `docs/content/previews/issue157-act${sample.act}-event-narrow-20261031.png`, fullPage: true });
    }
    const button = eventPage.locator(`[data-action=event-choice][data-id=${sample.choiceId}]`);
    await button.focus();
    await eventPage.keyboard.press("Enter");
    await expect(eventPage.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
    const result = await eventPage.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run);
    expect(result.gold).toBe(scripted.run.gold - sample.cost);
    expect(result.deck.length).toBe(scripted.run.deck.length - Number(sample.removes));
    expect(result.deck.find((card: { instanceId: string }) => card.instanceId === selectedId)?.upgraded).toBe(sample.removes ? undefined : true);
    expect(await eventPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await eventPage.close();
  }
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
  await startScriptedRoute(page, ["rest", "shop", "combat"]);
  await page.locator(".map-node.available").filter({ hasText: "休憩" }).last().click();
  await page.locator('.location-drawer summary').click();
  await page.locator("[data-action=rest-upgrade]").first().click();
  await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
  await page.locator("[data-action=buy-offer]").first().click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /購買/ })).toBeVisible();
  await expect(page.locator(".run-gold")).toHaveAttribute("aria-label", "所持金 10");
  await expect(page.locator("[data-action=buy-offer]").first()).toBeDisabled();
  await page.getByRole("button", { name: /購買を出る/ }).click();
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

test("sound toggle stays usable on a narrow screen and survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  const sound = page.locator("[data-action=toggle-audio]");
  await expect(sound).toBeVisible();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await expect(sound).toBeVisible();
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /文芸部/ }).click();
  await enterNextNode(page);
  await page.getByRole("button", { name: "操作" }).click();
  await expect(sound).toBeVisible();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
});

test("one typed card emits one sound and mute suppresses the next card", async ({ page }) => {
  await page.addInitScript(() => {
    let starts = 0;
    Object.defineProperty(window, "__soundStarts", { get: () => starts });
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      override createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => { starts++; start(...args); };
        return oscillator;
      }
    };
  });
  await startDemoRun(page);
  await enterNextNode(page);
  await page.keyboard.type("heavy strike");
  expect(await page.evaluate(() => Reflect.get(window, "__soundStarts"))).toBe(1);
  await page.getByRole("button", { name: "操作" }).click();
  await page.locator("[data-action=toggle-audio]").click();
  await page.getByRole("button", { name: "操作" }).click();
  await page.keyboard.type("strike");
  expect(await page.evaluate(() => Reflect.get(window, "__soundStarts"))).toBe(1);
});

test("battle help stays on the battle screen and does not alter the clock", async ({ page }) => {
  await page.clock.install();
  await startDemoRun(page);
  await enterNextNode(page);
  const time = page.locator("[data-role=time]");
  const before = Number.parseFloat(await time.innerText());
  await page.getByRole("button", { name: "操作" }).click();
  await expect(page.locator("#battle-help")).toBeVisible();
  await expect(page.locator(".stage")).toBeVisible();
  await expect(page.locator(".hand")).toBeVisible();
  await expect(page.getByRole("button", { name: "操作" })).toHaveAttribute("aria-expanded", "true");
  await page.clock.runFor(1_000);
  expect(before - Number.parseFloat(await time.innerText())).toBeGreaterThan(0.7);
  await page.keyboard.press("Escape");
  await expect(page.locator("#battle-help")).toBeHidden();
  await expect(page.getByRole("button", { name: "操作" })).toBeFocused();
  await page.getByRole("button", { name: "一時停止" }).click();
  await expect(page.getByRole("button", { name: "再開" })).toBeFocused();
  const pausedAt = await time.innerText();
  await page.getByRole("button", { name: "操作" }).click();
  await page.clock.runFor(1_000);
  expect(await time.innerText()).toBe(pausedAt);
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();
  await expect(page.getByRole("button", { name: "操作" })).toBeFocused();
  await page.getByRole("button", { name: "再開" }).click();
  await page.getByRole("button", { name: "操作" }).click();
  await page.keyboard.press("s");
  await expect(page.locator("#battle-help")).toBeHidden();
  await expect(page.locator(".typing-input")).toHaveValue("s");
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }]) {
  test(`battle help fits ${viewport.width}px without hiding the combat context`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await startDemoRun(page);
    await enterNextNode(page);
    await page.getByRole("button", { name: "操作" }).click();
    const help = await page.locator("#battle-help").boundingBox();
    expect(help).not.toBeNull();
    expect(help!.x).toBeGreaterThanOrEqual(0);
    expect(help!.x + help!.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator(".stage .enemy-hud").first()).toBeVisible();
    await expect(page.locator(".hand .card").first()).toBeVisible();
    await expect(page.locator(".topbar .brand")).toHaveCount(0);
    await page.getByRole("button", { name: "閉じる" }).click();
  });
}

test("default club selection shows five distinct characters and chosen battle art", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => { if (request.url().includes("candidate-")) requested.push(request.url()); });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  const portraits = page.locator(".club-choice img");
  await expect(portraits).toHaveCount(5);
  await portraits.evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  const urls = await portraits.evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
  expect(new Set(urls).size).toBe(5);
  expect(await portraits.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(requested.filter((url) => /activate-candidate|hit-candidate/.test(url))).toHaveLength(0);
  await page.getByRole("button", { name: /科学部/ }).click();
  await enterNextNode(page);
  await expect(page.locator(".game")).toHaveAttribute("data-club", "science-demo");
  await expect(page.locator(".hero-art")).toHaveAttribute("src", /serious-student-idle-candidate/);
  await page.locator(".hero-art").evaluate((image) => (image as HTMLImageElement).decode());
  expect(await page.locator(".hero-art").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
