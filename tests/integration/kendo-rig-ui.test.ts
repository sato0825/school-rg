import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { renderBattle, type BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

function render(motion: BattleView["motion"], action: "attack" | "support" = "attack", quiet = false, cardId = "KEN-003"): HTMLElement {
  const run = structuredClone(validRun);
  run.clubId = "kendo-demo";
  const view: BattleView = {
    art: {
      stageUrl: "stage.png", heroUrl: "idle.png",
      heroPosesByClubId: { "kendo-demo": { idle: "idle.png", activate: "activate.png", hit: "hit.png" } },
      heroRigCandidateIds: ["kendo-demo"], enemyUrlById: { "enemy-paper": "enemy.png" },
    },
    baseTurnMs: 10_000, message: "", selectedDiscardId: null, selectedDebuff: null,
    motion, motionStartedAtMs: 1_000, animationNowMs: 1_190,
    cardFx: motion === "hero" ? { kind: action, cardId, sourceXPercent: 22, targetXPercents: [72], startedAtMs: 1_000 } : null,
    potionModeKey: "F2", potionSlotLimit: 3, lowStimulus: quiet,
  };
  const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
  renderBattle(root, run, validContent, view);
  return root;
}

describe("Kendo deck and visual actor in combat render", () => {
  it("keeps the named seven-layer actor for idle, guard, strike, and hit", () => {
    for (const [motion, action, expected] of [[null, "attack", "idle"], ["hero", "support", "card-use"], ["hero", "attack", "card-use"], ["hit", "attack", "hit"]] as const) {
      const actor = render(motion, action).querySelector<HTMLElement>(".ally-slot")!;
      expect(actor.dataset.actorRig).toBe("kendo-v1");
      expect(actor.dataset.actorMotion).toBe(expected);
      expect(actor.querySelectorAll(".hero-rig .rig-part")).toHaveLength(8);
      expect(actor.querySelector(".hero-art")?.getAttribute("alt")).toContain("佐伯 りつ");
      expect(actor.querySelector(".hero-rig")?.getAttribute("aria-hidden")).toBe("true");
      if (motion === "hero") expect(actor.dataset.kendoAction).toBe(action === "support" ? "guard" : "strike");
    }
  });

  it("keeps a quiet state and readable hit expression", () => {
    const root = render("hit", "attack", true);
    expect(root.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    expect(root.querySelector(".hero-rig [data-part='head-hit']")).toBeTruthy();
  });

  it("selects separate counter and finisher poses from the resolved Kendo card", () => {
    expect(render("hero", "support", false, "BASE-013").querySelector(".ally-slot")?.getAttribute("data-kendo-action")).toBe("counter");
    expect(render("hero", "attack", false, "KEN-004").querySelector(".ally-slot")?.getAttribute("data-kendo-action")).toBe("counter");
    expect(render("hero", "attack", false, "KEN-006").querySelector(".ally-slot")?.getAttribute("data-kendo-action")).toBe("finisher");
  });
});
