import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE317_CAPTURE_DIR;

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

for (const width of [1024, 1440] as const) for (const [intentId, pose] of [["paper-intent-hit", "attack"], ["paper-intent-guard", "guard"]] as const) {
  test(`${pose} pose follows the live paper-heap Intent and resolved action at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await openPaperFight(page, intentId);
    const sprite = page.locator(".enemy-action-art");
    await expect(sprite).toHaveAttribute("data-pose", pose);
    await page.clock.runFor(1_600);
    if (captureDir) await page.screenshot({ path: `${captureDir}/paper-heap-${pose}-preview-${width}.png` });
    if (captureDir) {
      const labelsHidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.enemy-art-number,.intent-body-cue,.intent-trajectory{visibility:hidden!important}" });
      await page.screenshot({ path: `${captureDir}/paper-heap-${pose}-visual-only-${width}.png` });
      await labelsHidden.evaluate((element) => element.parentNode?.removeChild(element));
    }
    await page.getByRole("button", { name: "操作", exact: true }).click();
    await page.locator("[data-action=toggle-stimulus]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
    if (captureDir) await page.screenshot({ path: `${captureDir}/paper-heap-${pose}-quiet-${width}.png` });
    await page.getByRole("button", { name: "操作", exact: true }).click();
    await page.locator("[data-action=toggle-stimulus]").click();
    await page.keyboard.press("Escape");
    const stageBefore = await page.locator(".stage").boundingBox();
    const enemyBefore = await page.locator(".enemy-slot").boundingBox();
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    await expect(sprite).toHaveAttribute("data-phase", "action");
    if (captureDir) await page.screenshot({ path: `${captureDir}/paper-heap-${pose}-action-${width}.png` });
    // The intent resolves after the 650 ms enemy windup. Inspect while its
    // 420 ms result cue is still present, before the next turn clears it.
    await page.clock.runFor(600);
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
  if (captureDir) await page.screenshot({ path: `${captureDir}/paper-heap-hit-quiet-1440.png` });
});

for (const [pose, intentId, quiet] of [["attack", "paper-intent-hit", false], ["guard", "paper-intent-guard", false], ["guard", "paper-intent-guard", true]] as const) test(`${pose} silhouette fits five enemies at 1024px${quiet ? " in quiet mode" : ""}`, async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const base = createRunSession(97, "science-demo", demoContent);
  const start: MapNode = { id: "five-start", act: 1, floor: 0, kind: "start", nextIds: ["five-fight"] };
  const fight: MapNode = { id: "five-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["paper-heap"] });
  const combat = entered.run.combat!;
  const first = combat.enemies[0]!;
  const ids = ["paper-heap", "paper-scrap", "hall-mop", "folded-school-map", "archive-clock"];
  const enemies = ids.map((id, index) => {
    const definition = demoContent.enemies.find((enemy) => enemy.id === id)!;
    return { ...first, instanceId: `five-${index}`, enemyId: id, hp: definition.maxHp, maxHp: definition.maxHp, intentId: index === 0 ? intentId : definition.intentIds[0]! };
  });
  const prepared = { ...entered, run: { ...entered.run, combat: { ...combat, enemies } } };
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
  await page.goto("/");
  await expect(page.locator(".enemy-slot")).toHaveCount(5);
  await expect(page.locator(`.enemy-action-art[data-pose="${pose}"]`)).toBeVisible();
  if (quiet) {
    await page.getByRole("button", { name: "操作", exact: true }).click();
    await page.locator("[data-action=toggle-stimulus]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
    expect(await page.locator(".enemy-action-art").evaluate((node) => [node, ...node.querySelectorAll("img")].every((item) => item.getAnimations().length === 0))).toBe(true);
  }
  const [stage, hero, paper] = await Promise.all([page.locator(".stage").boundingBox(), page.locator(".ally-slot").boundingBox(), page.locator(".enemy-action-art").boundingBox()]);
  const slotBefore = await page.locator(".enemy-slot").first().boundingBox();
  expect(stage && hero && paper).toBeTruthy();
  expect(paper!.x).toBeGreaterThan(hero!.x + hero!.width);
  expect(paper!.x + paper!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  if (captureDir) {
    await page.screenshot({ path: `${captureDir}/paper-heap-five-enemies-${pose}${quiet ? "-quiet" : ""}-1024.png` });
    const labelsHidden = await page.addStyleTag({ content: ".enemy-hud,.enemy-roster,.enemy-art-number,.intent-body-cue,.intent-trajectory{visibility:hidden!important}" });
    await page.screenshot({ path: `${captureDir}/paper-heap-five-enemies-${pose}${quiet ? "-quiet" : ""}-visual-only-1024.png` });
    await labelsHidden.evaluate((element) => element.parentNode?.removeChild(element));
  }
  // Selection keeps every slot fixed while enlarging the authored action image.
  await page.locator('.enemy-roster-button[data-id="five-0"]').click();
  await expect(page.locator('.enemy-slot.targeted .enemy-action-art')).toBeVisible();
  await expect(page.locator('.enemy-slot.targeted .enemy-pose-action')).toHaveCSS("opacity", "1");
  await page.clock.runFor(250);
  const selectedPaper = await page.locator(".enemy-action-art").boundingBox();
  expect(selectedPaper!.width).toBeGreaterThan(paper!.width * 1.3);
  expect(await page.locator(".stage").boundingBox()).toEqual(stage);
  if (captureDir) await page.screenshot({ path: `${captureDir}/paper-heap-five-enemies-${pose}${quiet ? "-quiet" : ""}-selected-1024.png` });
  await page.locator('.enemy-roster-button[data-id="five-1"]').click();
  await page.clock.runFor(250);
  expect(await page.locator(".enemy-slot").first().boundingBox()).toEqual(slotBefore);
  await expect.poll(async () => (await page.locator(".enemy-action-art").boundingBox())!.width).toBeLessThan(paper!.width * 1.05);
  if (pose === "attack" && !quiet) {
    await page.locator('.enemy-roster-button[data-id="five-0"]').click();
    await expect(page.locator(".intent-trajectory")).toHaveCount(1);
    await page.keyboard.type("strike");
    await expect(page.locator(".intent-trajectory")).toHaveCount(0);
    expect(await page.locator(".stage").boundingBox()).toEqual(stage);
  }
});
