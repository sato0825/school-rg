import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { stageSelectionForRun } from "../../src/ui/stage-presentation.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";

/** Enter a connected next node through the real map UI; both seeds cross a place boundary. */
test("actual map choices switch through the four-place itinerary on PC and iPad widths", async ({ context }) => {
  const observations: string[] = [];
  for (const [seed, fromFloor] of [[42, 3], [97, 9]] as const) {
    for (const act of [1, 2, 3] as const) {
      const base = createRunSession(seed, "literature-demo", demoContent);
      const current = base.run.map.nodes.find((node) => node.act === act && node.floor === fromFloor && node.id.endsWith("-n0"))!;
      const target = base.run.map.nodes.find((node) => node.id === current.nextIds[0])!;
      const run = { ...base.run, act, map: { ...base.run.map, currentNodeId: current.id } };
      const session = { ...base, run, completedNodeIds: [current.id] };
      const initial = stageSelectionForRun(demoBattleArt, run);
      const expected = stageSelectionForRun(demoBattleArt, { ...run, map: { ...run.map, currentNodeId: target.id } });
      expect(initial.placeId).not.toBe(expected.placeId);
      const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        const page = await context.newPage();
        await page.clock.install();
        await page.setViewportSize({ width, height });
        await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.goto("/");
        const stage = page.locator(".game-shell .stage");
        await expect(stage).toHaveAttribute("data-stage-place", initial.placeId!);
        await page.locator(`.map-node.available[data-id="${target.id}"]`).click();
        const battleStage = page.locator(".game-shell .stage");
        const screen = await battleStage.count() ? battleStage : page.locator(".run-screen");
        await expect(screen).toHaveAttribute("style", new RegExp(expected.artId!));
        if (await battleStage.count()) {
          await expect(battleStage).toHaveAttribute("data-stage-place", expected.placeId!);
          await expect(page.locator(".hero-art")).toBeInViewport();
          if (target.kind === "combat" || target.kind === "elite" || target.kind === "boss") {
            await expect(page.locator(".typing-buffer")).toBeInViewport();
            await expect(page.locator(".enemy-art").first()).toBeInViewport();
          }
        }
        await screen.evaluate(async (element) => {
          const url = getComputedStyle(element).backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1];
          if (!url) throw new Error("missing stage image");
          const image = new Image(); image.src = url; await image.decode();
          if (image.naturalWidth < 1500) throw new Error("candidate plate did not decode");
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        observations.push(`${seed}:${act}:${target.id}:${expected.placeId}:${width}`);
        if (seed === 42 && process.env.SCHOOL_RG_CAPTURE_STAGE_ITINERARY === "1") {
          await page.screenshot({ path: `docs/art/previews/issue288-act${act}-${width}.png`, fullPage: true });
        }
        await page.close();
      }
    }
  }
  expect(new Set(observations.map((item) => item.split(":")[3])).size).toBe(6);
});
