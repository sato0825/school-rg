import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE374_CAPTURE_DIR;
const cases = [
  { enemyId: "late-pass", intentId: "late-pass-intent-hit", pose: "attack", effect: "damage" },
  { enemyId: "late-pass", intentId: "late-pass-intent-weak", pose: "status", effect: "weak" },
  { enemyId: "lost-homework", intentId: "homework-intent-hit", pose: "attack", effect: "damage" },
  { enemyId: "lost-homework", intentId: "homework-intent-weak", pose: "status", effect: "weak" },
  { enemyId: "folded-school-map", intentId: "map-intent-hit", pose: "attack", effect: "damage" },
  { enemyId: "folded-school-map", intentId: "map-intent-call", pose: "summon", effect: "summon" },
] as const;

async function openFight(page: import("@playwright/test").Page, enemyId: string, intentId: string): Promise<void> {
  await page.clock.install();
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "normal-start", act: 1, floor: 0, kind: "start", nextIds: ["normal-fight"] };
  const fight: MapNode = { id: "normal-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
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

async function capture(page: import("@playwright/test").Page, name: string): Promise<void> {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${name}.png` });
  const hidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.intent-body-cue,.intent-trajectory,.result-fx-mark,.battle-message{visibility:hidden!important}" });
  await page.screenshot({ path: `${captureDir}/${name}-art-only.png` });
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
}

for (const width of [1024, 1440] as const) for (const entry of cases) {
  test(`${entry.enemyId} ${entry.pose} Intent resolves as ${entry.effect} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await openFight(page, entry.enemyId, entry.intentId);
    const art = page.locator(".enemy-action-art").first();
    await expect(art).toHaveAttribute("data-pose", entry.pose);
    const stageBefore = await page.locator(".stage").boundingBox();
    await capture(page, `${entry.enemyId}-${entry.pose}-${width}-preview`);
    const remaining = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remaining + 80);
    await expect(art).toHaveAttribute("data-phase", "action");
    await expect(art).toHaveAttribute("data-intent-id", entry.intentId);
    await capture(page, `${entry.enemyId}-${entry.pose}-${width}-windup`);
    await page.clock.runFor(900);
    if (entry.effect === "damage") await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", "37");
    if (entry.effect === "weak") await expect(page.locator('.status-row .status-chip[data-status="weak"]')).toBeVisible();
    if (entry.effect === "summon") await expect(page.locator(".enemy-slot")).toHaveCount(2);
    expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
    await capture(page, `${entry.enemyId}-${entry.pose}-${width}-resolved`);
  });
}

for (const enemyId of ["late-pass", "lost-homework", "folded-school-map"] as const) {
  const entry = cases.find((item) => item.enemyId === enemyId)!;
  test(`${enemyId} uses a still pose in quiet mode and reacts to a card`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openFight(page, enemyId, entry.intentId);
    await page.getByRole("button", { name: "操作", exact: true }).click();
    await page.locator("[data-action=toggle-stimulus]").click();
    await page.keyboard.press("Escape");
    const art = page.locator(".enemy-action-art");
    expect(await art.evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
    await capture(page, `${enemyId}-quiet-1024`);
    const hpBefore = Number(await page.locator(".enemy-health-track").getAttribute("aria-valuenow"));
    await page.keyboard.type("strike");
    await expect(art).toHaveAttribute("data-pose", "hit");
    await expect(page.locator(".enemy-health-track")).toHaveAttribute("aria-valuenow", String(hpBefore - 6));
    await capture(page, `${enemyId}-hit-quiet-1024`);
  });
}
