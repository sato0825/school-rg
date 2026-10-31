import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE375_CAPTURE_DIR;

async function fight(page: import("@playwright/test").Page, intentId: string, mixed = false): Promise<void> {
  await page.clock.install();
  const base = createRunSession(77, "literature-demo", demoContent);
  const start: MapNode = { id: "hall-start", act: 1, floor: 0, kind: "start", nextIds: ["hall-fight"] };
  const node: MapNode = { id: "hall-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, node] } }, completedNodeIds: [start.id] }, node.id,
    demoContent, demoEnemyAi, { combat: ["hall-monitor"], elite: ["hall-monitor"], boss: ["hall-monitor"] });
  const combat = entered.run.combat!;
  const ids = mixed ? ["hall-monitor", "paper-scrap", "notice-board", "school-gate", "paper-heap"] : ["hall-monitor"];
  const enemy = combat.enemies[0]!;
  const enemies = ids.map((id, index) => {
    const definition = demoContent.enemies.find((item) => item.id === id)!;
    return { ...enemy, instanceId: `hall-${index}`, enemyId: id, hp: definition.maxHp, maxHp: definition.maxHp,
      intentId: index === 0 ? intentId : definition.intentIds[0]! };
  });
  const strikeId = combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const prepared = { ...entered, run: { ...entered.run, combat: { ...combat, enemies,
    drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId] } } };
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
  await page.goto("/");
  await expect(page.locator('.enemy-action-art[data-art-id="enemy-hall-monitor-action"]')).toBeVisible();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2_000);
}

async function screenshot(page: import("@playwright/test").Page, name: string): Promise<void> {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${name}.png` });
  const hidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.enemy-art-number,.intent-body-cue,.intent-trajectory{visibility:hidden!important}" });
  await page.screenshot({ path: `${captureDir}/${name}-art-only.png` });
  await hidden.evaluate((node) => node.parentNode?.removeChild(node));
}

for (const width of [1024, 1440] as const) for (const [intentId, pose] of [["hall-intent-hit", "attack"], ["hall-intent-guard", "guard"]] as const) {
  test(`hall monitor ${pose} follows Intent and outcome at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await fight(page, intentId);
    const sprite = page.locator('.enemy-action-art[data-art-id="enemy-hall-monitor-action"]');
    await expect(sprite).toHaveAttribute("data-pose", pose);
    await screenshot(page, `hall-${pose}-${width}-preview`);
    const stage = await page.locator(".stage").boundingBox();
    const remaining = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remaining + 80);
    await expect(sprite).toHaveAttribute("data-phase", "action");
    await screenshot(page, `hall-${pose}-${width}-action`);
    await page.clock.runFor(900);
    if (pose === "guard") await expect(page.locator(".enemy-block").first()).toContainText("5");
    else await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", "37");
    expect(await page.locator(".stage").boundingBox()).toEqual(stage);
    await screenshot(page, `hall-${pose}-${width}-resolved`);
  });
}

test("hall monitor hit reaction and quiet stills in the paired encounter", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await fight(page, "hall-intent-hit", true);
  await expect(page.locator(".enemy-slot")).toHaveCount(5);
  const sprite = page.locator('.enemy-action-art[data-art-id="enemy-hall-monitor-action"]');
  await screenshot(page, "hall-five-1024-preview");
  await page.getByRole("button", { name: "操作", exact: true }).click();
  await page.locator("[data-action=toggle-stimulus]").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
  expect(await sprite.evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
  await screenshot(page, "hall-five-1024-quiet");
  await page.keyboard.type("strike");
  await expect(sprite).toHaveAttribute("data-pose", "hit");
  await expect(page.getByRole("meter", { name: "廊下の見回りのHP" })).toHaveAttribute("aria-valuenow", "24");
  await screenshot(page, "hall-five-1024-hit");
});
