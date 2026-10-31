// @vitest-environment jsdom
import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import type { RunState } from "../../src/domain/schema.js";
import type { BattleView } from "../../src/ui/battle-view.js";
import { demoBattleArt } from "../../src/ui/demo-art.js";
import { GameShell } from "../../src/ui/game-shell.js";

it("keeps the plate within a node and switches it when the confirmed current node changes", () => {
  const root = document.createElement("div");
  const initial = createRunSession(42, "literature-demo", demoContent).run;
  const shell = new GameShell(root, initial, { art: demoBattleArt } as BattleView, demoContent);
  const stage = root.querySelector<HTMLElement>(".stage")!;
  const panel = () => {
    const rendered = document.createElement("div");
    rendered.innerHTML = '<div class="map-panel"></div>';
    return rendered;
  };
  const withNode = (run: RunState, act: number, floor: number): RunState => {
    const node = run.map.nodes.find((item) => item.act === act && item.floor === floor)!;
    return { ...run, act: node.act, map: { ...run.map, currentNodeId: node.id } };
  };
  expect(stage.dataset.stagePlace).toBe("school-atrium");
  const firstUrl = stage.style.backgroundImage;
  shell.showOverlay("map", initial, panel());
  expect(stage.style.backgroundImage).toBe(firstUrl);
  const library = withNode(initial, 1, 4);
  shell.showOverlay("map", library, panel());
  expect(stage.dataset.stagePlace).toBe("school-library");
  expect(stage.dataset.stageArt).toBe("act1-paper-library-candidate-v2");
  expect(stage.style.backgroundImage).not.toBe(firstUrl);
  const libraryUrl = stage.style.backgroundImage;
  const reward = document.createElement("div");
  reward.innerHTML = '<div class="reward-panel"></div>';
  shell.showOverlay("reward", library, reward);
  expect(stage.style.backgroundImage).toBe(libraryUrl);
  expect(stage.dataset.stagePlace).toBe("school-library");
  shell.showOverlay("map", withNode(initial, 2, 0), panel());
  expect(stage.dataset.stagePlace).toBe("science-entry");
  expect(stage.dataset.act).toBe("2");
});
