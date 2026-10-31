import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const latePlates = ["act1-library-entrance-candidate-v1", "act2-biology-room-candidate-v1", "act3-backstage-candidate-v1"];

test("later floors show distinct school places in combat on PC and iPad sized screens", async ({ context }) => {
  for (const act of [1, 2, 3] as const) {
    const base = createRunSession(42, "literature-demo", demoContent);
    const current = base.run.map.nodes.find((node) => node.act === act && node.floor >= 7 && node.floor < 12 && node.nextIds.some((id) => {
      const next = base.run.map.nodes.find((candidate) => candidate.id === id);
      return next?.kind === "combat" || next?.kind === "elite";
    }))!;
    const target = base.run.map.nodes.find((node) => current.nextIds.includes(node.id) && (node.kind === "combat" || node.kind === "elite"))!;
    const session = { ...base, run: { ...base.run, act, map: { ...base.run.map, currentNodeId: current.id } }, completedNodeIds: [current.id] };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
      const page = await context.newPage();
      await page.clock.install();
      await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.locator(".game-shell .stage")).toHaveAttribute("style", new RegExp(latePlates[act - 1]!));
      if (process.env.SCHOOL_RG_CAPTURE_STAGE_VARIETY === "1" && width === 1024) {
        await page.screenshot({ path: `docs/art/previews/issue179-act${act}-map-1024.png`, fullPage: true });
      }
      await page.locator(`.map-node.available[data-id="${target.id}"]`).click();
      const stage = page.locator(".stage");
      await expect(stage).toHaveAttribute("data-act", String(act));
      await expect(stage).toHaveAttribute("data-stage-phase", "late");
      await expect(stage).toHaveAttribute("style", new RegExp(latePlates[act - 1]!));
      await stage.evaluate(async (element) => {
        const url = getComputedStyle(element).backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1];
        if (!url) throw new Error("missing stage URL");
        const image = new Image(); image.src = url; await image.decode();
        if (image.naturalWidth < 1_500) throw new Error("stage candidate did not decode at source width");
      });
      for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]"]) {
        await expect(page.locator(selector).first()).toBeInViewport();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (process.env.SCHOOL_RG_CAPTURE_STAGE_VARIETY === "1") {
        await page.screenshot({ path: `docs/art/previews/issue179-act${act}-${width}.png`, fullPage: true });
      }
      await page.close();
    }
  }
});
