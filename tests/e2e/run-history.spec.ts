import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

test("five-club history is readable and keyboard operable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const entries = demoContent.clubs.map((club, index) => ({
    runId: `prior-${index}`, clubId: club.id, seed: 42 + index, ascensionLevel: 0,
    result: index % 2 ? "lost" : "won", act: index % 2 ? 1 : 3, floor: index % 2 ? 2 : 13,
    hp: index % 2 ? 0 : 10, maxHp: club.startingHp, reachedNodes: index % 2 ? 2 : 42,
  }));
  await page.addInitScript((history) => localStorage.setItem("school-rg-history-v1", JSON.stringify(history)), { formatVersion: 1, entries });
  await page.goto("/");
  await page.getByRole("button", { name: "ラン履歴 · 5" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".history-club")).toHaveCount(5);
  await expect(page.locator(".history-entry")).toHaveCount(5);
  await expect(page.locator(".history-club").first()).toContainText("完走 1 · 敗北 0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "戻る" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
});

test("corrupt history is reported and preserved beside a completed legacy save", async ({ page }) => {
  const start = createRunSession(42, "literature-demo", demoContent);
  const boss = start.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
  const terminal = { ...start, screen: "won" as const, run: { ...start.run, act: 3 as const,
    map: { ...start.run.map, currentNodeId: boss.id } }, completedNodeIds: [...start.completedNodeIds, boss.id] };
  const saved = serializeRunSession(terminal, demoContent, { nowMs: () => 0 }, () => "discard");
  const corrupt = '{"formatVersion":1,"entries":[';
  await page.addInitScript(({ run, history }) => {
    localStorage.setItem("school-rg-run-v1", run);
    localStorage.setItem("school-rg-history-v1", history);
  }, { run: saved, history: corrupt });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "全Actクリア" })).toBeVisible();
  await expect(page.locator(".history-error")).toBeVisible();
  await page.getByRole("button", { name: "ラン履歴を見る" }).click();
  await expect(page.locator(".history-error")).toContainText("既存データを保持");
  expect(await page.evaluate(() => localStorage.getItem("school-rg-history-v1"))).toBe(corrupt);
  expect(await page.evaluate(() => localStorage.getItem("school-rg-run-v1"))).toBe(saved);
});
