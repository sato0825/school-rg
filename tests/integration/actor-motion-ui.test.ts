import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { renderBattle, type BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

function render(motion: BattleView["motion"], quiet = false): HTMLElement {
  const run = structuredClone(validRun);
  run.clubId = "literature-demo";
  const view: BattleView = {
    art: { stageUrl: "stage.png", heroUrl: "hero.png", heroPosesByClubId: { "literature-demo": { idle: "idle.png", activate: "activate.png", hit: "hit.png" } }, enemyUrlById: { "enemy-paper": "enemy.png" } },
    baseTurnMs: 10_000, message: "", selectedDiscardId: null, selectedDebuff: null,
    motion, motionStartedAtMs: 1_000, animationNowMs: 1_190,
    potionModeKey: "F2", potionSlotLimit: 3, lowStimulus: quiet,
  };
  const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
  renderBattle(root, run, validContent, view);
  return root;
}

describe("literature actor candidate in live battle markup", () => {
  it("keeps the idle canvas and named actor while overlaying card-use and hit poses", () => {
    const card = render("hero");
    const slot = card.querySelector<HTMLElement>(".ally-slot")!;
    expect(slot.dataset.actorMotion).toBe("card-use");
    expect(slot.style.getPropertyValue("--actor-delay")).toBe("-190ms");
    expect(slot.querySelector<HTMLImageElement>(".hero-art")?.src).toContain("activate.png");
    expect(slot.querySelector<HTMLImageElement>(".hero-motion-frame")?.src).toContain("idle.png");
    expect(slot.querySelector(".hero-art")?.getAttribute("alt")).toContain("吉野 こはる");
    expect(slot.querySelector(".hero-motion-frame")?.getAttribute("aria-hidden")).toBe("true");
    expect(render("hit").querySelector<HTMLImageElement>(".hero-art")?.src).toContain("hit.png");
    expect(render(null).querySelector(".hero-motion-frame")).toBeNull();
  });

  it("keeps the same pose as a still in quiet mode", () => {
    const quiet = render("hero", true);
    expect(quiet.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    expect(quiet.querySelector(".ally-slot")?.getAttribute("data-actor-motion")).toBe("card-use");
    expect(quiet.querySelector(".hero-motion-frame")).toBeNull();
  });
});
