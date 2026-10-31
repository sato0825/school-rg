import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { subscenePreviewForRun } from "../../src/ui/stage-subscene-experiment.js";

const samples = [
  { name: "act3-shop", seed: 97, act: 3, fromId: "a3-f10-n1", targetId: "a3-f11-n1", kind: "shop", localArt: "act3-paper-auditorium-stage-candidate-v1", annexArt: "act3-paper-backstage-candidate-v1" },
  { name: "act3-rest", seed: 97, act: 3, fromId: "a3-f11-n1", targetId: "a3-f12-n2", kind: "rest", localArt: "act3-paper-auditorium-stage-candidate-v1", annexArt: "act3-paper-backstage-candidate-v1" },
  { name: "act1-shop", seed: 42, act: 1, fromId: "a1-f11-n0", targetId: "a1-f12-n0", kind: "shop", localArt: "act1-paper-covered-courtyard-candidate-v1", annexArt: "act1-paper-atrium-candidate-v1" },
  { name: "act2-shop", seed: 42, act: 2, fromId: "a2-f0-n0", targetId: "a2-f1-n0", kind: "shop", localArt: "act2-paper-science-entry-candidate-v2", annexArt: "act2-science-wing-candidate-v1" },
] as const;

test("#315 compares local objects and connected subscene proxies at the same node", async ({ browser }) => {
  for (const sample of samples) {
    const base = createRunSession(sample.seed, "literature-demo", demoContent);
    const from = base.run.map.nodes.find((node) => node.id === sample.fromId)!;
    const target = base.run.map.nodes.find((node) => node.id === sample.targetId)!;
    expect(from.nextIds).toContain(target.id);
    expect(target.kind).toBe(sample.kind);
    const run = { ...base.run, act: sample.act as 1 | 2 | 3, player: { ...base.run.player, hp: 20 }, map: { ...base.run.map, currentNodeId: from.id } };
    const saved = serializeRunSession({ ...base, run, completedNodeIds: [from.id] }, demoContent, { nowMs: () => 0 }, () => "discard");
    for (const concept of ["local", "annex"] as const) {
      const before = subscenePreviewForRun(demoBattleArt, run, concept);
      const arrived = subscenePreviewForRun(demoBattleArt, { ...run, map: { ...run.map, currentNodeId: target.id } }, concept);
      expect(arrived.artId).toBe(concept === "annex" ? sample.annexArt : sample.localArt);
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto("/");
        await page.evaluate((value) => localStorage.setItem("school-rg-run-v1", value), saved);
        await page.goto(`/?experimentalSubscene=${concept}`);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.map.currentNodeId)).toBe(sample.fromId);
        const stage = page.locator(".game-shell .stage");
        await expect(stage).toHaveAttribute("data-stage-art", before.artId!);
        const firstImage = await stage.evaluate((element) => (element as HTMLElement).style.backgroundImage);
        const stageElement = await stage.elementHandle();
        await page.locator(`.map-node.available[data-id="${sample.targetId}"]`).click();
        await expect(page.locator(`.location-scene[data-location="${sample.kind}"]`)).toBeVisible();
        expect(await stage.evaluate((element, initial) => element === initial, stageElement)).toBe(true);
        await expect(stage).toHaveAttribute("data-stage-concept", concept);
        await expect(stage).toHaveAttribute("data-stage-art", arrived.artId!);
        await expect(stage).toHaveAttribute("data-stage-proxy", String(arrived.proxy));
        const arrivedImage = await stage.evaluate((element) => (element as HTMLElement).style.backgroundImage);
        if (before.artId !== arrived.artId) expect(arrivedImage).not.toBe(firstImage);
        else expect(arrivedImage).toBe(firstImage);
        const arrivedSave = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
        expect(arrivedSave.session.run.map.currentNodeId).toBe(sample.targetId);
        await page.reload();
        await expect(stage).toHaveAttribute("data-stage-art", arrived.artId!);
        expect(await stage.evaluate((element) => (element as HTMLElement).style.backgroundImage)).toBe(arrivedImage);
        if (process.env.SCHOOL_RG_CAPTURE_SUBSCENE === "1") {
          await page.screenshot({ path: `docs/design/previews/issue315-${sample.name}-${concept}-${width}.png`, fullPage: true });
        }
        if (sample.kind === "shop") await page.locator('[data-action="buy-offer"]:not(:disabled)').first().click();
        else await page.locator('[data-action="rest-heal"]').click();
        expect(await stage.evaluate((element) => (element as HTMLElement).style.backgroundImage)).toBe(arrivedImage);
        const afterAction = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
        expect(afterAction.session.run.map.currentNodeId).toBe(sample.targetId);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await context.close();
      }
    }
  }
});
