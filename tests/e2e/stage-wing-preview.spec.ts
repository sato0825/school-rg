import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const samples = [
  { name: "shop", seed: 97, fromId: "a3-f10-n1", targetId: "a3-f11-n1", kind: "shop", prop: "school-shop-candidate-v1" },
  { name: "rest", seed: 97, fromId: "a3-f11-n1", targetId: "a3-f12-n2", kind: "rest", prop: "rest-bench-candidate-v1" },
  { name: "event", seed: 42, fromId: "a3-f10-n0", targetId: "a3-f11-n0", kind: "event", prop: "event-board-candidate-v1" },
] as const;

test("#340 compares stage-wing geography with #304 props on same saved Act 3 nodes", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const sample of samples) {
    const base = createRunSession(sample.seed, "literature-demo", demoContent);
    const from = base.run.map.nodes.find((node) => node.id === sample.fromId)!;
    const target = base.run.map.nodes.find((node) => node.id === sample.targetId)!;
    expect(from.nextIds).toContain(target.id);
    expect(target.kind).toBe(sample.kind);
    const run = { ...base.run, act: 3 as const, player: { ...base.run.player, hp: 20 }, map: { ...base.run.map, currentNodeId: from.id } };
    const saved = serializeRunSession({ ...base, run, completedNodeIds: [from.id] }, demoContent, { nowMs: () => 0 }, () => "discard");
    for (const concept of ["base", "wing"] as const) {
      const artId = concept === "wing" ? "act3-paper-stage-wing-candidate-v2" : "act3-paper-auditorium-stage-candidate-v1";
      const placeId = concept === "wing" ? "auditorium-stage-wing" : "auditorium-stage";
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto("/");
        await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.goto(`/?experimentalStageState=on&experimentalStageWing=${concept === "wing" ? "on" : "off"}`);
        const stage = page.locator(".game-shell .stage");
        const element = await stage.elementHandle();
        await page.locator(`.map-node.available[data-id="${sample.targetId}"]`).click();
        await expect(page.locator(`.location-scene[data-location="${sample.kind}"]`)).toBeVisible();
        await expect(stage).toHaveAttribute("data-stage-art", artId);
        await expect(stage).toHaveAttribute("data-stage-place", placeId);
        expect(await stage.evaluate((node, old) => node === old, element)).toBe(true);
        const prop = page.locator(`.location-prop-art[data-asset-id="${sample.prop}"]`);
        await expect(prop).toBeVisible();
        await expect.poll(async () => prop.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.map.currentNodeId)).toBe(sample.targetId);
        await page.reload();
        await expect(stage).toHaveAttribute("data-stage-art", artId);
        await expect(stage).toHaveAttribute("data-stage-place", placeId);
        await expect.poll(async () => prop.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        await stage.evaluate(async (node) => {
          const url = (node as HTMLElement).style.backgroundImage.slice(5, -2);
          const image = new Image();
          image.src = url;
          await image.decode();
        });
        if (process.env.SCHOOL_RG_CAPTURE_STAGE_WING === "1") {
          await page.screenshot({ path: `docs/design/previews/issue340-act3-${sample.name}-${concept}-${width}.png`, fullPage: true, animations: "disabled" });
        }
        if (sample.kind === "shop") await page.locator('[data-action="buy-offer"]:not(:disabled)').first().click();
        if (sample.kind === "rest") await page.locator('[data-action="rest-heal"]').click();
        await expect(stage).toHaveAttribute("data-stage-art", artId);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await context.close();
      }
    }
  }
});
