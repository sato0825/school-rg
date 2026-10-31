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

describe("dense enemy target roster", () => {
  for (const count of [3, 4, 5]) {
    it(`keeps ${count} enemies in one ordered, accessible target list`, () => {
      const run = structuredClone(validRun);
      const first = run.combat!.enemies[0]!;
      run.combat!.enemies = Array.from({ length: count }, (_, index) => ({ ...first, instanceId: `enemy-${index + 1}`, hp: first.maxHp - index * 2 }));
      run.combat!.statuses.enemies[`enemy-${count}`] = { poison: 2 };
      const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
      renderBattle(root, run, validContent, view);
      expect(root.querySelectorAll(".enemy-slot")).toHaveLength(count);
      const targets = root.querySelectorAll<HTMLButtonElement>(".enemy-roster-button");
      expect(targets).toHaveLength(count);
      expect(root.querySelector(".enemy-roster")?.getAttribute("aria-label")).toBe("敵の一覧");
      targets.forEach((target, index) => {
        expect(target.dataset.id).toBe(`enemy-${index + 1}`);
        expect(target.getAttribute("aria-label")).toContain(`敵 ${index + 1}`);
        expect(target.querySelector(".enemy-roster-bar")?.getAttribute("aria-valuenow")).toBe(String(first.maxHp - index * 2));
        expect(root.querySelectorAll(".enemy-slot")[index]?.tagName).toBe("DIV");
      });
      expect(targets[count - 1]?.getAttribute("aria-label")).toContain("毒 2");
      expect(targets[count - 1]?.querySelector(".enemy-detail")?.textContent).toContain("次の行動");
    });
  }
});
