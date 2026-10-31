import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const width of [1440, 390]) {
  test(`enemy turn leaves the battle layout still at ${width}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "hud-start", act: 1, floor: 0, kind: "start", nextIds: ["hud-fight"] };
    const fight: MapNode = { id: "hud-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    const geometry = () => page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };
      return { header: box(".topbar"), stage: box(".stage"), controls: box(".control-deck"), player: box(".player-hud"), scrollWidth: document.documentElement.scrollWidth };
    });
    const before = await geometry();
    await expect(page.locator(".topbar .player-hud")).toContainText("科学部");
    expect(before.player.y + before.player.height).toBeLessThanOrEqual(before.stage.y + 1);
    expect(before.scrollWidth).toBe(width);
    await page.clock.runFor(30_100);
    await expect(page.locator(".phase-banner")).toBeVisible();
    const during = await geometry();
    await page.clock.runFor(650);
    await expect(page.locator(".phase-banner")).toHaveCount(0);
    const after = await geometry();
    for (const current of [during, after]) {
      expect(current.header).toEqual(before.header);
      expect(current.stage).toEqual(before.stage);
      expect(current.controls).toEqual(before.controls);
      expect(current.scrollWidth).toBe(width);
    }
    await expect(page.locator(".intent-ticket")).toBeInViewport();
    await expect(page.locator(".typing-buffer")).toBeInViewport();
  });
}
