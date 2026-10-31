import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const { width, height } of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
  test(`card piles and both sides' statuses stay readable at ${width}×${height}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "objects-start", act: 1, floor: 0, kind: "start", nextIds: ["objects-fight"] };
    const fight: MapNode = { id: "objects-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const combat = session.run.combat!;
    const first = combat.enemies[0]!;
    combat.enemies = Array.from({ length: 3 }, (_, index) => ({ ...first, instanceId: `objects-enemy-${index + 1}` }));
    combat.statuses.player = { strength: 2, poison: 1 };
    combat.statuses.enemies["objects-enemy-3"] = { weak: 2 };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");

    await expect(page.locator(".pile-token")).toHaveCount(3);
    await expect(page.locator('.pile-token[data-pile="draw"]')).toHaveAttribute("aria-label", /山札 \d+枚/);
    await expect(page.locator('.pile-token[data-pile="discard"]')).toHaveAttribute("aria-label", /捨て札 \d+枚/);
    await expect(page.locator('.pile-token[data-pile="exhaust"]')).toHaveAttribute("aria-label", /除外 \d+枚/);
    await expect(page.locator('.topbar .status-chip[data-status="strength"]')).toHaveAttribute("aria-label", "力 2");
    await expect(page.locator('.enemy-roster-button[data-id="objects-enemy-3"]')).toHaveAttribute("aria-label", /弱体 2/);
    await expect(page.locator(".hero-nameplate")).toContainText("科学部");
    await expect(page.locator(".hand .card").first()).toBeInViewport();
    await expect(page.locator(".pile-token").first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (process.env.SCHOOL_RG_CAPTURE_OBJECTS === "1") {
      await page.locator('.enemy-roster-button[data-id="objects-enemy-3"]').focus();
      await page.screenshot({ path: `docs/art/previews/issue187-battle-objects-${width}x${height}.png` });
    }
  });
}
