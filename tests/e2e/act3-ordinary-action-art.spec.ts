import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ACT3_ACTION_CAPTURE_DIR;

type Case = { enemyId: string; intentId: string; pose: "attack" | "status" | "buff"; result: "hp" | "frail" | "strength" };
const cases: Case[] = [
  { enemyId: "night-announcement", intentId: "announcement-intent-hit", pose: "attack", result: "hp" },
  { enemyId: "night-announcement", intentId: "announcement-intent-frail", pose: "status", result: "frail" },
  { enemyId: "window-shadow", intentId: "window-intent-hit", pose: "attack", result: "hp" },
  { enemyId: "window-shadow", intentId: "window-intent-focus", pose: "buff", result: "strength" },
];

async function openFight(page: import("@playwright/test").Page, enemyId: string, intentId: string): Promise<void> {
  await page.clock.install();
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "act3-action-start", act: 3, floor: 0, kind: "start", nextIds: ["act3-action-fight"] };
  const fight: MapNode = { id: "act3-action-fight", act: 3, floor: 1, kind: "combat", nextIds: [] };
  const map = { currentNodeId: start.id, nodes: [start, fight] };
  const entered = enterRunNode({ ...base, run: { ...base.run, act: 3, map }, completedNodeIds: [start.id] }, fight.id,
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
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
}

for (const width of [1024, 1440] as const) for (const subject of cases) {
  test(`${subject.enemyId} ${subject.pose} at ${width}px follows its Intent and outcome`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await openFight(page, subject.enemyId, subject.intentId);
    const art = page.locator(".enemy-action-art");
    await expect(art).toHaveAttribute("data-pose", subject.pose);
    await capture(page, `${subject.enemyId}-${subject.pose}-${width}-preview`);
    const stage = await page.locator(".stage").boundingBox();
    const slot = await page.locator(".enemy-slot").boundingBox();
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    await expect(art).toHaveAttribute("data-phase", "action");
    await page.clock.runFor(900);
    if (subject.result === "hp") await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", subject.enemyId === "window-shadow" ? "35" : "36");
    if (subject.result === "frail") await expect(page.locator('.player-hud .status-chip[data-status="frail"]')).toBeVisible();
    if (subject.result === "strength") await expect(page.locator('.enemy-status .status-chip[data-status="strength"]')).toBeVisible();
    await capture(page, `${subject.enemyId}-${subject.pose}-${width}-resolved`);
    expect(await page.locator(".stage").boundingBox()).toEqual(stage);
    expect(await page.locator(".enemy-slot").boundingBox()).toEqual(slot);
  });
}

for (const [enemyId, intentId, maxHp] of [["night-announcement", "announcement-intent-frail", 28], ["window-shadow", "window-intent-focus", 30]] as const) {
  test(`${enemyId} card-hit still and quiet pose retain source identity`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openFight(page, enemyId, intentId);
    await page.getByRole("button", { name: "操作", exact: true }).click();
    await page.locator("[data-action=toggle-stimulus]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
    const art = page.locator(".enemy-action-art");
    expect(await art.evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
    await capture(page, `${enemyId}-quiet-1024`);
    await page.keyboard.type("strike");
    await expect(art).toHaveAttribute("data-pose", "hit");
    await expect(page.getByRole("meter", { name: `${demoContent.enemies.find((enemy) => enemy.id === enemyId)!.name}のHP` })).toHaveAttribute("aria-valuenow", String(maxHp - 6));
    await capture(page, `${enemyId}-hit-quiet-1024`);
  });
}
