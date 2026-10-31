import { expect, test, type Page } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

type Place = "treasure" | "shop" | "rest" | "event";

async function openLocation(page: Page, place: Place, width: number, act: 1 | 3 = 1): Promise<void> {
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "location-start", act, floor: 0, kind: "start", nextIds: ["location-destination"] };
  const destination: MapNode = { id: "location-destination", act, floor: 1, kind: place, nextIds: ["location-boss"] };
  const boss: MapNode = { id: "location-boss", act, floor: 2, kind: "boss", nextIds: [] };
  const mapped = { ...base, run: { ...base.run, act, player: { ...base.run.player, hp: 20 }, map: { nodes: [start, destination, boss], currentNodeId: start.id } }, completedNodeIds: [start.id] };
  const saved = serializeRunSession(mapped, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((json) => {
    if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", json);
  }, saved);
  await page.goto("/");
  await page.evaluate(() => {
    Object.assign(window, { __locationStage: document.querySelector(".stage"), __locationHero: document.querySelector(".hero-art"), __locationInput: document.querySelector(".typing-input") });
  });
  await page.locator(".map-node.available").click();
  if (place === "event") {
    await page.addInitScript(() => {
      const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
      if (saved.session.screen === "event") {
        saved.session.run.event.eventId = "after-school-board";
        localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
      }
    });
    await page.reload();
  }
  await expect(page.locator(`.location-scene[data-location="${place}"]`)).toBeVisible();
  if (place !== "event") {
    expect(await page.evaluate(() => Reflect.get(window, "__locationStage") === document.querySelector(".stage"))).toBe(true);
    expect(await page.evaluate(() => Reflect.get(window, "__locationHero") === document.querySelector(".hero-art"))).toBe(true);
    expect(await page.evaluate(() => Reflect.get(window, "__locationInput") === document.querySelector(".typing-input"))).toBe(true);
  }
  await expect(page.locator(".typing-input")).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const firstAction = page.locator(".location-scene button[data-action]:not(:disabled)").first();
  await expect(firstAction).toBeVisible();
  expect(await firstAction.evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  if (process.env.SCHOOL_RG_CAPTURE_LOCATIONS === "1") await page.screenshot({ path: `docs/design/previews/issue286-live-${place}-${width}${act === 3 ? "-act3" : ""}.png`, fullPage: true });
}

for (const width of [1440, 1024]) {
  for (const place of ["treasure", "shop", "rest", "event"] as const) {
    test(`${place} remains on GameShell at ${width} and resolves from saved state`, async ({ page }) => {
      await openLocation(page, place, width);
      const currentStageArt = await page.locator(".stage").getAttribute("data-stage-art");
      const currentBackground = await page.locator(".stage").evaluate((stage) => getComputedStyle(stage).backgroundImage);
      await page.reload();
      await expect(page.locator(`.location-scene[data-location="${place}"]`)).toBeVisible();
      await expect(page.locator(".stage")).toHaveAttribute("data-stage-art", currentStageArt ?? "");
      expect(await page.locator(".stage").evaluate((stage) => getComputedStyle(stage).backgroundImage)).toBe(currentBackground);
      if (place === "treasure") await page.locator('[data-action="treasure-offer"]:not(:disabled)').first().click();
      if (place === "shop") {
        await page.locator('[data-action="buy-offer"]:not(:disabled)').first().click();
        await expect(page.locator(".run-gold")).toHaveAttribute("aria-label", "所持金 10");
        await expect(page.locator('[data-action="buy-offer"]').first()).toBeDisabled();
        await page.locator('[data-action="leave-shop"]').click();
      }
      if (place === "rest") await page.locator('[data-action="rest-heal"]').click();
      if (place === "event") await page.locator('[data-action="event-choice"][data-id="help"]').click();
      await expect(page.locator(".map-panel")).toBeVisible();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.screen)).toBe("map");
      await expect(page.locator(".stage")).toHaveAttribute("data-stage-art", currentStageArt ?? "");
      if (place === "rest") await expect(page.locator(".player-health")).toContainText("32");
    });
  }
}

test("shop purchase keeps focus in the choices and leaves combat clock absent", async ({ page }) => {
  await openLocation(page, "shop", 1024);
  await page.locator('[data-action="buy-offer"]').first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-action="buy-offer"]').first()).toBeDisabled();
  expect(await page.evaluate(() => document.activeElement?.closest(".location-scene") !== null)).toBe(true);
  await expect(page.locator(".time-track")).toHaveCount(0);
  await expect(page.locator(".typing-input")).toBeDisabled();
});

test("Act 3 rest uses its selected stage inside GameShell", async ({ page }) => {
  await openLocation(page, "rest", 1024, 3);
  await expect(page.locator('.game-shell[data-screen="rest"] .location-scene')).toBeVisible();
  await expect(page.locator(".stage")).toHaveAttribute("data-act", "3");
  await expect(page.locator(".stage")).toHaveAttribute("data-stage-art", /act3/);
  await page.locator('[data-action="rest-heal"]').click();
  await expect(page.locator(".map-panel")).toBeVisible();
});

test("treasure object marks the chosen item before the map shows its result", async ({ page }) => {
  await openLocation(page, "treasure", 1440);
  await page.clock.install();
  await page.locator('[data-action="treasure-offer"]:not(:disabled)').first().click();
  await expect(page.locator('.location-scene[data-claiming="true"]')).toBeVisible();
  await expect(page.locator('.locker-open span[data-offer-index="0"]')).toHaveClass(/is-claiming/);
  await expect(page.locator('.location-choice[data-offer-index="0"]')).toHaveClass(/is-claiming/);
  await expect(page.locator(".location-message")).toContainText("受け取った");
  if (process.env.SCHOOL_RG_CAPTURE_LOCATIONS === "1") await page.screenshot({ path: "docs/design/previews/issue286-live-treasure-claim-1440.png", fullPage: true });
  await page.clock.runFor(350);
  await expect(page.locator(".map-panel")).toBeVisible();
  await expect(page.locator(".location-result-toast")).toContainText("受け取った");
});

test("reduced motion keeps treasure choice clear without a lift animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLocation(page, "treasure", 1024);
  await page.clock.install();
  await page.locator('[data-action="treasure-offer"]:not(:disabled)').first().click();
  await expect(page.locator('.locker-open span[data-offer-index="0"]')).toHaveClass(/is-claiming/);
  expect(await page.locator('.locker-open span[data-offer-index="0"]').evaluate((item) => getComputedStyle(item).animationName)).toBe("none");
  await page.clock.runFor(350);
  await expect(page.locator(".location-result-toast")).toContainText("受け取った");
});
