import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const examples = [
  [1, "combat", "chalk-cloud"], [1, "combat", "library-cart"], [1, "elite", "notice-board"], [1, "boss", "final-exam"],
  [2, "combat", "lab-magnet"], [2, "elite", "club-auditor"], [2, "boss", "closing-bell"],
  [3, "combat", "window-shadow"], [3, "elite", "night-locker"], [3, "boss", "graduation-curtain"],
] as const;

test("ten enemy candidates decode and keep battle controls readable across three Acts", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  for (const [act, kind, enemyId] of examples) {
    const base = createRunSession(42, "literature-demo", demoContent);
    const from: MapNode = { id: "art-start", act, floor: 0, kind: "start", nextIds: ["art-fight"] };
    const fight: MapNode = { id: "art-fight", act, floor: 1, kind, nextIds: [] };
    const mapped = { ...base, run: { ...base.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
    const pool: EncounterPool = { combat: [enemyId], elite: [enemyId], boss: [enemyId] };
    const entered = enterRunNode(mapped, fight.id, demoContent, demoEnemyAi, pool);
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    const width = act === 2 ? 1280 : 390;
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    const enemy = page.locator(".enemy-art");
    await expect(enemy).toHaveAttribute("src", new RegExp(`${enemyId}-candidate-v1`));
    await enemy.evaluate(async (image) => (image as HTMLImageElement).decode());
    expect(await enemy.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(1_000);
    await expect(page.locator(".intent-ticket")).toBeInViewport();
    await expect(page.locator(".enemy-hud")).toBeInViewport();
    await expect(page.locator(".typing-buffer")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (process.env.SCHOOL_RG_CAPTURE_ENEMY_ART === "1" && ["final-exam", "club-auditor", "night-locker"].includes(enemyId)) {
      await page.screenshot({ path: `docs/art/previews/issue136-${enemyId}-${width}-20261031.png`, fullPage: true });
    }
  }
});
