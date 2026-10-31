import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

test.use({ hasTouch: true });

const clubs = [
  ["literature-demo", "literature-defeat-candidate-v1.png", "文芸部"],
  ["science-demo", "serious-student-defeat-candidate-v1.png", "科学部"],
  ["kendo-demo", "kendo-defeat-candidate-v1.png", "剣道部"],
  ["music-demo", "music-defeat-candidate-v1.png", "軽音部"],
  ["art-demo", "art-defeat-candidate-v1.png", "美術部"],
] as const;

test("last enemy action reaches HP zero without replacing the stage or actor", async ({ page }) => {
  test.setTimeout(70_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.evaluate(() => {
    const local = window as typeof window & { __lossStage?: Element | null; __lossActor?: Element | null; __lossInput?: Element | null };
    local.__lossStage = document.querySelector(".game-shell .stage");
    local.__lossActor = document.querySelector(".game-shell .ally-slot");
    local.__lossInput = document.querySelector(".game-shell .typing-input");
  });
  for (let turn = 0; turn < 30 && !(await page.locator('.game-shell[data-screen="lost"]').count()); turn++) await page.clock.runFor(11_000);
  await expect(page.locator('.game-shell[data-screen="lost"] .loss-note h2')).toHaveText("敗北");
  await expect(page.locator(".game-shell .hero-art")).toHaveAttribute("src", /literature-defeat-candidate-v1/);
  await expect(page.locator(".game-shell .typing-input")).toBeDisabled();
  expect(await page.evaluate(() => {
    const local = window as typeof window & { __lossStage?: Element | null; __lossActor?: Element | null; __lossInput?: Element | null };
    return [local.__lossStage === document.querySelector(".game-shell .stage"), local.__lossActor === document.querySelector(".game-shell .ally-slot"), local.__lossInput === document.querySelector(".game-shell .typing-input")];
  })).toEqual([true, true, true]);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.keyboard.type("strike");
  await page.clock.runFor(5_000);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  expect(after).toBe(before);
  await page.getByRole("button", { name: "新しいランを始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
});

for (const [clubId, filename, club] of clubs) {
  test(`${club} loss candidate survives save reload and remains touch-operable`, async ({ page }) => {
    const initial = createRunSession(42, clubId, demoContent);
    const session = { ...initial, screen: "lost" as const, run: { ...initial.run, player: { ...initial.run.player, hp: 0 } } };
    const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
    await page.goto("/");
    await expect(page.locator('.game-shell[data-screen="lost"]')).toBeVisible();
    await expect(page.locator(".hero-art")).toHaveAttribute("src", new RegExp(filename));
    await expect(page.locator(".hero-art")).toHaveAttribute("alt", new RegExp(club));
    await expect(page.getByRole("region", { name: "ランの結果" })).toContainText(club);
    await expect(page.getByRole("button", { name: "新しいランを始める" })).toBeVisible();
    await page.reload();
    await expect(page.locator(".hero-art")).toHaveAttribute("src", new RegExp(filename));
    await page.getByRole("button", { name: "新しいランを始める" }).tap();
    await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
  });
}

test("quiet loss shows a still pose and reachable result", async ({ page }) => {
  const initial = createRunSession(42, "science-demo", demoContent);
  const session = { ...initial, screen: "lost" as const, run: { ...initial.run, player: { ...initial.run.player, hp: 0 } } };
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => {
    localStorage.setItem("school-rg-run-v1", value);
    localStorage.setItem("school-rg-low-stimulus-v1", "1");
  }, saved);
  await page.goto("/");
  await expect(page.locator('.game-shell[data-screen="lost"][data-effects="quiet"]')).toBeVisible();
  await expect(page.locator(".hero-art")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("heading", { name: "敗北" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "新しいランを始める" })).toBeFocused();
});
