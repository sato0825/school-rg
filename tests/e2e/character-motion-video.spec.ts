import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

test.use({ video: "on" });
test.skip(!process.env.SCHOOL_RG_CAPTURE_CHARACTER_VIDEO, "Visual review capture only");

for (const scenario of [
  { width: 1440, height: 900, quiet: false },
  { width: 1024, height: 768, quiet: false },
  { width: 1024, height: 768, quiet: true },
]) {
  test(`record continuous actor motion ${scenario.width}px ${scenario.quiet ? "quiet" : "standard"}`, async ({ page }) => {
    test.setTimeout(35_000);
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "motion-start", act: 1, floor: 0, kind: "start", nextIds: ["motion-fight"] };
    const fight: MapNode = { id: "motion-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    await expect(page.locator(".hero-art")).toBeVisible();
    if (scenario.quiet) await page.locator('[data-action="toggle-stimulus"]').click();
    await page.waitForTimeout(500);
    await page.keyboard.type("strike", { delay: 40 });
    await expect(page.locator(".hero-art.act.attack")).toBeVisible();
    await page.waitForTimeout(550);
    const support = await page.locator('.card[data-card-kind="skill"] .card-word').first().innerText();
    await page.keyboard.type(support, { delay: 40 });
    await expect(page.locator(".hero-art.act.support")).toBeVisible();
    await page.waitForTimeout(550);
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.waitForTimeout(remainingMs + 710);
    await expect(page.locator(".hero-art.react")).toBeVisible();
    await expect(page.locator(".result-fx-mark[data-kind='damage']")).toBeVisible();
    await page.waitForTimeout(400);
    const video = page.video();
    await page.close();
    await video?.saveAs(`docs/art/previews/issue234-motion-${scenario.quiet ? "quiet" : "standard"}-${scenario.width}.webm`);
  });
}
