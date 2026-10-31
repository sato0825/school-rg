import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

async function openPaperFight(page: import("@playwright/test").Page, intentId: string): Promise<void> {
  await page.clock.install();
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "pose-start", act: 1, floor: 0, kind: "start", nextIds: ["pose-fight"] };
  const fight: MapNode = { id: "pose-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["paper-heap"] });
  const combat = entered.run.combat!;
  const strikeId = combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const prepared = { ...entered, run: { ...entered.run, combat: { ...combat,
    enemies: combat.enemies.map((enemy) => ({ ...enemy, intentId })),
    drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId],
  } } };
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
  await page.goto("/");
  await expect(page.locator('.enemy-action-art[data-intent-id="' + intentId + '"]')).toBeVisible();
}

for (const [intentId, pose] of [["paper-intent-hit", "attack"], ["paper-intent-guard", "guard"]] as const) {
  test(`${pose} pose follows the live paper-heap Intent and resolved action`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPaperFight(page, intentId);
    const sprite = page.locator(".enemy-action-art");
    await expect(sprite).toHaveAttribute("data-pose", pose);
    const stageBefore = await page.locator(".stage").boundingBox();
    const enemyBefore = await page.locator(".enemy-slot").boundingBox();
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    await expect(sprite).toHaveAttribute("data-phase", "action");
    await page.clock.runFor(650);
    await expect(sprite).toHaveAttribute("data-pose", pose);
    await expect(sprite).toHaveAttribute("data-phase", "action");
    expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
    expect(await page.locator(".enemy-slot").boundingBox()).toEqual(enemyBefore);
    if (pose === "guard") await expect(page.locator('.result-fx-mark[data-kind="block"]')).toBeVisible();
    else await expect(page.locator('.result-fx-mark[data-kind="damage"]')).toBeVisible();
  });
}

test("card damage shows the enemy's hit reaction and quiet mode keeps the action pose static", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPaperFight(page, "paper-intent-hit");
  await page.getByRole("button", { name: "操作", exact: true }).click();
  await page.locator("[data-action=toggle-stimulus]").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
  const sprite = page.locator(".enemy-action-art");
  expect(await sprite.evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
  await page.keyboard.type("strike");
  await expect(sprite).toHaveAttribute("data-pose", "hit");
  await expect(sprite).toHaveAttribute("data-phase", "hit");
  await expect(page.locator('.result-fx-mark[data-kind="damage"]')).toBeVisible();
});
