import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const [count, width] of [[3, 390], [4, 390], [5, 390], [5, 1440]] as const) {
  test(`${count} enemy targets remain readable and operable at ${width}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
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
    const roster = page.locator(".enemy-roster-button");
    await expect(roster).toHaveCount(count);
    await expect(page.locator(".enemy-slot")).toHaveCount(count);
    await expect(page.locator("div.enemy-slot[aria-hidden=true]")).toHaveCount(count);
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(roster.last().locator(".enemy-roster-bar")).toHaveAttribute("aria-valuenow", String(first.maxHp - (count - 1) * 2));
    await roster.last().focus();
    await expect(roster.last().locator(".enemy-detail")).toBeVisible();
    await expect(roster.last()).toHaveAttribute("aria-label", /状態: 毒 2/);
    const detail = await roster.last().locator(".enemy-detail").boundingBox();
    expect(detail!.x).toBeGreaterThanOrEqual(stage!.x - 1);
    expect(detail!.x + detail!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
    if (process.env.SCHOOL_RG_CAPTURE_MULTI === "1" && count === 5) await page.screenshot({ path: `docs/art/previews/issue170-five-enemies-${width}.png` });
    await roster.nth(1).click();
    await expect(roster.nth(1)).toBeFocused();
    await expect(roster.nth(1).locator(".enemy-detail")).toBeVisible();
  });
}
