import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE317_CAUSALITY_CAPTURE_DIR;

async function openPaperFight(page: import("@playwright/test").Page, intentId: string): Promise<void> {
  await page.clock.install();
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "causal-start", act: 1, floor: 0, kind: "start", nextIds: ["causal-fight"] };
  const fight: MapNode = { id: "causal-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
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
  await expect(page.locator(".enemy-action-art")).toBeVisible();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2_000);
}

async function capture(page: import("@playwright/test").Page, name: string): Promise<void> {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${name}.png` });
  const hidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.intent-body-cue,.intent-trajectory,.result-fx-mark,.battle-message{visibility:hidden!important}" });
  await page.screenshot({ path: `${captureDir}/${name}-art-only.png` });
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
}

for (const width of [1024, 1440] as const) for (const [intentId, pose] of [["paper-intent-hit", "attack"], ["paper-intent-guard", "guard"]] as const) {
  test(`integrated ${pose} causality at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await openPaperFight(page, intentId);
    await expect(page.locator(".enemy-action-art")).toHaveAttribute("data-pose", pose);
    await capture(page, `paper-${pose}-${width}-preview`);
    const stageBefore = await page.locator(".stage").boundingBox();
    const remaining = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remaining + 80);
    await expect(page.locator(".enemy-action-art")).toHaveAttribute("data-phase", "action");
    await expect(page.locator(".enemy-action-art")).toHaveCSS("animation-name", pose === "attack" ? "paper-pencil-thrust" : "paper-guard-brace");
    await capture(page, `paper-${pose}-${width}-windup`);
    await page.clock.runFor(500);
    if (captureDir) await page.screenshot({ path: `${captureDir}/paper-${pose}-${width}-contact.png` });
    let resolved = false;
    for (let tick = 0; tick < 12 && !resolved; tick++) {
      await page.clock.runFor(100);
      if (pose === "attack") resolved = (await page.getByRole("meter", { name: "プレイヤーのHP" }).getAttribute("aria-valuenow")) === "36";
      else resolved = await page.locator(".enemy-block").count() > 0 && ((await page.locator(".enemy-block").first().textContent())?.includes("4") ?? false);
    }
    expect(resolved).toBe(true);
    if (pose === "attack") await expect(page.locator('.ally-slot[data-actor-motion="hit"]')).toBeVisible();
    await capture(page, `paper-${pose}-${width}-resolved`);
    expect(await page.locator(".stage").boundingBox()).toEqual(stageBefore);
  });
}

test("integrated typed strike causes the paper enemy's hit pose and HP loss", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPaperFight(page, "paper-intent-hit");
  await capture(page, "paper-card-hit-1440-before");
  await page.keyboard.type("strike");
  await expect(page.locator('.enemy-action-art[data-pose="hit"]')).toBeVisible();
  await expect(page.getByRole("meter", { name: "答案のかたまりのHP" })).toHaveAttribute("aria-valuenow", "20");
  await capture(page, "paper-card-hit-1440-resolved");
});
