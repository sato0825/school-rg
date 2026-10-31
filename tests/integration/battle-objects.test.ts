import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { renderBattle, type BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

const view: BattleView = {
  art: { stageUrl: "stage.png", heroUrl: "hero.png", enemyUrlById: { "enemy-paper": "enemy.png" } },
  baseTurnMs: 10_000,
  message: "",
  selectedDiscardId: null,
  selectedDebuff: null,
  motion: null,
  motionStartedAtMs: null,
  animationNowMs: 0,
  potionModeKey: "F2",
  potionSlotLimit: 3,
  lowStimulus: false,
};

describe("combat objects", () => {
  it("shows piles as distinct objects and statuses beside both sides without changing counts", () => {
    const run = structuredClone(validRun);
    run.combat!.cards.push(
      { instanceId: "draw-1", cardId: "card-draft", upgraded: false },
      { instanceId: "draw-2", cardId: "card-strike", upgraded: false },
      { instanceId: "discard-1", cardId: "card-draft", upgraded: false },
      { instanceId: "exhaust-1", cardId: "card-strike", upgraded: false },
    );
    run.combat!.drawPile = ["draw-1", "draw-2"];
    run.combat!.discardPile = ["discard-1"];
    run.combat!.exhaustPile = ["exhaust-1"];
    run.combat!.statuses.player = { strength: 2, poison: 1 };
    run.combat!.statuses.enemies["enemy-1"] = { weak: 2 };
    const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
    renderBattle(root, run, validContent, view);

    expect([...root.querySelectorAll(".pile-token")].map((node) => [node.getAttribute("data-pile"), node.getAttribute("aria-label")])).toEqual([
      ["draw", "山札 2枚"], ["discard", "捨て札 1枚"], ["exhaust", "除外 1枚"],
    ]);
    expect(root.querySelectorAll(".topbar .status-chip")).toHaveLength(2);
    expect(root.querySelector('.topbar .status-chip[data-status="strength"]')?.getAttribute("aria-label")).toContain("力 2。攻撃の基礎値に加算");
    expect(root.querySelector('.enemy-status .status-chip[data-status="weak"]')?.getAttribute("aria-label")).toContain("弱体 2。攻撃の威力が低下");
    expect(root.querySelector(".hero-nameplate")?.textContent).toBe("Synthetic Club A");
    expect(root.querySelector(".card-kind")?.textContent).toBe("攻撃");
    expect(run.combat!.drawPile).toEqual(["draw-1", "draw-2"]);
  });

  it("keeps a status summary attached to the selected enemy in a dense formation", () => {
    const run = structuredClone(validRun);
    const enemy = run.combat!.enemies[0]!;
    run.combat!.enemies = Array.from({ length: 4 }, (_, index) => ({ ...enemy, instanceId: `enemy-${index + 1}` }));
    run.combat!.statuses.enemies["enemy-3"] = { poison: 3, vulnerable: 1 };
    const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
    renderBattle(root, run, validContent, view);

    const target = root.querySelector<HTMLElement>('.enemy-roster-button[data-id="enemy-3"]')!;
    expect(target.getAttribute("aria-label")).toContain("毒 3");
    expect(target.querySelectorAll(".enemy-detail-status .status-chip")).toHaveLength(2);
    expect(target.querySelector('[data-status="vulnerable"]')?.getAttribute("aria-label")).toContain("脆弱 1。受ける攻撃の威力が増加");
  });
});
