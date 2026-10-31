import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

test("map states, HP, and next action stay legible and operable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();

  const current = page.locator(".map-node.current");
  const available = page.locator(".map-node.available");
  await expect(current).toHaveAttribute("aria-current", "location");
  await expect(current).toHaveAttribute("aria-label", /現在地/);
  await expect(available.first()).toHaveAttribute("aria-label", /次に進める.*選択可能/);
  await expect(page.locator(".map-progress")).toContainText(`進める場所 ${await available.count()}`);
  await expect(page.getByRole("meter", { name: "プレイヤーのHP" })).toHaveAttribute("aria-valuenow", "40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await available.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".map-panel")).toHaveCount(0);
});

test("reloaded map opens at the current floor", async ({ page }) => {
  const start = createRunSession(42, "literature-demo", demoContent);
  const node = start.run.map.nodes.find((candidate) => candidate.act === 1 && candidate.floor === 6)!;
  const session = {
    ...start,
    run: { ...start.run, map: { ...start.run.map, currentNodeId: node.id } },
    completedNodeIds: [start.run.map.currentNodeId, node.id],
  };
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");

  await expect(page.locator(".map-node.current")).toHaveAttribute("aria-label", /6階/);
  const position = await page.locator(".map-scroll").evaluate((scroll) => {
    const currentFloor = scroll.querySelector(".map-node.current")!.closest(".map-floor")!;
    const viewport = scroll.getBoundingClientRect();
    const floor = currentFloor.getBoundingClientRect();
    return { scrollTop: scroll.scrollTop, withinView: floor.top >= viewport.top && floor.bottom <= viewport.bottom };
  });
  expect(position.scrollTop).toBeGreaterThan(0);
  expect(position.withinView).toBe(true);
});
