import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

for (const width of [1024, 1440] as const) {
  test(`provisional profiles are distinct from type and preserve the live hand/reward at ${width}px`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    const base = createRunSession(42, "kendo-demo", demoContent);
    const start: MapNode = { id: "profile-start", act: 1, floor: 0, kind: "start", nextIds: ["profile-fight"] };
    const fight: MapNode = { id: "profile-fight", act: 1, floor: 1, kind: "combat", nextIds: [] };
    const entered = enterRunNode({ ...base, run: { ...base.run, map: { currentNodeId: start.id, nodes: [start, fight] } }, completedNodeIds: [start.id] }, fight.id,
      demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const combat = entered.run.combat!;
    const occasionalId = combat.cards[0]!.instanceId;
    const scarceId = combat.cards[1]!.instanceId;
    const prepared = { ...entered, run: { ...entered.run, combat: { ...combat,
      cards: combat.cards.map((card) => card.instanceId === occasionalId ? { ...card, cardId: "KEN-009" } : card.instanceId === scarceId ? { ...card, cardId: "KEN-011" } : card),
      drawPile: [...combat.drawPile.filter((id) => id !== occasionalId && id !== scarceId), occasionalId, scarceId],
    } } };
    await page.addInitScript((value) => { if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", value); }, serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard"));
    await page.goto("/");
    await expect(page.locator(".game-shell[data-screen=combat] .hand>.card[data-profile]")).toHaveCount(5);
    await expect(page.locator(".hand>.card[data-profile=occasional]")).toHaveCount(1);
    await expect(page.locator(".hand>.card[data-profile=scarce]")).toHaveCount(1);
    const handFit = await page.locator(".hand>.card[data-profile]").evaluateAll((cards) => cards.map((card) => {
      const badge = card.querySelector(".card-profile")!.getBoundingClientRect();
      const kind = card.querySelector(".card-kind")!.getBoundingClientRect();
      const word = card.querySelector(".card-word")!.getBoundingClientRect();
      const art = card.querySelector(".card-art")!.getBoundingClientRect();
      const effect = card.querySelector(".card-effect")!.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      return { word: card.querySelector(".card-word")!.textContent, badgeVsKind: badge.left - kind.right, badgeVsRight: bounds.right - badge.right,
        badgeVsArt: art.top - badge.bottom, artVsWord: word.top - art.bottom, effectVsBottom: bounds.bottom - effect.bottom };
    }));
    expect(handFit.every((fit) => fit.badgeVsKind >= -1 && fit.badgeVsRight >= 13 && fit.badgeVsArt >= -1
      && fit.artVsWord >= -2 && fit.effectVsBottom >= 3), JSON.stringify(handFit)).toBe(true);
    await expect(page.locator(".hand>.card[data-profile]").first()).toHaveAttribute("aria-label", /仮の入手頻度/);
    await expect(page.locator(".hand>.card[data-profile]").first().locator(".card-profile")).toHaveAttribute("aria-label", /仮の入手頻度/);
    if (process.env.SCHOOL_RG_CAPTURE_PROFILE === "1") {
      await page.locator(".hand .card-art img").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
      await page.screenshot({ path: `docs/art/previews/issue327-combat-${width}-candidate-v1.png` });
    }

    const rewardSession = { ...entered, screen: "reward" as const, rewardCardIds: ["BASE-001", "KEN-009", "KEN-011"], run: { ...entered.run, combat: { ...entered.run.combat!, phase: "WON" as const } } };
    await page.close();
    const rewardPage = await page.context().newPage();
    await rewardPage.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await rewardPage.addInitScript((value) => localStorage.setItem("school-rg-run-v1", value), serializeRunSession(rewardSession, demoContent, { nowMs: () => 0 }, () => "discard"));
    await rewardPage.goto("/");
    const rewards = rewardPage.locator(".game-shell[data-screen=reward] .reward-card[data-profile]");
    await expect(rewards).toHaveCount(3);
    for (const [index, profile] of ["frequent", "occasional", "scarce"].entries()) {
      await expect(rewards.nth(index)).toHaveAttribute("data-profile", profile);
      await expect(rewards.nth(index)).toHaveAttribute("aria-label", /仮の入手頻度/);
    }
    const rewardFit = await rewards.evaluateAll((cards) => cards.every((card) => {
      const badge = card.querySelector(".card-profile")!.getBoundingClientRect();
      const art = card.querySelector(".card-art")!.getBoundingClientRect();
      const effect = card.querySelector(".offer-description")!.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      return badge.left >= bounds.left && badge.right <= bounds.right && badge.bottom <= art.top + 1
        && effect.bottom <= bounds.bottom - 3;
    }));
    expect(rewardFit).toBe(true);
    if (process.env.SCHOOL_RG_CAPTURE_PROFILE === "1") {
      await rewardPage.locator(".reward-card .card-art img").evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
      await rewardPage.screenshot({ path: `docs/art/previews/issue327-reward-${width}-candidate-v1.png` });
    }
    await rewardPage.evaluate(() => localStorage.setItem("school-rg-low-stimulus-v1", "1"));
    await rewardPage.reload();
    await expect(rewardPage.locator(".reward-card[data-profile] .card-profile")).toHaveCount(3);
    expect(await rewardPage.locator(".reward-card[data-profile] .card-profile").evaluateAll((badges) => badges.every((badge) => badge.getAnimations().length === 0))).toBe(true);
  });
}
