import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const samples = [
  { name: "shop", seed: 42, fromId: "a1-f11-n0", targetId: "a1-f12-n0", kind: "shop", prop: "school-shop-candidate-v1" },
  { name: "event", seed: 97, fromId: "a1-f10-n0", targetId: "a1-f11-n0", kind: "event", prop: "event-board-candidate-v1" },
  { name: "elite", seed: 97, fromId: "a1-f11-n0", targetId: "a1-f12-n0", kind: "elite", prop: null },
] as const;

for (const sample of samples) test(`#356 ${sample.name} compares the courtyard and service arcade on saved route`, async ({ browser }) => {
  test.setTimeout(90_000);
  const base = createRunSession(sample.seed, "literature-demo", demoContent);
  const from = base.run.map.nodes.find((node) => node.id === sample.fromId)!;
  const target = base.run.map.nodes.find((node) => node.id === sample.targetId)!;
  expect(from.nextIds).toContain(target.id);
  expect(target.kind).toBe(sample.kind);
  const run = { ...base.run, player: { ...base.run.player, hp: 20 }, map: { ...base.run.map, currentNodeId: from.id } };
  const saved = serializeRunSession({ ...base, run, completedNodeIds: [from.id] }, demoContent, { nowMs: () => 0 }, () => "discard");
  for (const concept of ["base", "service"] as const) for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto(`/?experimentalStageState=on&experimentalCourtyardService=${concept === "service" ? "on" : "off"}`);
    const stage = page.locator(".game-shell .stage");
    const initialElement = await stage.elementHandle();
    await page.locator(`.map-node.available[data-id="${sample.targetId}"]`).click();
    const artId = concept === "service" ? "act1-paper-courtyard-service-candidate-v1" : "act1-paper-covered-courtyard-candidate-v1";
    const placeId = concept === "service" ? "school-courtyard-service" : "school-covered-courtyard";
    await expect(stage).toHaveAttribute("data-stage-art", artId);
    await expect(stage).toHaveAttribute("data-stage-place", placeId);
    expect(await stage.evaluate((node, old) => node === old, initialElement)).toBe(true);
    if (sample.prop) {
      const prop = page.locator(`.location-prop-art[data-asset-id="${sample.prop}"]`);
      await expect(prop).toBeVisible();
      await prop.evaluate((image: HTMLImageElement) => image.decode());
    } else await expect(page.locator(".enemy-slot").first()).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.map.currentNodeId)).toBe(sample.targetId);
    await page.reload();
    await expect(stage).toHaveAttribute("data-stage-art", artId);
    await expect(stage).toHaveAttribute("data-stage-place", placeId);
    await stage.evaluate(async (node) => {
      const url = (node as HTMLElement).style.backgroundImage.slice(5, -2);
      const image = new Image(); image.src = url; await image.decode();
    });
    if (process.env.SCHOOL_RG_CAPTURE_COURTYARD_SERVICE === "1") {
      await page.screenshot({ path: `docs/design/previews/issue356-act1-${sample.name}-${concept}-${width}.png`, fullPage: true, animations: "disabled" });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await context.close();
  }
});
