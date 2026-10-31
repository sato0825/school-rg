import { expect, test } from "@playwright/test";
import type { MapNode } from "../../src/domain/schema.js";

test("battle map remains on the combat scene and freezes only while explicitly open", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();

  const mapButton = page.getByRole("button", { name: "マップ", exact: true });
  const time = page.getByRole("meter", { name: "入力時間の残り" });
  await mapButton.click();
  await expect(page.locator(".stage")).toBeVisible();
  await expect(page.getByRole("region", { name: "校内経路" })).toBeVisible();
  await expect(page.getByRole("button", { name: /閉じる Esc/ })).toBeFocused();
  await expect(page.locator(".battle-map-time-state")).toContainText("入力時間停止中");
  await expect(mapButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();
  const pausedTime = Number(await time.getAttribute("aria-valuenow"));

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!));
  const nodes: MapNode[] = saved.session.run.map.nodes;
  const current = nodes.find((node) => node.id === saved.session.run.map.currentNodeId)!;
  await expect(page.locator(`.battle-map-node.current[data-node-id="${current.id}"]`)).toBeVisible();
  const next = await page.locator(".battle-map-node.next").evaluateAll((items) => items.map((item) => item.getAttribute("data-node-id")));
  expect(next.sort()).toEqual([...current.nextIds].sort());
  expect(await page.locator(".battle-map-node button").count()).toBe(0);

  await page.clock.runFor(2_000);
  expect(Number(await time.getAttribute("aria-valuenow"))).toBe(pausedTime);
  await page.keyboard.press("f");
  await expect(page.getByRole("textbox", { name: "カード名をタイプ" })).toHaveValue("");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /閉じる Esc/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "校内経路" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "カード名をタイプ" })).toBeFocused();
  await page.clock.runFor(500);
  expect(Number(await time.getAttribute("aria-valuenow"))).toBeLessThan(pausedTime);
});
