import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";

test("Kendo can choose the guarded sweep by hand number after typing its shared name", async ({ page }) => {
  const start = createRunSession(42, "kendo-demo", demoContent);
  const entered = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
  const original = entered.run.combat!;
  const baseId = original.cards.find((card) => card.cardId === "BASE-011")!.instanceId;
  const added = createCombatCard(original, demoContent, "KEN-007", false, "hand", { maxHandSize: 10 });
  const kendoId = added.instanceId;
  const combat = {
    ...added.combat,
    phase: "PLAYER_INPUT" as const,
    hand: [baseId, kendoId],
    drawPile: added.combat.drawPile.filter((id) => id !== baseId && id !== kendoId),
    discardPile: [...added.combat.discardPile.filter((id) => id !== baseId && id !== kendoId),
      ...added.combat.hand.filter((id) => id !== baseId && id !== kendoId)],
    exhaustPile: added.combat.exhaustPile.filter((id) => id !== baseId && id !== kendoId),
    typing: { buffer: "", candidateCardInstanceIds: [baseId, kendoId], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null },
    clock: { remainingMs: 10_000, lastEventAtMs: 0, paused: false },
  };
  const session = { ...entered, run: { ...entered.run, combat } };
  const initialHp = combat.enemies[0]!.hp;
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  expect(deserializeRunSession(saved, demoContent, { nowMs: () => 0 }).run.combat?.hand).toEqual([baseId, kendoId]);
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  await expect(page.locator(".card")).toHaveCount(2);
  await page.getByRole("button", { name: "再開" }).click();
  await page.keyboard.type("sweep");
  await expect(page.locator(".typing-hint")).toContainText("同じ入力語 2枚");
  await expect(page.locator(".card").nth(1)).toHaveAttribute("aria-keyshortcuts", "2");
  await expect(page.locator(".typing-buffer")).toContainText("sweep");
  await page.keyboard.press("2");
  await expect(page.locator(".card")).toHaveCount(1);
  await expect(page.locator(".player-hud")).toContainText("◇ 3");
  const next = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
  expect(next.session.run.combat.hand).toEqual([baseId]);
  expect(next.session.run.combat.enemies[0].hp).toBe(initialHp - 5);
  expect(next.session.run.combat.clock.remainingMs).toBeGreaterThan(0);
});
