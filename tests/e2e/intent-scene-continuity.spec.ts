import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

const captureDir = process.env.ISSUE360_CAPTURE_DIR;

for (const width of [1024, 1440] as const) for (const quiet of [false, true] as const) {
  test(`five-to-one mixed Intent keeps the scene still at ${width}px, quiet=${quiet}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "cue-start", act: 1, floor: 0, kind: "start", nextIds: ["cue-fight"] };
    const fight: MapNode = { id: "cue-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["hall-mop"], elite: ["hall-mop"], boss: ["hall-mop"] });
    const combat = entered.run.combat!;
    const sweepId = combat.cards.find((card) => card.cardId === "BASE-011")!.instanceId;
    const first = combat.enemies[0]!;
    const enemies = Array.from({ length: 5 }, (_, index) => ({ ...first, instanceId: `cue-enemy-${index}`, intentId: "mop-intent-sweep", hp: index === 0 ? first.maxHp : 1 }));
    const prepared = { ...entered, run: { ...entered.run, combat: { ...combat, enemies, drawPile: [...combat.drawPile.filter((id) => id !== sweepId), sweepId] } } };
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
    await page.goto("/");
    if (quiet) {
      await page.getByRole("button", { name: "操作", exact: true }).click();
      await page.locator("[data-action=toggle-stimulus]").click();
      await page.keyboard.press("Escape");
      await expect(page.locator(".game-shell")).toHaveAttribute("data-effects", "quiet");
    }
    const geometry = () => page.evaluate(() => {
      const bounds = (selector: string) => {
        const { x, y, width: w, height: h } = document.querySelector(selector)!.getBoundingClientRect();
        return { x, y, width: w, height: h };
      };
      return {
        header: bounds(".topbar"), stage: bounds(".stage"), hero: bounds(".ally-slot"), rail: bounds(".control-deck"), hand: bounds(".hand"),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    const before = await geometry();
    await expect(page.locator(".enemy-roster-button")).toHaveCount(5);
    await expect(page.locator('.enemy-slot .intent-body-cue[data-kind="attack"]')).toHaveCount(5);
    await expect(page.locator('.enemy-slot .intent-body-cue[data-kind="block"]')).toHaveCount(5);
    const windupsStayOnEnemy = await page.locator('.enemy-slot .intent-body-cue[data-kind="attack"]').evaluateAll((nodes) => nodes.every((node) => {
      const cue = node.getBoundingClientRect();
      const actor = node.closest('.enemy-slot')!.getBoundingClientRect();
      return cue.left >= actor.left && cue.right <= actor.right && cue.top >= actor.top && cue.bottom <= actor.bottom;
    }));
    expect(windupsStayOnEnemy).toBe(true);
    await expect(page.locator(".intent-trajectory")).toHaveCount(0);
    if (captureDir) await page.screenshot({ path: `${captureDir}/five-preview-${width}-${quiet ? "quiet" : "standard"}.png` });
    await page.locator(".enemy-roster-button").first().click();
    await expect(page.locator(".intent-trajectory")).toHaveCount(1);
    await expect(page.locator(".intent-trajectory")).toHaveAttribute("aria-hidden", "true");
    expect(await geometry()).toEqual(before);
    await page.keyboard.type("sweep");
    await expect(page.locator(".enemy-slot")).toHaveCount(1);
    await expect(page.locator(".intent-trajectory")).toHaveCount(0);
    expect(await geometry()).toEqual(before);
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    expect(await geometry()).toEqual(before);
    await page.clock.runFor(650);
    await expect(page.locator('.result-fx-mark[data-kind="damage"] .intent-glyph')).toBeVisible();
    await expect(page.locator('.result-fx-mark[data-kind="block"] .intent-glyph')).toBeVisible();
    await expect(page.locator('.intent-trajectory[data-phase="resolved"]')).toHaveAttribute('data-source', 'cue-enemy-0');
    await expect(page.locator('.intent-trajectory[data-phase="resolved"]')).toHaveAttribute('data-target', 'player');
    if (captureDir) await page.screenshot({ path: `${captureDir}/one-resolved-${width}-${quiet ? "quiet" : "standard"}.png` });
    expect(await geometry()).toEqual(before);
    if (quiet) {
      expect(await page.locator(".enemy-art").first().evaluate((node) => node.getAnimations().length)).toBe(0);
      expect(await page.locator(".result-fx-mark").first().evaluate((node) => node.getAnimations().length)).toBe(0);
    }
  });
}
