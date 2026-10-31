import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const width of [1024, 1440] as const) {
  for (const enemyCount of [1, 5] as const) {
    test(`typed Block forms at the actor without moving the stage at ${width}px/${enemyCount} enemies`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
      const base = createRunSession(42, "literature-demo", demoContent);
      const start: MapNode = { id: "block-start", act: 1, floor: 0, kind: "start", nextIds: ["block-fight"] };
      const fight: MapNode = { id: "block-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
      const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
        demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
      const combat = entered.run.combat!;
      const prepared = { ...entered, run: { ...entered.run, combat: { ...combat,
        enemies: Array.from({ length: enemyCount }, (_, index) => ({ ...combat.enemies[0]!, instanceId: `block-enemy-${index + 1}` })),
      } } };
      await page.addInitScript((value) => { if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", value); }, serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
      await page.goto("/");
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
      await expect(page.locator('.hand>.card[aria-label*="leaf"]')).toHaveCount(1);
      const geometry = () => page.evaluate(() => {
        const rect = (selector: string) => {
          const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
          return { x, y, width, height };
        };
        return { header: rect(".topbar"), stage: rect(".stage"), actor: rect(".ally-slot"), controls: rect(".control-deck") };
      });
      const before = await geometry();
      const blockBefore = Number((await page.locator(".player-hud b").innerText()).match(/\d+/)?.[0]);
      const baseline = process.env.ISSUE368_BASELINE === "1";
      const capture = process.env.ISSUE368_CAPTURE === "1";
      const captureVersion = process.env.ISSUE368_CAPTURE_VERSION ?? "v3";
      if (capture) await page.screenshot({ path: `docs/art/previews/issue368/${baseline ? "before" : "after"}-idle-${width}-${enemyCount}-${captureVersion}.png` });
      await page.locator(".typing-input").focus();
      await page.keyboard.type("leaf");
      await expect(page.locator('.result-fx-mark[data-kind="block"]')).toBeVisible();
      const blockAfter = Number((await page.locator(".player-hud b").innerText()).match(/\d+/)?.[0]);
      expect(blockAfter).toBeGreaterThan(blockBefore);
      if (!baseline) {
        await expect(page.locator(`.player-hud b[aria-label="ブロック ${blockAfter}"]`)).toBeVisible();
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", String(blockAfter));
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-block-event", "block");
        const surface = await page.locator(".ally-slot").first().evaluate((node) => getComputedStyle(node, "::before").content);
        expect(surface).not.toBe("none");
      }
      expect(await geometry()).toEqual(before);
      await page.clock.runFor(190);
      if (capture && !baseline) {
        await page.addStyleTag({ content: '.ally-slot[data-block-event="block"]::before{animation:none!important;opacity:1!important;transform:none!important}' });
        expect(Number(await page.locator(".ally-slot").first().evaluate((node) => getComputedStyle(node, "::before").opacity))).toBeGreaterThan(.95);
      }
      if (capture) await page.screenshot({ path: `docs/art/previews/issue368/${baseline ? "before" : "after"}-block-${width}-${enemyCount}-${captureVersion}.png` });
      if (!baseline) {
        await page.clock.runFor(550);
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-block-event", "none");
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", String(blockAfter));
        await page.evaluate(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
        await page.reload();
        await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", String(blockAfter));
        expect(await page.locator(".ally-slot").first().evaluate((node) => getComputedStyle(node, "::before").animationName)).toBe("none");
      }
    });
  }
}
