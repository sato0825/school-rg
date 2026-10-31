import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameShell } from "../../src/ui/game-shell.js";
import type { BattleView } from "../../src/ui/battle-view.js";
import { validContent, validRun } from "../fixtures/domain.js";

afterEach(() => vi.unstubAllGlobals());

describe("GameShell display mode", () => {
  it("carries the chosen quiet mode onto map and reward overlays created before combat", () => {
    const dom = new JSDOM("<div id='game'></div>", { url: "http://localhost/" });
    vi.stubGlobal("document", dom.window.document);
    const root = dom.window.document.getElementById("game")!;
    const view: BattleView = {
      art: { stageUrl: "stage.png", heroUrl: "idle.png" },
      baseTurnMs: 10_000, message: "", selectedDiscardId: null, selectedDebuff: null,
      motion: null, motionStartedAtMs: null, animationNowMs: 0,
      potionModeKey: "F2", potionSlotLimit: 3, lowStimulus: true,
    };
    const shell = new GameShell(root, structuredClone(validRun), view, validContent);
    expect(shell.element.dataset.effects).toBe("quiet");
    for (const screen of ["map", "reward"] as const) {
      const rendered = dom.window.document.createElement("div");
      rendered.innerHTML = `<section class="${screen}-panel"></section>`;
      shell.showOverlay(screen, structuredClone(validRun), rendered);
      expect(shell.element.dataset.effects).toBe("quiet");
    }
  });
});
