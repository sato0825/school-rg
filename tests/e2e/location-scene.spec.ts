import { expect, test, type Page } from "@playwright/test";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

async function startLocationRoute(page: Page): Promise<void> {
  const start = createRunSession(42, "literature-demo", demoContent);
  const kinds: MapNode["kind"][] = ["treasure", "shop", "rest", "event"];
  const nodes: MapNode[] = [
    { id: "location-start", act: 1, floor: 0, kind: "start", nextIds: ["location-1"] },
    ...kinds.map((kind, index): MapNode => ({ id: `location-${index + 1}`, act: 1, floor: index + 1, kind, nextIds: [index === kinds.length - 1 ? "location-boss" : `location-${index + 2}`] })),
    { id: "location-boss", act: 1, floor: 5, kind: "boss", nextIds: ["location-next-act"] },
    { id: "location-next-act", act: 2, floor: 0, kind: "start", nextIds: [] },
  ];
  const session = { ...start, run: { ...start.run, map: { nodes, currentNodeId: nodes[0]!.id } }, completedNodeIds: [nodes[0]!.id] };
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => {
    if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", value);
  }, saved);
  await page.goto("/");
}

async function expectLocationStage(page: Page, kind: "treasure" | "shop" | "rest" | "event", width: number): Promise<void> {
  const scene = page.locator(`.location-scene.${kind}-scene`);
  await expect(scene).toBeVisible();
  await expect(page.locator(".reward-scene-hero")).toBeVisible();
  await expect(page.locator(".reward-scene-health-track")).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(page.locator(".location-scene-resources")).toContainText(/\d+G/);
  await expect(page.getByRole("heading", { name: "学園タイピングローグライク" })).toHaveCount(0);
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector(".reward-scene-hero")!.getBoundingClientRect();
    const panel = document.querySelector(".location-panel")!.getBoundingClientRect();
    return { heroRight: hero.right, panelLeft: panel.left, viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, imageLoaded: (document.querySelector(".reward-scene-hero") as HTMLImageElement).naturalWidth > 0, background: getComputedStyle(document.querySelector(".location-scene")!).backgroundImage };
  });
  expect(geometry.imageLoaded).toBe(true);
  expect(geometry.background).toContain("url(");
  expect(geometry.heroRight).toBeLessThanOrEqual(geometry.panelLeft + 8);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  if (process.env.SCHOOL_RG_CAPTURE_LOCATION_SCENE === "1") await page.screenshot({ path: `docs/art/previews/issue227-${kind}-v2-${width}.png` });
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`four locations remain on the stage and survive reload at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.install();
    await page.setViewportSize(viewport);
    await startLocationRoute(page);

    await page.locator(".map-node.available").filter({ hasText: "宝箱" }).click();
    await expectLocationStage(page, "treasure", viewport.width);
    await page.reload();
    await expect(page.locator(".treasure-panel")).toBeVisible();
    await page.locator(".treasure-offer:not(:disabled)").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-scene")).toBeVisible();

    await page.locator(".map-node.available").filter({ hasText: "購買" }).click();
    await expectLocationStage(page, "shop", viewport.width);
    await page.reload();
    await expect(page.locator(".shop-panel")).toBeVisible();
    await page.getByRole("button", { name: "購買を出る" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-scene")).toBeVisible();

    await page.locator(".map-node.available").filter({ hasText: "休憩" }).click();
    await expectLocationStage(page, "rest", viewport.width);
    await page.reload();
    await expect(page.locator(".rest-panel")).toBeVisible();
    await page.locator("[data-action=rest-upgrade]").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-scene")).toBeVisible();

    await page.locator(".map-node.available").filter({ hasText: "イベント" }).click();
    await page.addInitScript(() => {
      const saved = JSON.parse(localStorage.getItem("school-rg-run-v1")!);
      saved.session.run.event.eventId = "after-school-board";
      localStorage.setItem("school-rg-run-v1", JSON.stringify(saved));
    });
    await page.reload();
    await expectLocationStage(page, "event", viewport.width);
    await page.locator('[data-action="event-choice"][data-id="help"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-scene")).toBeVisible();
  });
}
