import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const plates = ["stage-hallway-v1", "act2-science-wing-candidate-v1", "act3-auditorium-foyer-candidate-v1"];

test("each Act uses its own school plate on map and in typed combat at desktop and narrow widths", async ({ context }) => {
  for (const act of [1, 2, 3] as const) {
    for (const width of [1280, 390]) {
      const base = createRunSession(42, "literature-demo", demoContent);
      const from: MapNode = { id: "stage-start", act, floor: 0, kind: "start", nextIds: ["stage-fight"] };
      const fight: MapNode = { id: "stage-fight", act, floor: 1, kind: "combat", nextIds: [] };
      const session = { ...base, run: { ...base.run, act, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
      const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
      const page = await context.newPage();
      await page.clock.install();
      await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await expect(page.locator(".run-screen")).toHaveAttribute("style", new RegExp(plates[act - 1]!));
      await page.locator(".map-node.available").click();
      const stage = page.locator(".stage");
      await expect(stage).toHaveAttribute("data-act", String(act));
      await expect(stage).toHaveAttribute("style", new RegExp(plates[act - 1]!));
      await stage.evaluate(async (element) => {
        const url = getComputedStyle(element).backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1];
        if (!url) throw new Error("missing stage plate URL");
        const image = new Image(); image.src = url; await image.decode();
        if (image.naturalWidth < 1_500) throw new Error("stage plate did not decode at full size");
      });
      for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]"]) {
        await expect(page.locator(selector).first()).toBeInViewport();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (process.env.SCHOOL_RG_CAPTURE_STAGE_ART === "1") {
        await page.screenshot({ path: `docs/art/previews/issue138-act${act}-${width}-20261031.png`, fullPage: true });
      }
      await page.close();
    }
  }
});
