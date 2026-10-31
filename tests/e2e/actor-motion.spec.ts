import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`six-layer literature rig follows the card event on a fixed stage at ${viewport.width}`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(viewport);
    await page.goto("/?shortRun=1&seed=42");
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /文芸部/ }).click();
    await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();

    const stage = page.locator(".game-shell .stage");
    const actor = stage.locator(".ally-slot").first();
    const actorBefore = await actor.boundingBox();
    const stageBefore = await stage.boundingBox();
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
    await expect(actor).toHaveAttribute("data-actor-rig", "literature-v1");
    await expect(actor.locator(".hero-rig .rig-part")).toHaveCount(7);
    await expect(actor).toHaveAttribute("data-rig-ready", "true");
    const rigNode = await actor.locator(".hero-rig").elementHandle();
    await page.clock.runFor(200);
    expect(await actor.locator(".hero-rig").evaluate((node, previous) => node === previous, rigNode)).toBe(true);
    expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node, "::before").animationName)).toBe("rig-left-contact");
    await page.keyboard.type("outline");

    await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
    await expect(actor.locator(".hero-art")).toHaveAttribute("src", /literature-activate-candidate-v2/);
    await expect(actor.locator(".hero-motion-frame")).toHaveCount(0);
    expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("rig-use-notebook");
    expect(await actor.boundingBox()).toEqual(actorBefore);
    expect(await stage.boundingBox()).toEqual(stageBefore);
    await page.clock.runFor(500);
    await expect(actor).toHaveAttribute("data-actor-motion", "idle");
    await expect(actor.locator(".hero-art")).toHaveAttribute("src", /literature-idle-candidate-v1/);
  });
}

test("the complete portrait remains visible until every rig layer decodes", async ({ page }) => {
  await page.route("**/literature-rig-parts-v1/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).not.toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-art").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
});

test("reload restores a complete rig without exposing individual loading layers", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.route("**/literature-rig-parts-v1/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await expect(page.locator(".game-shell .ally-slot").first()).toHaveAttribute("data-rig-ready", "true");
  await page.reload();
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("reduced motion keeps the event pose as a still with no overlay animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await page.keyboard.type("outline");
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  await expect(actor.locator(".hero-motion-frame")).toHaveCount(0);
  expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await actor.locator('[data-part="right-arm-notebook"]').evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  expect(await actor.locator(".hero-rig").evaluate((node) => getComputedStyle(node, "::before").animationName)).toBe("none");
});

test("the enemy hit changes the same body parts without moving the stage", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  const stage = page.locator(".game-shell .stage");
  const actor = stage.locator(".ally-slot").first();
  const before = await actor.boundingBox();
  await page.keyboard.type("outline");
  await page.clock.runFor(500);
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  await expect(actor.locator('[data-part="head"]')).toHaveCount(1);
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("rig-hit-head");
  expect(await actor.boundingBox()).toEqual(before);
  await expect(page.locator(".player-health strong")).not.toContainText("40/40");
});

test("quiet effects preserve a readable hit expression without character motion", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();
  await page.getByRole("button", { name: /文芸部/ }).click();
  await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
  await expect(page.locator('.game')).toHaveAttribute("data-effects", "quiet");
  await page.keyboard.type("outline");
  await page.clock.runFor(500);
  const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.combat.clock.remainingMs as number);
  await page.clock.runFor(remainingMs + 1);
  await page.clock.runFor(650);
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-actor-motion", "hit");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(await actor.locator('[data-part="head-hit"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("actor, rig, and focused typing input never detach through redraw, victory, reward, and map", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 768 });
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: "motion-start", act: 1, floor: 0, kind: "start", nextIds: ["motion-fight"] };
  const fight: MapNode = { id: "motion-fight", act: 1, floor: 1, kind: "combat", nextIds: ["motion-rest"] };
  const rest: MapNode = { id: "motion-rest", act: 1, floor: 2, kind: "rest", nextIds: [] };
  const session = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight, rest] } }, completedNodeIds: [start.id] }, fight.id,
    demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
  const combat = session.run.combat!;
  const strikeId = combat.cards.find((card) => card.cardId === "BASE-001")!.instanceId;
  const prepared = { ...session, run: { ...session.run, combat: { ...combat, enemies: combat.enemies.map((enemy) => ({ ...enemy, hp: 1 })), drawPile: [...combat.drawPile.filter((id) => id !== strikeId), strikeId] } } };
  const saved = serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard");
  await page.addInitScript((value) => {
    localStorage.setItem("school-rg-run-v1", value);
    localStorage.setItem("school-rg-low-stimulus-v1", "1");
  }, saved);
  await page.goto("/");
  const actor = page.locator(".game-shell .ally-slot").first();
  await expect(actor).toHaveAttribute("data-rig-ready", "true");
  await page.evaluate(() => {
    const actorNode = document.querySelector<HTMLElement>(".game-shell .ally-slot")!;
    const groupNode = actorNode.parentElement!;
    const rigNode = actorNode.querySelector<HTMLElement>(".hero-rig")!;
    const inputNode = document.querySelector<HTMLInputElement>("#battle-typing-input")!;
    const removals: string[] = [];
    const tracked = [["actor", actorNode], ["ally-group", groupNode], ["rig", rigNode], ["input", inputNode]] as const;
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const removed of record.removedNodes) {
        for (const [name, node] of tracked) if (removed === node || removed.contains(node)) removals.push(name);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as unknown as { __rigContinuity: unknown }).__rigContinuity = { actorNode, groupNode, rigNode, inputNode, removals, observer };
  });
  const snapshot = () => page.evaluate(() => {
    const probe = (window as unknown as { __rigContinuity: { actorNode: HTMLElement; groupNode: Element; rigNode: HTMLElement; inputNode: HTMLInputElement; removals: string[] } }).__rigContinuity;
    return {
      removals: [...probe.removals], actorConnected: probe.actorNode.isConnected,
      groupConnected: probe.groupNode.isConnected, rigConnected: probe.rigNode.isConnected,
      inputConnected: probe.inputNode.isConnected,
      sameInput: probe.inputNode === document.querySelector("#battle-typing-input"),
      focused: document.activeElement === probe.inputNode,
    };
  });
  const input = page.locator("#battle-typing-input");
  await input.focus();
  const remainingBefore = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(180);
  const remainingAfter = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  expect(remainingAfter).toBeLessThan(remainingBefore);
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true, focused: true });
  await page.keyboard.type("st");
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true, focused: true });
  const remainingWithBuffer = Number(await page.locator(".time-track").getAttribute("aria-valuenow"));
  await page.clock.runFor(120);
  expect(Number(await page.locator(".time-track").getAttribute("aria-valuenow"))).toBeLessThan(remainingWithBuffer);
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true, focused: true });
  await page.keyboard.type("rike");
  await expect(actor).toHaveAttribute("data-actor-motion", "card-use");
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true });
  await page.clock.runFor(450);
  await expect(page.locator(".reward-panel")).toBeVisible();
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true });
  await page.getByRole("button", { name: "報酬を受け取らず進む" }).click();
  await expect(page.getByRole("heading", { name: "次の行き先を選ぶ" })).toBeVisible();
  await expect(page.locator(".game")).toHaveAttribute("data-effects", "quiet");
  expect(await snapshot()).toMatchObject({ removals: [], actorConnected: true, groupConnected: true, rigConnected: true, inputConnected: true, sameInput: true });
});
