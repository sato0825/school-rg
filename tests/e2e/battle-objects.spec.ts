import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const { width, height } of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
  test(`pile tray keeps the battle visible and returns to typing at ${width}×${height}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "tray-start", act: 1, floor: 0, kind: "start", nextIds: ["tray-fight"] };
    const fight: MapNode = { id: "tray-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");

    const draw = page.locator('.pile-token[data-pile="draw"]');
    await draw.click();
    await expect(draw).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#battle-pile-tray")).toBeVisible();
    await expect(page.locator(".stage")).toBeVisible();
    const trayBox = await page.locator("#battle-pile-tray").boundingBox();
    for (const selector of [".intent-ticket", ".enemy-hud", ".hero-art", ".enemy-art", ".typing-row", ".hand"]) {
      const box = await page.locator(selector).first().boundingBox();
      expect(trayBox && box && (trayBox.x >= box.x + box.width || box.x >= trayBox.x + trayBox.width || trayBox.y >= box.y + box.height || box.y >= trayBox.y + trayBox.height), `${selector} must stay clear of the pile tray: ${JSON.stringify({ trayBox, box })}`).toBeTruthy();
    }
    await expect(page.locator('#battle-pile-tray [data-action="close-pile"]')).toBeFocused();
    await expect(page.locator(".pile-order-note")).toBeVisible();
    await expect(page.locator(".pile-card")).toHaveCount(Number(await draw.locator("strong").innerText()));
    const remaining = Number((await page.locator("[data-role=time]").innerText()).replace(/[^0-9.]/g, ""));
    await page.clock.runFor(400);
    const after = Number((await page.locator("[data-role=time]").innerText()).replace(/[^0-9.]/g, ""));
    expect(after).toBeLessThan(remaining);
    if (process.env.SCHOOL_RG_CAPTURE_TRAY === "1") await page.screenshot({ path: `docs/art/previews/issue200-pile-tray-v7-${width}x${height}.png` });

    await page.locator('#battle-pile-tray [data-action="show-pile"][data-id="discard"]').click();
    await expect(page.locator('#battle-pile-tray [data-id="discard"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#battle-pile-tray [data-id="discard"]')).toBeFocused();
    await page.locator('#battle-pile-tray [data-action="show-pile"][data-id="draw"]').click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#battle-pile-tray")).toBeHidden();
    await expect(page.locator(".typing-input")).toBeFocused();
    await page.locator('.pile-token[data-pile="exhaust"]').click();
    await expect(page.locator(".pile-empty")).toHaveText("カードはありません");
    await page.locator('#battle-pile-tray [data-action="close-pile"]').click();
    await expect(page.locator(".typing-input")).toBeFocused();
    await draw.click();
    await page.locator(".battle-map-trigger").click();
    await expect(page.locator("#battle-pile-tray")).toBeHidden();
    await expect(page.locator(".battle-map-overlay")).toBeVisible();
    await page.locator('.pile-token[data-pile="discard"]').evaluate((button: HTMLElement) => button.click());
    await expect(page.locator("#battle-pile-tray")).toBeHidden();
    const pausedTime = await page.locator("[data-role=time]").innerText();
    await page.clock.runFor(400);
    await expect(page.locator("[data-role=time]")).toHaveText(pausedTime);
    await page.keyboard.press("Escape");
    await expect(page.locator(".battle-map-overlay")).toHaveCount(0);
    await expect(page.locator(".typing-input")).toBeFocused();
  });

  test(`card piles and both sides' statuses stay readable at ${width}×${height}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height });
    const base = createRunSession(42, "science-demo", demoContent);
    const start: MapNode = { id: "objects-start", act: 1, floor: 0, kind: "start", nextIds: ["objects-fight"] };
    const fight: MapNode = { id: "objects-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const combat = session.run.combat!;
    const first = combat.enemies[0]!;
    combat.enemies = Array.from({ length: 3 }, (_, index) => ({ ...first, instanceId: `objects-enemy-${index + 1}` }));
    combat.statuses.player = { strength: 2, poison: 1 };
    combat.statuses.enemies["objects-enemy-3"] = { weak: 2 };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");

    await expect(page.locator(".pile-token")).toHaveCount(3);
    await expect(page.locator('.pile-token[data-pile="draw"]')).toHaveAttribute("aria-label", /山札 \d+枚/);
    await expect(page.locator('.pile-token[data-pile="discard"]')).toHaveAttribute("aria-label", /捨て札 \d+枚/);
    await expect(page.locator('.pile-token[data-pile="exhaust"]')).toHaveAttribute("aria-label", /除外 \d+枚/);
    await expect(page.locator('.topbar .status-chip[data-status="strength"]')).toHaveAttribute("aria-label", /力 \d+/);
    await expect(page.locator('.enemy-roster-button[data-id="objects-enemy-3"]')).toHaveAttribute("aria-label", /弱体 2/);
    await expect(page.locator(".hero-nameplate")).toContainText("科学部");
    await expect(page.locator(".hand .card").first()).toBeInViewport();
    await expect(page.locator(".pile-token").first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (process.env.SCHOOL_RG_CAPTURE_OBJECTS === "1") {
      await page.locator('.enemy-roster-button[data-id="objects-enemy-3"]').focus();
      await page.screenshot({ path: `docs/art/previews/issue187-battle-objects-integrated-${width}x${height}.png` });
    }
  });
}
