import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const width of [1440, 1024, 390]) {
  test(`enemy turn leaves the battle layout still at ${width}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 1024 ? 768 : 900 });
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
    await expect(page.locator('.topbar [data-action="toggle-battle-help"]')).toHaveCount(1);
    await expect(page.locator('.topbar [data-action="open-combat-log"]')).toHaveCount(0);
    await expect(page.locator(".topbar .brand")).toHaveCount(0);
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
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    await expect(page.locator(".battle-message")).toContainText("敵が予告した行動を実行します");
    await expect(page.locator(".phase-banner")).toHaveCount(0);
    const during = await geometry();
    if (process.env.SCHOOL_RG_CAPTURE_HUD === "1") await page.screenshot({ path: `docs/art/previews/issue166-enemy-phase-v5-${width}.png` });
    await page.clock.runFor(650);
    await expect(page.locator(".battle-message")).toContainText("次のターン");
    expect(await page.locator(".result-fx-mark[data-kind=\"damage\"]").count()).toBeGreaterThan(0);
    expect(await page.locator(".result-fx-layer").evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
    if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: `docs/art/previews/issue177-enemy-response-${width}.png` });
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
    await page.keyboard.type("sweep");
    await expect(page.locator(".result-fx-mark[data-kind=\"damage\"]")).toBeVisible();
    await expect(page.locator(".hero-art.act")).toBeVisible();
    expect((await geometry()).actorSlot).toEqual(before.actorSlot);
    if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: `docs/art/previews/issue177-card-response-${width}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".result-fx-mark").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("[data-action=toggle-stimulus]").click();
    const blockWord = await page.locator(".card").filter({ hasText: "防御" }).first().locator(".card-word").innerText();
    await page.keyboard.type(blockWord);
    await expect(page.locator(".result-fx-mark[data-kind=\"block\"]")).toBeVisible();
    expect(await page.locator(".result-fx-mark[data-kind=\"block\"]").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: `docs/art/previews/issue177-quiet-support-${width}.png` });
  });
}

test("a typed status card marks the affected enemy in the stage", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const base = createRunSession(42, "science-demo", demoContent);
  const start: MapNode = { id: "status-start", act: 1, floor: 0, kind: "start", nextIds: ["status-fight"] };
  const fight: MapNode = { id: "status-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const sampleId = session.run.combat!.cards.find((card) => card.cardId === "SCI-001")!.instanceId;
  const drawPile = [...session.run.combat!.drawPile.filter((id) => id !== sampleId), sampleId];
  const prepared = { ...session, run: { ...session.run, combat: { ...session.run.combat!, drawPile } } };
  const saved = serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  await expect(page.locator(".card-word").filter({ hasText: "sample" })).toBeVisible();
  await page.keyboard.type("sample");
  await expect(page.locator(".result-fx-mark[data-kind=debuff]")).toContainText("毒 +3");
  await expect(page.locator(".enemy-status")).toContainText("毒 3");
  if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: "docs/art/previews/issue177-status-response-1024.png" });
});

test("the final typed hit remains on stage briefly and a reload settles the saved victory", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "final-start", act: 1, floor: 0, kind: "start", nextIds: ["final-fight"] };
  const fight: MapNode = { id: "final-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const strikeId = session.run.combat!.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const combat = session.run.combat!;
  const prepared = { ...session, run: { ...session.run, combat: { ...combat, enemies: combat.enemies.map((enemy) => ({ ...enemy, hp: 1 })), drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId] } } };
  const saved = serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  await page.keyboard.type("strike");
  await expect(page.locator(".enemy-slot.defeated")).toBeVisible();
  await expect(page.locator(".result-fx-mark[data-kind=damage]")).toBeVisible();
  await expect(page.locator(".battle-message")).toContainText("勝利");
  await expect(page.locator(".reward-panel")).toHaveCount(0);
  if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: "docs/art/previews/issue177-final-hit-1024.png" });
  const terminalSave = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
  expect(terminalSave.session.screen).toBe("combat");
  expect(terminalSave.session.run.combat.phase).toBe("WON");
  await page.reload();
  await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
});

test("a lethal enemy hit stays localized before the defeat result", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const base = createRunSession(42, "science-demo", demoContent);
  const start: MapNode = { id: "loss-start", act: 1, floor: 0, kind: "start", nextIds: ["loss-fight"] };
  const fight: MapNode = { id: "loss-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] }, player: { ...base.run.player, hp: 1 } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(remainingMs + 80);
  await page.clock.runFor(650);
  await expect(page.locator(".game .result-fx-mark[data-kind=damage]")).toBeVisible();
  await expect(page.locator(".battle-message")).toContainText("敗北");
  await expect(page.locator(".run-result")).toHaveCount(0);
  if (process.env.SCHOOL_RG_CAPTURE_MOTION === "1") await page.screenshot({ path: "docs/art/previews/issue177-final-loss-1024.png" });
  await page.clock.runFor(420);
  await expect(page.locator(".run-result")).toBeVisible();
});
