import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const tallEnemies = [
  { act: 2, id: "beaker-mist" },
  { act: 3, id: "stage-spotlight" },
] as const;

for (const width of [1024, 1440]) {
  for (const { act, id } of tallEnemies) {
    for (const count of [1, 2, 3, 5]) {
      test(`${count} ${id} targets leave Intent and art readable at ${width}px`, async ({ page }) => {
        await page.clock.install();
        await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
        const base = createRunSession(42, "literature-demo", demoContent);
        const start: MapNode = { id: "intent-start", act, floor: 0, kind: "start", nextIds: ["intent-fight"] };
        const fight: MapNode = { id: "intent-fight", act, floor: 1, kind: "combat", nextIds: [] };
        const entered = enterRunNode({ ...base, run: { ...base.run, act, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] },
          fight.id, demoContent, demoEnemyAi, { combat: [id], elite: [id], boss: [id] });
        const combat = entered.run.combat!;
        const first = combat.enemies[0]!;
        const enemies = Array.from({ length: count }, (_, index) => ({ ...first, instanceId: `intent-enemy-${index + 1}` }));
        const saved = serializeRunSession({ ...entered, run: { ...entered.run, combat: { ...combat, enemies } } },
          demoContent, { nowMs: () => 0 }, () => "discard");
        await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.goto("/");
        await page.locator(".enemy-art").first().evaluate(async (image) => (image as HTMLImageElement).decode());
        const stage = await page.locator(".stage").boundingBox();
        expect(stage).not.toBeNull();
        if (count <= 2) {
          const slots = page.locator(".enemy-slot");
          for (let index = 0; index < count; index += 1) {
            const ticket = await slots.nth(index).locator(".intent-ticket").boundingBox();
            const art = await slots.nth(index).locator(".enemy-art").boundingBox();
            const hp = await slots.nth(index).locator(".enemy-hud").boundingBox();
            expect(ticket && art && hp).toBeTruthy();
            expect(ticket!.y).toBeGreaterThanOrEqual(stage!.y - 1);
            expect(ticket!.y + ticket!.height).toBeLessThanOrEqual(art!.y + 1);
            expect(art!.y + art!.height).toBeLessThanOrEqual(hp!.y + hp!.height + 1);
          }
        } else {
          const roster = page.locator(".enemy-roster-button");
          await expect(roster).toHaveCount(count);
          await expect(page.locator(".enemy-slot .intent-ticket:visible")).toHaveCount(0);
          for (let index = 0; index < count; index += 1) {
            await expect(roster.nth(index).locator(".enemy-roster-bar")).toBeVisible();
          }
        }
        await expect(page.locator(".typing-input")).toBeFocused();
        if (process.env.SCHOOL_RG_CAPTURE_INTENT === "1" && (count === 1 || count === 5)) {
          await page.screenshot({ path: `docs/art/previews/issue218-${id}-${count}-${width}.png`, fullPage: true });
        }
      });
    }
  }
}
