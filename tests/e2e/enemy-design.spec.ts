import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const examples = [
  [1, "combat", "paper-heap"], [1, "combat", "paper-scrap"], [1, "combat", "hall-monitor"],
  [1, "combat", "chalk-cloud"], [1, "combat", "library-cart"], [1, "elite", "notice-board"], [1, "boss", "final-exam"],
  [2, "combat", "late-pass"], [2, "combat", "safety-sign"], [2, "combat", "stairwell-echo"],
  [2, "combat", "lab-magnet"], [2, "combat", "lost-homework"], [2, "combat", "library-index"],
  [2, "elite", "club-auditor"], [2, "elite", "school-gate"], [2, "boss", "closing-bell"],
  [2, "boss", "gym-scoreboard"], [2, "boss", "lab-ventilation"],
  [3, "combat", "window-shadow"], [3, "combat", "night-announcement"], [3, "combat", "lost-and-found"],
  [3, "combat", "empty-desk"], [3, "combat", "last-bus"], [3, "elite", "night-locker"], [3, "boss", "graduation-curtain"],
] as const;

test("all 25 enemy candidates decode and keep battle controls readable across three Acts", async ({ context }) => {
  for (const [act, kind, enemyId] of examples) {
    const base = createRunSession(42, "literature-demo", demoContent);
    const from: MapNode = { id: "art-start", act, floor: 0, kind: "start", nextIds: ["art-fight"] };
    const fight: MapNode = { id: "art-fight", act, floor: 1, kind, nextIds: [] };
    const mapped = { ...base, run: { ...base.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
    const pool: EncounterPool = { combat: [enemyId], elite: [enemyId], boss: [enemyId] };
    const entered = enterRunNode(mapped, fight.id, demoContent, demoEnemyAi, pool);
    const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
    const scene = await context.newPage();
    await scene.clock.install();
    await scene.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    const width = ["paper-heap", "lab-ventilation", "last-bus"].includes(enemyId) || act === 2 ? 1280 : 390;
    await scene.setViewportSize({ width, height: 844 });
    await scene.goto("/");
    const enemy = scene.locator(".enemy-art");
    await expect(enemy).toHaveAttribute("src", new RegExp(`${enemyId}-candidate-v1`));
    await enemy.evaluate(async (image) => (image as HTMLImageElement).decode());
    expect(await enemy.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(1_000);
    await expect(scene.locator(".intent-ticket")).toBeInViewport();
    await expect(scene.locator(".enemy-hud")).toBeInViewport();
    await expect(scene.locator(".typing-buffer")).toBeInViewport();
    expect(await scene.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (process.env.SCHOOL_RG_CAPTURE_ENEMY_ART === "1" && ["paper-heap", "night-announcement", "lab-ventilation", "last-bus"].includes(enemyId)) {
      await scene.screenshot({ path: `docs/art/previews/issue140-${enemyId}-${width}-20261031.png`, fullPage: true });
    }
    await scene.close();
  }
});
