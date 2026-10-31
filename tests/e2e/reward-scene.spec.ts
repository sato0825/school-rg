import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, createRunSession, enterRunNode, settleRunCombat } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const combatOnlyMap = { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

for (const width of [1440, 1024]) {
  test(`reward remains on the combat stage and returns to route at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
    const start = createRunSession(42, "literature-demo", demoContent, combatOnlyMap);
    const combat = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const won = { ...combat, run: { ...combat.run, combat: { ...combat.run.combat!, phase: "WON" as const, enemies: combat.run.combat!.enemies.map((enemy) => ({ ...enemy, hp: 0 })) } } };
    const reward = settleRunCombat(won, demoContent);
    const saved = serializeRunSession(reward, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");

    await expect(page.locator(".reward-scene")).toBeVisible();
    await expect(page.getByRole("heading", { name: "カードを1枚選ぶ" })).toBeVisible();
    await expect(page.locator(".reward-scene-header")).toContainText(`ACT ${reward.run.act}`);
    await expect(page.locator(".reward-scene-header")).toContainText(`${reward.run.player.hp}/${reward.run.player.maxHp}`);
    await expect(page.locator(".reward-scene .brand")).toHaveCount(0);
    await expect(page.locator(".typing-input")).toHaveCount(0);
    expect(await page.locator(".reward-scene").getAttribute("style")).toContain("background-image:url(");
    await expect.poll(() => page.locator(".reward-scene-hero").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect.poll(() => page.locator(".reward-scene-enemy").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    if (process.env.SCHOOL_RG_CAPTURE_REWARD === "1") {
      await page.screenshot({ path: `docs/art/previews/issue220-reward-${width}.png`, fullPage: true });
    }

    await page.reload();
    await expect(page.locator(".reward-scene")).toBeVisible();
    await expect(page.locator(".reward-card")).toHaveCount(reward.rewardCardIds.length);
    await page.locator(".reward-card").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
    const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
    expect(resumed.session.run.combat).toBeNull();
    expect(resumed.session.run.deck).toHaveLength(reward.run.deck.length + 1);
  });
}
