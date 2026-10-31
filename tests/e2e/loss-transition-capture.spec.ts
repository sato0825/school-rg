import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
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
    await page.goto("/?shortRun=1&seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /文芸部/ }).click();
    await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
    await page.addInitScript((lowStimulus) => {
      const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
      saved.session.run.player.hp = 1;
      saved.session.run.player.block = 0;
      localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
      localStorage.setItem("school-rg-low-stimulus-v1", lowStimulus ? "1" : "0");
    }, quiet);
    await page.reload();
    await page.getByRole("button", { name: "再開" }).click();
    const beforeStage = await page.locator(".stage").boundingBox();
    const beforeActor = await page.locator(".ally-slot").boundingBox();
    const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
    await page.clock.runFor(remaining + 100);
    await page.clock.runFor(MOTION_MS.enemyPhase);
    if (!quiet) {
      await expect(page.locator(".hero-art.react")).toBeVisible();
      await delay(150);
      await page.screenshot({ path: `docs/art/previews/issue268-transition-hit-${width}-v1.png`, fullPage: true });
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
    await page.screenshot({ path: `docs/art/previews/issue268-transition-result-${quiet ? "quiet-" : ""}${width}-v1.png`, fullPage: true });
    const video = page.video();
    await page.close();
    if (video) await video.saveAs(`docs/art/previews/issue268-transition-${quiet ? "quiet-" : ""}${width}-v1.webm`);
  });
}
