import { expect, test } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import { MOTION_MS } from "../../src/ui/motion-timing.js";

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
  await page.getByRole("button", { name: "効果音をオフにする" }).click();
  await page.evaluate(() => {
    const local = window as typeof window & { __lossStage?: Element | null; __lossActor?: Element | null; __lossInput?: Element | null; __lossStageRect?: DOMRect; __lossActorRect?: DOMRect };
    local.__lossStage = document.querySelector(".game-shell .stage");
    local.__lossActor = document.querySelector(".game-shell .ally-slot");
    local.__lossInput = document.querySelector(".game-shell .typing-input");
    local.__lossStageRect = local.__lossStage?.getBoundingClientRect();
    local.__lossActorRect = local.__lossActor?.getBoundingClientRect();
  });
  for (let turn = 0; turn < 30 && !(await page.locator('.game-shell[data-screen="lost"]').count()); turn++) await page.clock.runFor(11_000);
  await expect(page.getByRole("heading", { name: "敗北" })).toHaveText("今日はここまで");
  await expect(page.getByRole("button", { name: "効果音をオンにする" })).toBeVisible();
  await expect(page.locator(".game-shell .hero-art")).toHaveAttribute("src", /literature-defeat-candidate-v1/);
  await expect(page.locator(".game-shell .typing-input")).toBeDisabled();
  await expect(page.locator(".loss-note-damage")).toContainText(/♥ −\d+/);
  expect(await page.evaluate(() => {
    const local = window as typeof window & { __lossStage?: Element | null; __lossActor?: Element | null; __lossInput?: Element | null; __lossStageRect?: DOMRect; __lossActorRect?: DOMRect };
    const stage = document.querySelector(".game-shell .stage")?.getBoundingClientRect();
    const actor = document.querySelector(".game-shell .ally-slot")?.getBoundingClientRect();
    return [local.__lossStage === document.querySelector(".game-shell .stage"), local.__lossActor === document.querySelector(".game-shell .ally-slot"), local.__lossInput === document.querySelector(".game-shell .typing-input"), Math.abs((local.__lossStageRect?.y ?? 0) - (stage?.y ?? 999)) < 2, Math.abs((local.__lossStageRect?.height ?? 0) - (stage?.height ?? 999)) < 2, Math.abs((local.__lossActorRect?.x ?? 0) - (actor?.x ?? 999)) < 2];
  })).toEqual([true, true, true, true, true, true]);
  await expect(page.locator('.game-shell[data-screen="lost"] .stage')).not.toHaveCSS("background-image", "none");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.keyboard.type("strike");
  await page.clock.runFor(5_000);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  expect(after).toBe(before);
  if (process.env.SCHOOL_RG_CAPTURE_LOSS === "1") {
    await page.locator(".hero-art").evaluate((image: HTMLImageElement) => image.decode());
    await expect(page.locator(".hero-art")).toHaveCSS("opacity", "1");
    for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: `docs/art/previews/issue268-loss-real-${width}-v6.png`, fullPage: true });
    }
  }
  await page.getByRole("button", { name: "新しいランを始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "放課後を、打ち抜く。" })).toBeVisible();
});

test("final enemy intent shows the local hit before the loss note", async ({ page }) => {
  test.setTimeout(35_000);
  await page.clock.install();
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
    saved.session.run.player.hp = 1;
    saved.session.run.player.block = 0;
    localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "再開" }).click();
  const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remaining + 100);
  await page.clock.runFor(MOTION_MS.enemyPhase);
  await expect(page.locator(".hero-art.react")).toBeVisible();
  await expect(page.locator(".player-health")).toContainText("0/");
  if (process.env.SCHOOL_RG_CAPTURE_LOSS === "1") {
    for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: `docs/art/previews/issue268-loss-impact-real-${width}-v1.png`, fullPage: true });
    }
  }
  await page.clock.runFor(MOTION_MS.hit);
  await expect(page.locator('.game-shell[data-screen="lost"] .loss-note')).toBeVisible();
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
    await expect(page.locator(".loss-header-place")).toContainText(club);
    await expect(page.getByRole("button", { name: "新しいランを始める" })).toBeVisible();
    if (process.env.SCHOOL_RG_CAPTURE_LOSS === "1") {
      await page.locator(".hero-art").evaluate((image: HTMLImageElement) => image.decode());
      await expect(page.locator(".hero-art")).toHaveCSS("opacity", "1");
      for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
        await page.setViewportSize({ width, height });
        const hero = await page.locator(".hero-art").boundingBox();
        const note = await page.locator(".loss-note").boundingBox();
        const stage = await page.locator(".stage").boundingBox();
        expect(hero && note && stage).toBeTruthy();
        expect(hero!.x + hero!.width).toBeLessThan(note!.x);
        expect(hero!.y + hero!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 2);
        await page.screenshot({ path: `docs/art/previews/issue268-loss-${clubId}-${width}-v6.png`, fullPage: true });
      }
    }
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
