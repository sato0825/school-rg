import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi, demoRunContentTables } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { MOTION_MS } from "../../src/ui/motion-timing.js";

test.use({ video: "on" });
test.skip(process.env.SCHOOL_RG_CAPTURE_LOSS_VIDEO !== "1", "review-only continuous capture");

for (const { width, height, quiet } of [
  { width: 1440, height: 900, quiet: false },
  { width: 1024, height: 768, quiet: false },
  { width: 1024, height: 768, quiet: true },
]) {
  test(`HP0 transition ${width} ${quiet ? "quiet" : "standard"} keeps stage and actor coordinates`, async ({ page }) => {
    test.setTimeout(35_000);
    await page.setViewportSize({ width, height });
    await page.clock.install();
    const start = createRunSession(42, "literature-demo", demoContent, { floorsPerAct: 2, lanes: 4, kindWeights: { combat: 1, elite: 0, event: 1, shop: 1, rest: 2, treasure: 2 } });
    const node = availableRunNodes(start).find((item) => item.kind === "combat");
    expect(node).toBeDefined();
    const entered = enterRunNode(start, node!.id, demoContent, demoEnemyAi, demoRunContentTables);
    const prepared = { ...entered, run: { ...entered.run, player: { ...entered.run.player, hp: 1, block: 0 } } };
    const saved = serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript(({ value, lowStimulus }) => {
      localStorage.setItem("school-rg-run-v1", value);
      localStorage.setItem("school-rg-low-stimulus-v1", lowStimulus ? "1" : "0");
    }, { value: saved, lowStimulus: quiet });
    await page.goto("/");
    await expect(page.locator('.game-shell[data-screen="combat"]')).toBeVisible();
    const beforeStage = await page.locator(".stage").boundingBox();
    const beforeActor = await page.locator(".ally-slot").boundingBox();
    const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
    await page.clock.runFor(remaining + 100);
    await page.clock.runFor(MOTION_MS.enemyPhase);
    if (!quiet) {
      await expect(page.locator(".hero-art.react")).toBeVisible();
      await delay(150);
      await page.screenshot({ path: `docs/art/previews/issue268-transition-hit-${width}-v2.png`, fullPage: true });
      await page.clock.runFor(MOTION_MS.hit);
    }
    await expect(page.locator('.game-shell[data-screen="lost"]')).toBeVisible();
    const afterStage = await page.locator(".stage").boundingBox();
    const afterActor = await page.locator(".ally-slot").boundingBox();
    expect(beforeStage && afterStage && beforeActor && afterActor).toBeTruthy();
    for (const axis of ["x", "y", "width", "height"] as const) expect(Math.abs(beforeStage![axis] - afterStage![axis])).toBeLessThan(2);
    for (const axis of ["x", "y"] as const) expect(Math.abs(beforeActor![axis] - afterActor![axis])).toBeLessThan(2);
    if (quiet) {
      await expect(page.locator(".hero-art.loss-pose")).toHaveCSS("animation-name", "none");
      await expect(page.locator(".control-deck")).toHaveCSS("opacity", "0");
    }
    await delay(400);
    await page.screenshot({ path: `docs/art/previews/issue268-transition-result-${quiet ? "quiet-" : ""}${width}-v2.png`, fullPage: true });
    const video = page.video();
    await page.close();
    if (video) await video.saveAs(`docs/art/previews/issue268-transition-${quiet ? "quiet-" : ""}${width}-v2.webm`);
  });
}
