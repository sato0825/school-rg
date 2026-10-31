import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const samples = [
  { seed: 42, fromId: "a2-f10-n0", targetId: "a2-f11-n0", kind: "combat" },
  { seed: 42, fromId: "a2-f11-n0", targetId: "a2-f12-n0", kind: "treasure" },
  { seed: 97, fromId: "a2-f10-n0", targetId: "a2-f11-n0", kind: "treasure" },
  { seed: 97, fromId: "a2-f11-n0", targetId: "a2-f12-n0", kind: "combat" },
] as const;

test("#357 compares Act 2 stair candidate with terrace at saved combat and treasure arrivals", async ({ browser }) => {
  test.setTimeout(180_000);
  for (const sample of samples) {
    const base = createRunSession(sample.seed, "literature-demo", demoContent);
    const from = base.run.map.nodes.find((node) => node.id === sample.fromId)!;
    const target = base.run.map.nodes.find((node) => node.id === sample.targetId)!;
    expect(from.nextIds).toContain(target.id);
    expect(target.kind).toBe(sample.kind);
    const run = { ...base.run, act: 2 as const, player: { ...base.run.player, hp: 20 }, map: { ...base.run.map, currentNodeId: from.id } };
    const saved = serializeRunSession({ ...base, run, completedNodeIds: [from.id] }, demoContent, { nowMs: () => 0 }, () => "discard");
    for (const concept of ["base", "stairs"] as const) {
      const artId = concept === "stairs" ? "act2-paper-terrace-stair-candidate-v1" : "act2-paper-observation-terrace-candidate-v1";
      const placeId = concept === "stairs" ? "science-terrace-stair-landing" : "science-observation-terrace";
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto("/");
        await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.goto(`/?experimentalStageState=on&experimentalTerraceStair=${concept === "stairs" ? "on" : "off"}`);
        const stage = page.locator(".game-shell .stage");
        const element = await stage.elementHandle();
        await page.locator(`.map-node.available[data-id="${sample.targetId}"]`).click();
        await expect(stage).toHaveAttribute("data-stage-art", artId);
        await expect(stage).toHaveAttribute("data-stage-place", placeId);
        expect(await stage.evaluate((node, old) => node === old, element)).toBe(true);
        if (sample.kind === "treasure") {
          await expect(page.locator('.location-scene[data-location="treasure"]')).toBeVisible();
          const prop = page.locator('.location-prop-art[data-asset-id="archive-locker-candidate-v1"]');
          await expect(prop).toBeVisible();
          await expect.poll(async () => prop.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        } else {
          await expect(page.locator(".game-shell")).toHaveAttribute("data-screen", "combat");
          await expect(stage.locator(".enemy-slot")).toHaveCount(1);
        }
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.map.currentNodeId)).toBe(sample.targetId);
        await page.reload();
        await expect(stage).toHaveAttribute("data-stage-art", artId);
        await expect(stage).toHaveAttribute("data-stage-place", placeId);
        if (sample.kind === "treasure") {
          const prop = page.locator('.location-prop-art[data-asset-id="archive-locker-candidate-v1"]');
          await expect(prop).toBeVisible();
          await expect.poll(async () => prop.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
          await prop.evaluate((image: HTMLImageElement) => image.decode());
        }
        await stage.evaluate(async (node) => {
          const url = (node as HTMLElement).style.backgroundImage.slice(5, -2);
          const image = new Image();
          image.src = url;
          await image.decode();
        });
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        if (process.env.SCHOOL_RG_CAPTURE_TERRACE_STAIR === "1") {
          await page.screenshot({ path: `docs/design/previews/issue357-seed${sample.seed}-act2-${target.floor}f-${sample.kind}-${concept}-${width}.png`, fullPage: true, animations: "disabled" });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await context.close();
      }
    }
  }
});
