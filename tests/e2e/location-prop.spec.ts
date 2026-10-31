import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const places = {
  treasure: "archive-locker-candidate-v1",
  shop: "school-shop-candidate-v1",
  rest: "rest-bench-candidate-v1",
  event: "event-board-candidate-v1",
} as const;

for (const width of [1440, 1024]) for (const [place, artId] of Object.entries(places) as [keyof typeof places, string][]) {
  test(`${place} candidate prop is drawn within the active stage at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    const base = createRunSession(42, "literature-demo", demoContent);
    const start: MapNode = { id: "prop-start", act: 1, floor: 0, kind: "start", nextIds: ["prop-place"] };
    const destination: MapNode = { id: "prop-place", act: 1, floor: 1, kind: place, nextIds: ["prop-boss"] };
    const boss: MapNode = { id: "prop-boss", act: 1, floor: 2, kind: "boss", nextIds: [] };
    const session = { ...base, run: { ...base.run, map: { nodes: [start, destination, boss], currentNodeId: start.id } }, completedNodeIds: [start.id] };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((json) => localStorage.setItem("school-rg-run-v1", json), saved);
    await page.goto("/");
    await page.locator('.map-node.available[data-id="prop-place"]').click();
    await expect(page.locator(`.location-scene[data-location="${place}"]`)).toBeVisible();
    const art = page.locator(`.location-prop-art[data-asset-id="${artId}"]`);
    await expect(art).toBeVisible();
    expect(await art.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.locator(".hero-art")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    if (place === "shop") {
      await expect(page.locator(".location-shelf .location-choice")).toHaveCount(5);
      for (const offer of await page.locator(".location-shelf .location-choice").all()) await expect(offer).toBeInViewport();
      await expect(page.locator(".location-drawer summary")).toBeInViewport();
    }
    const capture = process.env.SCHOOL_RG_PROP_CAPTURE_DIR;
    if (capture) await page.screenshot({ path: `${capture}/${place}-${width}.png`, fullPage: true });
    if (place === "treasure" && width === 1024) {
      await page.locator('[data-action="treasure-offer"]:not(:disabled)').first().click();
      await expect(page.locator('.location-scene[data-claiming="true"]')).toBeVisible();
      if (capture) await page.screenshot({ path: `${capture}/treasure-claim-${width}.png`, fullPage: true });
      await expect(page.locator(".map-panel")).toBeVisible();
      await page.locator('.map-node.available[data-id="prop-boss"]').click();
      await expect(page.locator(".enemy-slot")).toBeVisible();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.screen)).toBe("combat");
    }
  });
}
