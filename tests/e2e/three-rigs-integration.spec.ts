import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const clubs = [
  ["literature-demo", "literature-v1"],
  ["music-demo", "music-v1"],
  ["art-demo", "art-v1"],
] as const;

for (const [club, rigId] of clubs) for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`${club} and three enemies keep fixed GameShell geometry at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(viewport);
    const base = createRunSession(42, club, demoContent);
    const start: MapNode = { id: `${club}-start`, act: 1, floor: 0, kind: "start", nextIds: [`${club}-fight`] };
    const fight: MapNode = { id: `${club}-fight`, act: 1, floor: 1, kind: "combat", nextIds: [] };
    const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const first = entered.run.combat!.enemies[0]!;
    const enemies = Array.from({ length: 3 }, (_, index) => ({ ...first, instanceId: `${club}-enemy-${index}` }));
    const saved = serializeRunSession({ ...entered, run: { ...entered.run, combat: { ...entered.run.combat!, enemies } } }, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    const stage = page.locator(".game-shell .stage");
    const actor = stage.locator(".ally-slot").first();
    await expect(actor).toHaveAttribute("data-rig-ready", "true");
    await expect(actor).toHaveAttribute("data-actor-rig", rigId);
    await expect(stage.locator(".enemy-slot")).toHaveCount(3);
    const bounds = await actor.boundingBox();
    const stageBounds = await stage.boundingBox();
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((node, prior) => node === prior, rigNode)).toBe(true);
    await page.locator(".enemy-roster-button").nth(1).click();
    expect(await actor.boundingBox()).toEqual(bounds);
    expect(await stage.boundingBox()).toEqual(stageBounds);
    expect(bounds!.x).toBeGreaterThanOrEqual(stageBounds!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(stageBounds!.x + stageBounds!.width);
  });
}
