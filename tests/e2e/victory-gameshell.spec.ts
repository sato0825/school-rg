import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

for (const width of [1024, 1440]) {
  for (const club of demoContent.clubs) {
    test(`${club.name} victory stays on the stage at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
      const initial = createRunSession(42, club.id, demoContent);
      const boss = initial.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
      const won = { ...initial, screen: "won" as const, run: {
        ...initial.run, act: 3 as const, map: { ...initial.run.map, currentNodeId: boss.id },
      }, completedNodeIds: [...initial.completedNodeIds, boss.id] };
      const save = serializeRunSession(won, demoContent, { nowMs: () => 0 }, () => "discard");
      await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), save);
      await page.goto("/");
      await expect(page.locator('.game-shell[data-screen="won"]')).toBeVisible();
      await expect(page.getByRole("heading", { name: "全Actクリア" })).toBeVisible();
      await expect(page.locator(".hero-art.victory-pose")).toBeVisible();
      await expect(page.locator(".hero-nameplate")).toContainText(club.name);
      await expect(page.locator(".victory-act-marks")).toHaveAttribute("aria-label", "Act 1、Act 2、Act 3を完走");
      await expect(page.locator(".typing-input")).toBeDisabled();
      await expect(page.locator(".control-deck")).toHaveAttribute("aria-hidden", "true");
      await expect(page.getByRole("button", { name: "新しいランを始める" })).toBeInViewport();
      await expect(page.getByRole("button", { name: "ラン履歴を見る" })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (process.env.SCHOOL_RG_VICTORY_OUTPUT_DIR) {
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(process.env.SCHOOL_RG_VICTORY_OUTPUT_DIR, `issue292-victory-${club.id}-${width}.png`) });
      }
      const firstStage = await page.locator(".stage").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const actor = element.querySelector(".ally-slot")!.getBoundingClientRect();
        return { rect: [rect.x, rect.y, rect.width, rect.height], actor: [actor.x, actor.y, actor.width, actor.height] };
      });
      await page.reload();
      await expect(page.locator('.game-shell[data-screen="won"]')).toBeVisible();
      const nextStage = await page.locator(".stage").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const actor = element.querySelector(".ally-slot")!.getBoundingClientRect();
        return { rect: [rect.x, rect.y, rect.width, rect.height], actor: [actor.x, actor.y, actor.width, actor.height] };
      });
      expect(nextStage).toEqual(firstStage);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.screen)).toBe("won");
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-history-v1")!).entries.length)).toBe(1);
    });
  }
}

test("quiet victory retains actions with no pose animation", async ({ page }) => {
  const initial = createRunSession(42, "literature-demo", demoContent);
  const boss = initial.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
  const won = { ...initial, screen: "won" as const, run: {
    ...initial.run, act: 3 as const, map: { ...initial.run.map, currentNodeId: boss.id },
  }, completedNodeIds: [...initial.completedNodeIds, boss.id] };
  const save = serializeRunSession(won, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => {
    localStorage.setItem("school-rg-run-v1", value);
    localStorage.setItem("school-rg-low-stimulus-v1", "1");
  }, save);
  await page.goto("/");
  await expect(page.locator('.game-shell[data-effects="quiet"][data-screen="won"]')).toBeVisible();
  expect(await page.locator(".victory-pose").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("button", { name: "ラン履歴を見る" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".history-entry")).toHaveCount(1);
});
