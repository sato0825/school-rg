import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE381_CAPTURE_DIR;
type Boss = { enemyId: "closing-bell" | "graduation-curtain"; intentId: string; pose: string; result: "attack" | "guard" | "prepare" };
const cases: Boss[] = [
  { enemyId: "closing-bell", intentId: "bell-intent-hit", pose: "attack", result: "attack" },
  { enemyId: "closing-bell", intentId: "bell-intent-guard", pose: "guard", result: "guard" },
  { enemyId: "graduation-curtain", intentId: "curtain-intent-hit", pose: "attack", result: "attack" },
  { enemyId: "graduation-curtain", intentId: "curtain-intent-prepare", pose: "prepare", result: "prepare" },
];

async function openBossFight(page: import("@playwright/test").Page, enemyId: Boss["enemyId"], intentId: string): Promise<void> {
  await page.clock.install();
  const base = createRunSession(381, "literature-demo", demoContent);
  const start: MapNode = { id: "boss-start", act: 3, floor: 0, kind: "start", nextIds: ["boss-fight"] };
  const fight: MapNode = { id: "boss-fight", act: 3, floor: 1, kind: "boss", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, act: 3, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: [enemyId], elite: [enemyId], boss: [enemyId] });
  const combat = entered.run.combat!;
  const strikeId = combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const prepared = { ...entered, run: { ...entered.run, combat: { ...combat,
    enemies: combat.enemies.map((enemy) => ({ ...enemy, intentId })),
    drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId],
  } } };
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
  await page.goto("/");
  await expect(page.locator(`.enemy-action-art[data-intent-id="${intentId}"]`)).toBeVisible();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2_000);
}

async function capture(page: import("@playwright/test").Page, filename: string): Promise<void> {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${filename}.png` });
  const hidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.intent-body-cue,.intent-trajectory,.result-fx-mark,.battle-message{visibility:hidden!important}" });
  await page.screenshot({ path: `${captureDir}/${filename}-art-only.png` });
  await hidden.evaluate((node) => node.parentNode?.removeChild(node));
}

for (const width of [1024, 1440] as const) for (const item of cases) test(`${item.enemyId} ${item.pose} follows ${item.intentId} at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  await openBossFight(page, item.enemyId, item.intentId);
  const sprite = page.locator(".enemy-action-art");
  await expect(sprite).toHaveAttribute("data-pose", item.pose);
  const stageBefore = await page.locator(".stage").boundingBox();
  await capture(page, `${item.enemyId}-${item.pose}-${width}-preview`);
  await page.getByRole("button", { name: "操作", exact: true }).click();
  await page.locator("[data-action=toggle-stimulus]").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
  expect(await sprite.evaluate((node) => [node, ...node.querySelectorAll("img")].every((element) => element.getAnimations().length === 0))).toBe(true);
  await capture(page, `${item.enemyId}-${item.pose}-${width}-quiet`);
  await page.getByRole("button", { name: "操作", exact: true }).click();
  await page.locator("[data-action=toggle-stimulus]").click();
  await page.keyboard.press("Escape");
  const remaining = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(remaining + 80);
  await expect(sprite).toHaveAttribute("data-phase", "action");
  await capture(page, `${item.enemyId}-${item.pose}-${width}-action`);
  await page.clock.runFor(900);
  if (item.result === "guard") await expect(page.locator(".enemy-block").first()).toContainText("7");
  else if (item.result === "prepare") {
    await expect(page.locator(".enemy-block").first()).toContainText("7");
    await expect(page.locator('.enemy-status .status-chip[data-status="strength"]')).toHaveAttribute("aria-label", /力 1/);
  } else await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", item.enemyId === "closing-bell" ? "35" : "31");
  expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
  await capture(page, `${item.enemyId}-${item.pose}-${width}-resolved`);
});

for (const enemyId of ["closing-bell", "graduation-curtain"] as const) test(`${enemyId} reacts to typed card damage`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBossFight(page, enemyId, enemyId === "closing-bell" ? "bell-intent-hit" : "curtain-intent-hit");
  await page.keyboard.type("strike");
  await expect(page.locator('.enemy-action-art[data-pose="hit"][data-phase="hit"]')).toBeVisible();
  const hp = enemyId === "closing-bell" ? "34" : "36";
  const label = enemyId === "closing-bell" ? "終業の鐘のHP" : "講堂の閉じる幕のHP";
  await expect(page.getByRole("meter", { name: label })).toHaveAttribute("aria-valuenow", hp);
  await capture(page, `${enemyId}-hit-1440`);
});
