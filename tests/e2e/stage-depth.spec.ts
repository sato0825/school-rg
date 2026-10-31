import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { stageCandidateUrlByActPhase, stagePhaseForNode, type StagePhase } from "../../src/ui/stage-presentation.js";

const candidatePhases: Readonly<Record<number, readonly StagePhase[]>> = {
  1: ["middle", "final"], 2: ["middle", "final"], 3: ["middle", "final"],
};

test("six new school places appear on the same seeded route at desktop and iPad widths", async ({ context }) => {
  for (const act of [1, 2, 3] as const) {
    const base = createRunSession(42, "literature-demo", demoContent);
    for (const phase of candidatePhases[act]!) {
      const current = base.run.map.nodes.find((node) => node.act === act && node.nextIds.some((id) => {
        const next = base.run.map.nodes.find((candidate) => candidate.id === id);
        return next && ["combat", "elite"].includes(next.kind) && stagePhaseForNode(next, base.run.map.nodes) === phase;
      }))!;
      expect(current, `Act ${act} ${phase} needs a reachable fight`).toBeDefined();
      const target = base.run.map.nodes.find((node) => current.nextIds.includes(node.id) && ["combat", "elite"].includes(node.kind) && stagePhaseForNode(node, base.run.map.nodes) === phase)!;
      const session = { ...base, run: { ...base.run, act, map: { ...base.run.map, currentNodeId: current.id } }, completedNodeIds: [current.id] };
      const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
      const filename = stageCandidateUrlByActPhase[act]![phase].split("/").pop()!.split("?")[0]!;
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        const page = await context.newPage();
        await page.clock.install();
        await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.setViewportSize({ width, height });
        await page.goto("/");
        await expect(page.locator(".run-screen")).toHaveAttribute("style", new RegExp(filename));
        await page.locator(`.map-node.available[data-id="${target.id}"]`).click();
        const stage = page.locator(".stage");
        await expect(stage).toHaveAttribute("data-stage-phase", phase);
        await expect(stage).toHaveAttribute("style", new RegExp(filename));
        await stage.evaluate(async (element) => {
          const url = getComputedStyle(element).backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1];
          if (!url) throw new Error("missing background URL");
          const image = new Image(); image.src = url; await image.decode();
          if (image.naturalWidth < 1500) throw new Error("stage image did not decode at source width");
        });
        for (const selector of [".hero-art", ".enemy-art", ".intent-ticket", ".typing-buffer", "[data-role=time]"]) {
          await expect(page.locator(selector).first()).toBeInViewport();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        if (process.env.SCHOOL_RG_CAPTURE_STAGE_DEPTH === "1") {
          await page.screenshot({ path: `docs/art/previews/issue237-act${act}-${phase}-${width}.png`, fullPage: true });
        }
        await page.close();
      }
    }
  }
});
