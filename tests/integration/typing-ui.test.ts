import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import type { RunState } from "../../src/domain/schema.js";
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
  potionSlotLimit: 3,
};

function battle(run: RunState): HTMLElement {
  const root = new JSDOM("<div id='game'></div>").window.document.getElementById("game")!;
  renderBattle(root, run, validContent, view);
  return root;
}

describe("typing selection in the battle view", () => {
  it("shows every same-name candidate and the chosen enemy separately", () => {
    const run = structuredClone(validRun);
    run.combat!.cards.push({ instanceId: "combat-2", cardId: "card-strike", upgraded: false });
    run.combat!.cards.push({ instanceId: "combat-3", cardId: "card-draft", upgraded: false });
    run.combat!.hand.push("combat-2", "combat-3");
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    run.combat!.typing = { buffer: "str", candidateCardInstanceIds: ["combat-1", "combat-2"], selectedCardInstanceId: null, progress: 3, targetEnemyInstanceId: "enemy-2", targetHandInstanceId: null };

    const pending = battle(run);
    expect(pending.querySelectorAll(".card.candidate")).toHaveLength(2);
    expect(pending.querySelector("[data-id='combat-3']")?.classList.contains("dim")).toBe(true);
    expect(pending.querySelector(".typing-hint")?.textContent).toContain("候補 2枚");
    expect(pending.querySelector("[data-id='enemy-2']")?.getAttribute("aria-pressed")).toBe("true");
    expect(pending.querySelector("[data-id='enemy-2'] .enemy-hud")?.textContent).toContain("対象:");
    expect(pending.querySelector("[data-id='enemy-1']")?.getAttribute("aria-pressed")).toBe("false");

    run.combat!.typing.selectedCardInstanceId = "combat-2";
    const selected = battle(run);
    expect(selected.querySelector("[data-id='combat-2']")?.getAttribute("aria-pressed")).toBe("true");
    expect(selected.querySelector("[data-id='combat-1']")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("asks for an enemy when a typed attack still has no target", () => {
    const run = structuredClone(validRun);
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    run.combat!.typing.targetEnemyInstanceId = null;
    run.combat!.typing.buffer = "strike";
    expect(battle(run).querySelector(".typing-hint")?.textContent).toBe("攻撃対象の敵を選択");
  });
});
