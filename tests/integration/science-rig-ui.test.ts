import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { renderBattle, type BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

function render(motion: BattleView["motion"], quiet = false): HTMLElement {
  const run = structuredClone(validRun);
  run.clubId = "science-demo";
  const view: BattleView = {
    art: {
      stageUrl: "stage.png", heroUrl: "idle.png",
      heroPosesByClubId: { "science-demo": { idle: "idle.png", activate: "activate.png", hit: "hit.png" } },
      heroRigCandidateIds: ["science-demo"], enemyUrlById: { "enemy-paper": "enemy.png" },
    },
    baseTurnMs: 10_000, message: "", selectedDiscardId: null, selectedDebuff: null,
    motion, motionStartedAtMs: 1_000, animationNowMs: 1_190,
    potionModeKey: "F2", potionSlotLimit: 3, lowStimulus: quiet,
  };
  const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
  renderBattle(root, run, validContent, view);
  return root;
}

describe("science rig in combat", () => {
  it("retains a named actor and all eight layers through idle, use and hit", () => {
    for (const [motion, expected] of [[null, "idle"], ["hero", "card-use"], ["hit", "hit"]] as const) {
      const actor = render(motion).querySelector<HTMLElement>(".ally-slot")!;
      expect(actor.dataset.actorRig).toBe("science-v1");
      expect(actor.dataset.actorMotion).toBe(expected);
      expect(actor.querySelectorAll(".hero-rig .rig-part")).toHaveLength(8);
      expect(actor.querySelector(".hero-art")?.getAttribute("alt")).toContain("水野 さき");
      expect(actor.querySelector(".hero-motion-frame")).toBeNull();
    }
  });

  it("retains hit semantics in quiet mode", () => {
    const root = render("hit", true);
    expect(root.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    expect(root.querySelector(".ally-slot")?.getAttribute("data-actor-motion")).toBe("hit");
    expect(root.querySelector('[data-part="head-hit"]')).toBeTruthy();
  });
});
