import { expect, test } from "@playwright/test";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, chooseRunReward, createRunSession, enterRunNode, settleRunCombat } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

const combatOnlyMap = { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
  test(`reward and route share the school stage at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const start = createRunSession(42, "literature-demo", demoContent, combatOnlyMap);
    const combat = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const won = { ...combat, run: { ...combat.run, combat: { ...combat.run.combat!, phase: "WON" as const, enemies: combat.run.combat!.enemies.map((enemy) => ({ ...enemy, hp: 0 })) } } };
    const reward = settleRunCombat(won, demoContent);
    const saved = serializeRunSession(reward, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");

    const rewardStage = page.locator(".reward-scene");
    await expect(rewardStage).toBeVisible();
    const stageBackground = await rewardStage.evaluate((element) => getComputedStyle(element).backgroundImage);
    const heroSource = await page.locator(".reward-scene-hero").getAttribute("src");
    await page.locator(".reward-card").first().click();

    const route = page.locator(".route-scene");
    await expect(route).toBeVisible();
    await expect(route.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
    await expect(route.locator(".brand")).toHaveCount(0);
    await expect(route.locator(".typing-input, [data-role=time]")).toHaveCount(0);
    expect(await route.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(stageBackground);
    await expect(route.locator(".reward-scene-hero")).toHaveAttribute("src", heroSource!);
    await expect(route.locator(".map-node.current")).toHaveAttribute("aria-current", "location");
    const available = route.locator(".map-node.available");
    await expect(available).toHaveCount(availableRunNodes(chooseRunReward(reward, reward.rewardCardIds[0]!)).length);
    const alpha = await route.locator(".route-scene-overlay").evaluate((element) => Number(getComputedStyle(element).backgroundColor.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/)?.[1] ?? 1));
    expect(alpha).toBeLessThan(1);
    if (process.env.SCHOOL_RG_CAPTURE_ROUTE === "1") await page.screenshot({ path: `docs/art/previews/issue230-route-${width}.png` });

    await page.reload();
    await expect(page.locator(".route-scene .map-node.available")).toHaveCount(await available.count());
    await page.locator(".map-node.available").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-scene")).toHaveCount(0);
    await expect(page.locator(".stage")).toBeVisible();
  });
}

test("low stimulus route keeps the same information without blur", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await expect(page.locator(".route-scene")).toHaveAttribute("data-effects", "quiet");
  await expect(page.locator(".map-node.available")).not.toHaveCount(0);
  expect(await page.locator(".route-scene-overlay").evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
});
