import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const samples = [
  { name: "act3-shop", seed: 97, fromId: "a3-f10-n1", targetId: "a3-f11-n1", kind: "shop", place: "auditorium-stage", light: "late", bossApproach: "true" },
  { name: "act3-rest", seed: 97, fromId: "a3-f11-n1", targetId: "a3-f12-n2", kind: "rest", place: "auditorium-stage", light: "late", bossApproach: "true" },
  { name: "act1-shop", seed: 42, fromId: "a1-f11-n0", targetId: "a1-f12-n0", kind: "shop", place: "school-covered-courtyard", light: "late", bossApproach: "true" },
  { name: "act2-shop", seed: 42, fromId: "a2-f0-n0", targetId: "a2-f1-n0", kind: "shop", place: "science-entry", light: "early", bossApproach: "false" },
] as const;

test("#315 C keeps the same plate and applies place state only on arrival", async ({ browser }) => {
  for (const sample of samples) {
    const base = createRunSession(sample.seed, "literature-demo", demoContent);
    const from = base.run.map.nodes.find((node) => node.id === sample.fromId)!;
    const target = base.run.map.nodes.find((node) => node.id === sample.targetId)!;
    expect(from.nextIds).toContain(target.id);
    expect(target.kind).toBe(sample.kind);
    const run = { ...base.run, act: from.act, player: { ...base.run.player, hp: 20 }, map: { ...base.run.map, currentNodeId: from.id } };
    const saved = serializeRunSession({ ...base, run, completedNodeIds: [from.id] }, demoContent, { nowMs: () => 0 }, () => "discard");
    for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto("/");
      await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
      await page.goto("/?experimentalStageState=on");
      const stage = page.locator(".game-shell .stage");
      const initialArt = await stage.getAttribute("data-stage-art");
      const element = await stage.elementHandle();
      await page.locator(`.map-node.available[data-id="${sample.targetId}"]`).click();
      await expect(page.locator(`.location-scene[data-location="${sample.kind}"]`)).toBeVisible();
      await expect(stage).toHaveAttribute("data-stage-art", initialArt!);
      await expect(stage).toHaveAttribute("data-stage-place", sample.place);
      await expect(stage).toHaveAttribute("data-stage-light", sample.light);
      await expect(stage).toHaveAttribute("data-stage-activity", sample.kind === "shop" ? "service" : "rest");
      await expect(stage).toHaveAttribute("data-stage-boss-approach", sample.bossApproach);
      expect(await stage.evaluate((node, old) => node === old, element)).toBe(true);
      await expect(stage.locator(".stage-state-layer")).toHaveCSS("display", "block");
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.map.currentNodeId)).toBe(sample.targetId);
      await page.reload();
      await expect(stage).toHaveAttribute("data-stage-place", sample.place);
      await expect(stage).toHaveAttribute("data-stage-light", sample.light);
      if (process.env.SCHOOL_RG_CAPTURE_STAGE_STATE === "1") {
        await page.screenshot({ path: `docs/design/previews/issue315-${sample.name}-state-${width}.png`, fullPage: true });
      }
      if (sample.kind === "shop") await page.locator('[data-action="buy-offer"]:not(:disabled)').first().click();
      else await page.locator('[data-action="rest-heal"]').click();
      await expect(stage).toHaveAttribute("data-stage-place", sample.place);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await context.close();
    }
  }
});
