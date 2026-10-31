import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE379_CAPTURE_DIR;

async function openChalkFight(page: import("@playwright/test").Page, intentId: string, five = false): Promise<void> {
  await page.clock.install();
  const base = createRunSession(379, "literature-demo", demoContent);
  const start: MapNode = { id: "chalk-start", act: 2, floor: 0, kind: "start", nextIds: ["chalk-fight"] };
  const fight: MapNode = { id: "chalk-fight", act: 2, floor: 1, kind: "combat", nextIds: [] };
  const seeded = { ...base, run: { ...base.run, act: 2 as const, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] };
  const entered = enterRunNode(seeded, fight.id, demoContent, demoEnemyAi,
    { byAct: { 1: { combat: ["chalk-cloud"], elite: ["chalk-cloud"], boss: ["chalk-cloud"] }, 2: { combat: ["chalk-cloud"], elite: ["chalk-cloud"], boss: ["chalk-cloud"] }, 3: { combat: ["chalk-cloud"], elite: ["chalk-cloud"], boss: ["chalk-cloud"] } } });
  const combat = entered.run.combat!;
  const strikeId = combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const first = combat.enemies[0]!;
  const enemyIds = ["chalk-cloud", "safety-sign", "lab-magnet", "beaker-mist", "lab-coil"];
  const enemies = five ? enemyIds.map((enemyId, index) => {
    const definition = demoContent.enemies.find((enemy) => enemy.id === enemyId)!;
    return { ...first, instanceId: `act2-${index}`, enemyId, hp: definition.maxHp, maxHp: definition.maxHp, intentId: index ? definition.intentIds[0]! : intentId };
  }) : combat.enemies.map((enemy) => ({ ...enemy, intentId }));
  const prepared = { ...entered, run: { ...entered.run, combat: { ...combat, enemies, drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId] } } };
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
  await page.goto("/");
  await expect(page.locator('.enemy-action-art[data-art-id="enemy-chalk-cloud-action"]')).toBeVisible();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2_000);
}

async function capture(page: import("@playwright/test").Page, name: string): Promise<void> {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${name}.png` });
  const hidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.enemy-art-number,.intent-body-cue,.intent-trajectory,.result-fx-mark,.battle-message{visibility:hidden!important}" });
  await page.screenshot({ path: `${captureDir}/${name}-art-only.png` });
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
}

for (const width of [1024, 1440] as const) for (const [intentId, pose, outcome] of [
  ["chalk-intent-hit", "attack", "hp"],
  ["chalk-intent-weak", "status", "weak"],
] as const) test(`chalk cloud ${pose} live action at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  await openChalkFight(page, intentId);
  const sprite = page.locator('.enemy-action-art[data-art-id="enemy-chalk-cloud-action"]');
  await expect(sprite).toHaveAttribute("data-pose", pose);
  await expect(sprite).toHaveAttribute("data-intent-id", intentId);
  await capture(page, `chalk-${pose}-${width}-preview`);
  const stageBefore = await page.locator(".stage").boundingBox();
  const remaining = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(remaining + 80);
  await expect(sprite).toHaveAttribute("data-phase", "action");
  await expect(sprite).toHaveAttribute("data-intent-id", intentId);
  await capture(page, `chalk-${pose}-${width}-action`);
  await page.clock.runFor(900);
  if (outcome === "hp") await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", "37");
  else await expect(page.locator('.status-row .status-chip[data-status="weak"]')).toBeVisible();
  expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
  await capture(page, `chalk-${pose}-${width}-resolved`);
});

test("chalk cloud hit reaction and quiet static pose in a mixed five-enemy Act 2 scene", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openChalkFight(page, "chalk-intent-weak", true);
  await expect(page.locator(".enemy-slot")).toHaveCount(5);
  const sprite = page.locator('.enemy-action-art[data-art-id="enemy-chalk-cloud-action"]');
  await capture(page, "chalk-five-1024-preview");
  await page.getByRole("button", { name: "操作", exact: true }).click();
  await page.locator("[data-action=toggle-stimulus]").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
  expect(await sprite.evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
  await capture(page, "chalk-five-1024-quiet");
  const stageBefore = await page.locator(".stage").boundingBox();
  await page.keyboard.type("strike");
  await expect(sprite).toHaveAttribute("data-pose", "hit");
  await expect(sprite).toHaveAttribute("data-phase", "hit");
  await capture(page, "chalk-five-1024-hit-quiet");
  expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
});
