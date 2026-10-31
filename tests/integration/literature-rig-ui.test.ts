import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { renderBattle, type BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

function render(motion: BattleView["motion"], quiet = false): HTMLElement {
  const run = structuredClone(validRun);
  run.clubId = "literature-demo";
  const view: BattleView = {
    art: {
      stageUrl: "stage.png", heroUrl: "idle.png",
      heroPosesByClubId: { "literature-demo": { idle: "idle.png", activate: "activate.png", hit: "hit.png" } },
      heroRigCandidateIds: ["literature-demo"], enemyUrlById: { "enemy-paper": "enemy.png" },
    },
    baseTurnMs: 10_000, message: "", selectedDiscardId: null, selectedDebuff: null,
    motion, motionStartedAtMs: 1_000, animationNowMs: 1_190,
    potionModeKey: "F2", potionSlotLimit: 3, lowStimulus: quiet,
  };
  const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
  renderBattle(root, run, validContent, view);
  return root;
}

describe("layered character in actual combat render", () => {
  it("keeps a named actor and six visual body parts across idle, card use and hit", () => {
    for (const [motion, expected] of [[null, "idle"], ["hero", "card-use"], ["hit", "hit"]] as const) {
      const root = render(motion);
      const actor = root.querySelector<HTMLElement>(".ally-slot")!;
      expect(actor.dataset.actorRig).toBe("literature-v1");
      expect(actor.dataset.actorMotion).toBe(expected);
      expect(actor.querySelectorAll(".hero-rig .rig-part")).toHaveLength(6);
      expect(actor.querySelector(".hero-art")?.getAttribute("alt")).toContain("吉野 こはる");
      expect(actor.querySelector(".hero-rig")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("preserves the same static semantic rig pose when low stimulus is selected", () => {
    const root = render("hit", true);
    expect(root.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    expect(root.querySelector(".ally-slot")?.getAttribute("data-actor-motion")).toBe("hit");
    expect(root.querySelector(".hero-rig [data-part='head']")).toBeTruthy();
  });
});
