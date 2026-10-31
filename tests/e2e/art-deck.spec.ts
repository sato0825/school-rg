import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

function paintedOpening() {
  const start = createRunSession(42, "art-demo", demoContent, mapOptions);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const combat = entered.run.combat!;
  const paint = combat.cards.find((card) => card.cardId === "ART-003")!.instanceId;
  const frame = combat.cards.find((card) => card.cardId === "ART-002")!.instanceId;
  const hand = [paint, frame];
  const staged = { ...combat, phase: "PLAYER_INPUT" as const, hand,
    drawPile: combat.cards.map((card) => card.instanceId).filter((id) => !hand.includes(id)),
    discardPile: [], exhaustPile: [], resolvingPile: [],
    typing: { buffer: "", candidateCardInstanceIds: hand, selectedCardInstanceId: null, progress: 0,
      targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false } };
  return { saved: serializeRunSession({ ...entered, run: { ...entered.run, combat: staged } }, demoContent,
    { nowMs: () => 0 }, () => "discard"), frame };
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
  test(`art club can type a copy and keep both cards after reload at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    const { saved, frame } = paintedOpening();
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    await expect(page.locator(".card-word")).toContainText(["paint", "frame"]);
    await page.keyboard.type("paint");
    await expect(page.locator(".typing-hint")).toContainText("手札");
    await page.locator(`.card[data-id="${frame}"]`).click();
    await expect(page.locator(".card-word").filter({ hasText: "frame" })).toHaveCount(2);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat);
    expect(before.cards.find((card: { instanceId: string }) => card.instanceId === "created-1")?.cardId).toBe("ART-002");
    expect(before.hand).toEqual([frame, "created-1"]);
    await page.reload();
    await expect(page.locator(".card-word").filter({ hasText: "frame" })).toHaveCount(2);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat);
    expect(after.hand).toEqual(before.hand);
    expect(after.cards).toEqual(before.cards);
    expect(new Set([after.drawPile, after.hand, after.discardPile, after.exhaustPile, after.resolvingPile].flat()).size).toBe(after.cards.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
