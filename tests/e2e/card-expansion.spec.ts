import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createCombatCard } from "../../src/domain/card-operations.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { createRunSession, enterRunNode, type EncounterPool } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { beginPlayerTurn } from "../../src/domain/turn-state.js";

const pool: EncounterPool = { combat: ["paper-heap"], elite: ["paper-heap"], boss: ["final-exam"] };
const samples = [
  ["literature-demo", "LIT-011", "draft"], ["science-demo", "SCI-010", "culture"],
  ["kendo-demo", "KEN-010", "pommel"], ["music-demo", "MUS-009", "pickup"],
  ["art-demo", "ART-009", "primer"],
] as const;

for (const [clubId, cardId, word] of samples) {
  test(`${clubId} can type a new reward card in the live battle HUD`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width: 390, height: 844 });
    const start = createRunSession(42, clubId, demoContent,
      { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } });
    const entered = enterRunNode(start, start.run.map.nodes[0]!.nextIds[0]!, demoContent, demoEnemyAi, pool);
    const active = beginPlayerTurn(entered.run, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, demoContent);
    const created = createCombatCard(active.combat!, demoContent, cardId, false, "hand", { maxHandSize: 10 });
    const run = { ...active, combat: created.combat };
    const saved = serializeRunSession({ ...entered, run }, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/?seed=42");
    await expect(page.locator(".card-word").filter({ hasText: word })).toBeInViewport();
    await expect(page.locator(".typing-buffer")).toBeInViewport();
    await page.getByRole("button", { name: "再開" }).click();
    await page.keyboard.type(word);
    await expect(page.locator(".battle-message")).toContainText(word);
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run);
    expect(current.combat.hand).not.toContain(created.instanceId);
    if (cardId === "LIT-011") expect(current.combat.enemies[0].hp).toBeLessThan(current.combat.enemies[0].maxHp);
    if (cardId === "SCI-010") expect(current.combat.statuses.enemies["enemy-1"].poison).toBe(4);
    if (cardId === "KEN-010") expect(current.player.block).toBe(5);
    if (cardId === "MUS-009") expect(current.combat.clock.remainingMs).toBeGreaterThan(10_000);
    if (cardId === "ART-009") expect(current.combat.statuses.player.barrier).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
}
