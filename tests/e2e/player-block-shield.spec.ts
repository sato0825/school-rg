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
      const defendId = combat.hand[0]!;
      const prepared = { ...entered, run: { ...entered.run, combat: { ...combat,
        cards: combat.cards.map((card) => card.instanceId === defendId ? { ...card, cardId: "BASE-002" }
          : combat.hand.includes(card.instanceId) && card.cardId === "BASE-002" ? { ...card, cardId: "BASE-001" } : card),
        enemies: Array.from({ length: enemyCount }, (_, index) => ({ ...combat.enemies[0]!, instanceId: `block-enemy-${index + 1}` })),
      } } };
      await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
      await page.goto("/");
      await expect(page.locator('.hand>.card[aria-label*="defend"]')).toHaveCount(1);
      const geometry = () => page.evaluate(() => {
        const rect = (selector: string) => {
          const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
          return { x, y, width, height };
        };
        return { header: rect(".topbar"), stage: rect(".stage"), actor: rect(".ally-slot"), controls: rect(".control-deck") };
      });
      const before = await geometry();
      const baseline = process.env.ISSUE368_BASELINE === "1";
      const capture = process.env.ISSUE368_CAPTURE === "1";
      if (capture) await page.screenshot({ path: `docs/art/previews/issue368/${baseline ? "before" : "after"}-idle-${width}-${enemyCount}.png` });
      await page.locator(".typing-input").focus();
      await page.keyboard.type("defend");
      await expect(page.locator('.result-fx-mark[data-kind="block"]')).toBeVisible();
      await expect(page.locator(".player-hud b")).toContainText("5");
      if (!baseline) {
        await expect(page.locator('.player-hud b[aria-label="ブロック 5"]')).toBeVisible();
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", "5");
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-block-event", "block");
        const surface = await page.locator(".ally-slot").first().evaluate((node) => getComputedStyle(node, "::before").content);
        expect(surface).not.toBe("none");
      }
      expect(await geometry()).toEqual(before);
      if (capture) await page.screenshot({ path: `docs/art/previews/issue368/${baseline ? "before" : "after"}-block-${width}-${enemyCount}.png` });
      if (!baseline) {
        await page.clock.runFor(550);
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-block-event", "none");
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", "5");
        await page.evaluate(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
        await page.reload();
        await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
        await expect(page.locator(".ally-slot").first()).toHaveAttribute("data-player-block", "5");
        expect(await page.locator(".ally-slot").first().evaluate((node) => getComputedStyle(node, "::before").animationName)).toBe("none");
      }
    });
  }
}
