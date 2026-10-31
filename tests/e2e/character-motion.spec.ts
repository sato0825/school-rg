import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

async function openScienceBattle(page: import("@playwright/test").Page, width: number): Promise<void> {
  await page.clock.install();
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
  const base = createRunSession(42, "science-demo", demoContent);
  const start: MapNode = { id: "motion-start", act: 1, floor: 0, kind: "start", nextIds: ["motion-fight"] };
  const fight: MapNode = { id: "motion-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const saved = serializeRunSession(session, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/");
  await expect(page.locator(".hero-art")).toHaveAttribute("src", /serious-student-idle/);
}

for (const width of [1440, 1024]) {
  test(`actor poses crossfade without moving the battle frame at ${width}px`, async ({ page }) => {
    await openScienceBattle(page, width);
    const frames = () => page.evaluate(() => [".topbar", ".stage", ".control-deck", ".ally-slot"].map((selector) => {
      const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
      return { x, y, width, height };
    }));
    const before = await frames();
    await page.keyboard.type("strike");
    await expect(page.locator(".hero-art.act.attack")).toBeVisible();
    await expect(page.locator(".hero-idle-underlay")).toHaveAttribute("src", /serious-student-idle/);
    expect(await page.locator(".hero-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("hero-cast-attack");
    expect(await page.locator(".hero-shadow").evaluate((node) => getComputedStyle(node).animationName)).toBe("shadow-cast-attack");
    expect(await frames()).toEqual(before);
    if (process.env.SCHOOL_RG_CAPTURE_CHARACTER_MOTION === "1") {
      await page.locator(".hero-art").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 55; }));
      await page.locator(".hero-idle-underlay").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 55; }));
      await page.screenshot({ path: `docs/art/previews/issue234-attack-enter-${width}.png` });
      await page.locator(".hero-art").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 180; }));
      await page.locator(".hero-idle-underlay").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 180; }));
      await page.locator(".hero-shadow").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 180; }));
      await page.screenshot({ path: `docs/art/previews/issue234-attack-${width}.png` });
    }
    await page.clock.runFor(380);
    await expect(page.locator(".hero-idle-underlay")).toHaveCount(0);
    await expect(page.locator(".hero-art")).toHaveAttribute("src", /serious-student-idle/);

    const support = await page.locator('.card[data-card-kind="skill"] .card-word').first().innerText();
    await page.keyboard.type(support);
    await expect(page.locator(".hero-art.act.support")).toBeVisible();
    expect(await page.locator(".hero-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("hero-cast-support");
    expect(await frames()).toEqual(before);
    if (process.env.SCHOOL_RG_CAPTURE_CHARACTER_MOTION === "1") {
      await page.locator(".hero-art").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 180; }));
      await page.locator(".hero-idle-underlay").evaluate((node) => node.getAnimations().forEach((animation) => { animation.currentTime = 180; }));
      await page.screenshot({ path: `docs/art/previews/issue234-support-${width}.png` });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".hero-idle-underlay").evaluate((node) => getComputedStyle(node).display)).toBe("none");
    expect(await page.locator(".hero-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await expect(page.locator(".result-fx-mark").first()).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.runFor(380);
    expect(await frames()).toEqual(before);
  });

  test(`enemy hit uses a short recoil and quiet mode keeps the result readable at ${width}px`, async ({ page }) => {
    await openScienceBattle(page, width);
    await page.locator('[data-action="toggle-stimulus"]').click();
    const remainingMs = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
    await page.clock.runFor(remainingMs + 80);
    await page.clock.runFor(650);
    await expect(page.locator(".hero-art.react")).toBeVisible();
    await expect(page.locator(".result-fx-mark[data-kind='damage']")).toBeVisible();
    expect(await page.locator(".hero-idle-underlay").evaluate((node) => getComputedStyle(node).display)).toBe("none");
    expect(await page.locator(".hero-art").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    if (process.env.SCHOOL_RG_CAPTURE_CHARACTER_MOTION === "1") await page.screenshot({ path: `docs/art/previews/issue234-quiet-hit-${width}.png` });
  });
}
