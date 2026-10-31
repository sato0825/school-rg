import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const width of [1440, 390]) {
  test(`enemy turn leaves the battle layout still at ${width}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "hud-start", act: 1, floor: 0, kind: "start", nextIds: ["hud-fight"] };
    const fight: MapNode = { id: "hud-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    const geometry = () => page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };
      const actor = document.querySelector<HTMLElement>(".ally-slot")!;
      return { header: box(".topbar"), stage: box(".stage"), controls: box(".control-deck"), player: box(".player-hud"), message: box(".battle-message"), actorSlot: { x: actor.offsetLeft, width: actor.offsetWidth, height: actor.offsetHeight }, scrollWidth: document.documentElement.scrollWidth };
    });
    const before = await geometry();
    await expect(page.locator(".topbar .player-hud")).toContainText("科学部");
    await expect(page.locator(".topbar .battle-guide")).toHaveCount(2);
    await expect(page.locator(".typing-row .battle-guide")).toHaveCount(0);
    await expect(page.locator(".intent-copy small")).toContainText("次の行動");
    await expect(page.locator(".enemy-health-track")).toHaveAttribute("role", "meter");
    await expect(page.locator(".enemy-health-track")).toHaveAttribute("aria-valuenow", /\d+/);
    await expect(page.locator(".player-health-track")).toHaveAttribute("role", "meter");
    await expect(page.locator(".typing-caption")).toContainText("カード名をタイプ");
    await page.locator("[data-action=toggle-stimulus]").click();
    await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
    expect(await page.locator(".enemy-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await page.locator("[data-action=toggle-stimulus]").click();
    expect(before.player.y + before.player.height).toBeLessThanOrEqual(before.stage.y + 1);
    expect(before.message.y + before.message.height).toBeLessThanOrEqual(before.controls.y + before.controls.height + 1);
    expect(before.scrollWidth).toBe(width);
    if (process.env.SCHOOL_RG_CAPTURE_HUD === "1") await page.screenshot({ path: `docs/art/previews/issue166-battle-hud-v5-${width}.png` });
    await page.clock.runFor(30_100);
    await expect(page.locator(".battle-message")).toContainText("敵が予告した行動を実行します");
    await expect(page.locator(".phase-banner")).toHaveCount(0);
    const during = await geometry();
    if (process.env.SCHOOL_RG_CAPTURE_HUD === "1") await page.screenshot({ path: `docs/art/previews/issue166-enemy-phase-v5-${width}.png` });
    await page.clock.runFor(650);
    await expect(page.locator(".battle-message")).toContainText("次のターン");
    await expect(page.locator(".result-fx-mark[data-kind=\"damage\"]")).toBeVisible();
    expect(await page.locator(".result-fx-layer").evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
    const after = await geometry();
    if (process.env.SCHOOL_RG_CAPTURE_HUD === "1") await page.screenshot({ path: `docs/art/previews/issue166-next-turn-v5-${width}.png` });
    for (const current of [during, after]) {
      expect(current.header).toEqual(before.header);
      expect(current.stage).toEqual(before.stage);
      expect(current.controls).toEqual(before.controls);
      expect(current.actorSlot).toEqual(before.actorSlot);
      expect(current.scrollWidth).toBe(width);
    }
    await expect(page.locator(".intent-ticket")).toBeInViewport();
    await expect(page.locator(".typing-buffer")).toBeInViewport();
  });
}
