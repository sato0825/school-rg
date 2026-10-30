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
  potionModeKey: "F2",
};

describe("potion target display", () => {
  it("marks the typed potion and asks for an enemy when two targets are alive", () => {
    const run = structuredClone(validRun);
    const content = structuredClone(validContent);
    content.potions[0]!.target = "enemy";
    content.potions[0]!.input.text = "ink";
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    run.combat!.potionControl = { active: true, typing: { buffer: "ink", candidateCardInstanceIds: ["potion-0"], selectedCardInstanceId: "potion-0", progress: 3, targetEnemyInstanceId: null, targetHandInstanceId: null } };
    const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
    renderBattle(root, run, content, view);
    expect(root.querySelector(".potion-buffer")?.textContent).toBe("対象の敵を選択");
    expect(root.querySelector(".potion.selected")?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelectorAll(".enemy-slot")).toHaveLength(2);
  });
});
