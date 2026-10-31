import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const [count, width, height] of [[3, 390, 844], [4, 390, 844], [5, 390, 800], [5, 390, 844], [5, 1440, 900]] as const) {
  test(`${count} enemy targets remain readable and operable at ${width}×${height}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "roster-start", act: 1, floor: 0, kind: "start", nextIds: ["roster-fight"] };
    const fight: MapNode = { id: "roster-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const combat = entered.run.combat!;
    const first = combat.enemies[0]!;
    const enemies = Array.from({ length: count }, (_, index) => ({ ...first, instanceId: `enemy-${index + 1}`, hp: first.maxHp - index * 2 }));
    const statuses = { ...combat.statuses, enemies: { ...combat.statuses.enemies, [`enemy-${count}`]: { poison: 2 } } };
    const session = { ...entered, run: { ...entered.run, combat: { ...combat, enemies, statuses } } };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    const initialTimeValue = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(150);
    await expect(page.locator("[data-role=time]")).toContainText("秒");
    await expect(page.locator("[data-role=time]")).not.toContainText("sec");
    expect(Number(await page.locator(".time-track").getAttribute("aria-valuenow"))).toBeLessThan(initialTimeValue);
    const roster = page.locator(".enemy-roster-button");
    await expect(roster).toHaveCount(count);
    await expect(page.locator(".enemy-slot")).toHaveCount(count);
    await expect(page.locator("div.enemy-slot[aria-hidden=true]")).toHaveCount(count);
    await expect(page.locator(".enemy-art-number")).toHaveText(Array.from({ length: count }, (_, index) => String(index + 1)));
    await expect(roster.locator(".enemy-roster-order")).toHaveText(Array.from({ length: count }, (_, index) => String(index + 1)));
    const stage = await page.locator(".stage").boundingBox();
    const boxes = await roster.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom };
    }));
    boxes.forEach((box, index) => {
      expect(box.left).toBeGreaterThanOrEqual(stage!.x - 1);
      expect(box.right).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
      expect(box.bottom).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
      if (index > 0) expect(box.left).toBeGreaterThanOrEqual(boxes[index - 1]!.right);
    });
    const artNumbers = await page.locator(".enemy-art-number").evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }));
    artNumbers.forEach((number, index) => { if (index > 0) expect(number.left).toBeGreaterThanOrEqual(artNumbers[index - 1]!.right); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(roster.last().locator(".enemy-roster-bar")).toHaveAttribute("aria-valuenow", String(first.maxHp - (count - 1) * 2));
    await roster.last().focus();
    await expect(roster.last().locator(".enemy-detail")).toBeVisible();
    await expect(roster.last()).toHaveAttribute("aria-label", /状態: 毒 2/);
    const detail = await roster.last().locator(".enemy-detail").boundingBox();
    expect(detail!.x).toBeGreaterThanOrEqual(stage!.x - 1);
    expect(detail!.x + detail!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
    if (width === 390) {
      expect(detail!.y).toBeGreaterThanOrEqual(stage!.y - 1);
      await roster.last().locator(".enemy-detail").evaluate((element) => {
        element.querySelector(".enemy-detail-heading strong")!.textContent = "放課後の巡回を担当する非常に長い名前の生徒";
        element.querySelector(".enemy-detail-status")!.textContent = "状態 · 毒 2、弱体 3、脆弱 4、集中低下 5、次の行動を遅らせる長い説明";
      });
      const stressed = await roster.last().locator(".enemy-detail").boundingBox();
      expect(stressed!.y).toBeGreaterThanOrEqual(stage!.y - 1);
      expect(stressed!.y + stressed!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
      const detailOverflow = await roster.last().locator(".enemy-detail").evaluate((element) => element.scrollHeight - element.clientHeight);
      expect(detailOverflow).toBeLessThanOrEqual(1);
      if (process.env.SCHOOL_RG_CAPTURE_MULTI === "1" && count === 5) await page.screenshot({ path: `docs/art/previews/issue170-five-enemies-v6-${width}x${height}-stress.png` });
    } else if (process.env.SCHOOL_RG_CAPTURE_MULTI === "1" && count === 5) await page.screenshot({ path: `docs/art/previews/issue170-five-enemies-v6-${width}x${height}.png` });
    await roster.nth(1).click();
    await expect(roster.nth(1)).toBeFocused();
    await expect(roster.nth(1).locator(".enemy-detail")).toBeVisible();
    if (count === 5 && width === 390) {
      const beforeHp = Number(await roster.nth(1).locator(".enemy-roster-bar").getAttribute("aria-valuenow"));
      await page.keyboard.type("s");
      await expect(page.locator(".typing-input")).toBeFocused();
      await page.keyboard.type("trike");
      await expect(page.locator(".battle-message")).toContainText("strike を発動");
      expect(Number(await roster.nth(1).locator(".enemy-roster-bar").getAttribute("aria-valuenow"))).toBeLessThan(beforeHp);
    }
  });
}

for (const width of [1024, 1440] as const) test(`five different enemies show every ordered Intent step at ${width}px`, async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  const base = createRunSession(42, "science-demo", demoContent);
  const start: MapNode = { id: "five-start", act: 1, floor: 0, kind: "start", nextIds: ["five-fight"] };
  const fight: MapNode = { id: "five-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const selected = [
    ["hall-mop", "mop-intent-sweep"],
    ["archive-clock", "clock-intent-prepare"],
    ["stage-spotlight", "spotlight-intent-glare"],
    ["folded-school-map", "map-intent-call"],
    ["paper-scrap", "scrap-intent-hit"],
  ] as const;
  const enemies = selected.map(([enemyId, intentId], index) => {
    const definition = demoContent.enemies.find((item) => item.id === enemyId)!;
    return { ...entered.run.combat!.enemies[0]!, instanceId: `five-enemy-${index}`, enemyId, intentId, hp: definition.maxHp, maxHp: definition.maxHp };
  });
  const session = { ...entered, run: { ...entered.run, combat: { ...entered.run.combat!, enemies } } };
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  const roster = page.locator(".enemy-roster-button");
  await expect(roster).toHaveCount(5);
  await expect(roster.nth(0).locator(":scope > .intent-steps > .intent-step")).toHaveCount(2);
  await expect(roster.nth(0)).toHaveAttribute("aria-label", /1番目.*攻撃.*2番目.*ブロック/);
  await expect(roster.nth(1).locator(":scope > .intent-steps > .intent-step")).toHaveCount(2);
  await expect(roster.nth(1)).toHaveAttribute("aria-label", /1番目.*力.*2番目.*ブロック/);
  await expect(roster.nth(2)).toHaveAttribute("aria-label", /脆弱/);
  await expect(roster.nth(3)).toHaveAttribute("aria-label", /召喚/);
  await page.locator(".enemy-art").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  if (process.env.SCHOOL_RG_CAPTURE_MULTI === "1") await page.screenshot({ path: `docs/art/previews/issue261-five-enemies-${width}-candidate-v3.png` });
  await roster.nth(0).click();
  await expect(roster.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(roster.nth(0).locator(".enemy-detail")).toBeVisible();
  if (process.env.SCHOOL_RG_CAPTURE_MULTI === "1") await page.screenshot({ path: `docs/art/previews/issue261-five-enemies-selected-${width}-candidate-v3.png` });
});
