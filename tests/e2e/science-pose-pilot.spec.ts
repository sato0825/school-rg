import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

test("science pilot poses follow typing and enemy Intent without moving controls", async ({ page }) => {
  await page.clock.install();
  const start = createRunSession(42, "science-demo", demoContent);
  const from: MapNode = { id: "pilot-start", act: 1, floor: 0, kind: "start", nextIds: ["pilot-fight"] };
  const fight: MapNode = { id: "pilot-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
  const session = { ...start, run: { ...start.run, map: { currentNodeId: from.id, nodes: [from, fight] } }, completedNodeIds: [from.id] };
  const entered = enterRunNode(session, fight.id, demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["final-exam"] });
  const saved = serializeRunSession(entered, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), saved);
  await page.goto("/?artPreview=sciencePilot&shortRun=1&seed=42");
  const hero = page.locator(".hero-art");
  await expect(page.locator(".art-preview-label")).toContainText("未採用");
  await expect(page.locator(".intent-ticket")).toContainText("紙片が飛ぶ");
  await expect(hero).toHaveAttribute("src", /serious-student-idle-candidate-v2/);
  const controlsBefore = await page.locator(".control-deck").boundingBox();
  const word = await page.locator(".card-word").first().innerText();
  await page.keyboard.type(word);
  await expect(hero).toHaveAttribute("src", /serious-student-activate-candidate-v3/);
  await expect.poll(() => hero.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1024);
  await page.clock.runFor(390);
  await expect(hero).toHaveAttribute("src", /serious-student-idle-candidate-v2/);
  let hitObserved = false;
  for (let step = 0; step < 110; step++) {
    await page.clock.runFor(200);
    if ((await hero.getAttribute("src"))?.includes("serious-student-hit-candidate-v3")) { hitObserved = true; break; }
  }
  expect(hitObserved).toBe(true);
  const controlsAfter = await page.locator(".control-deck").boundingBox();
  expect(controlsBefore && controlsAfter).toBeTruthy();
  expect(Math.abs(controlsAfter!.y - controlsBefore!.y)).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  const stage = await page.locator(".stage").boundingBox();
  const controls = await page.locator(".control-deck").boundingBox();
  const heroBox = await hero.boundingBox();
  expect(stage && controls && heroBox).toBeTruthy();
  expect(heroBox!.x).toBeGreaterThanOrEqual(stage!.x);
  expect(heroBox!.x + heroBox!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(heroBox!.y + heroBox!.height).toBeLessThanOrEqual(controls!.y + 1);
});
