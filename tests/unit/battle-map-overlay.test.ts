import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { battleMapOverlayMarkup } from "../../src/ui/battle-map-overlay.js";

describe("battle map overlay", () => {
  it("shows the actual current node and its connected successors without allowing route selection", () => {
    const start = createRunSession(42, "literature-demo", demoContent);
    const first = start.run.map.nodes.find((node) => node.id === start.run.map.currentNodeId)!;
    const entered = start.run.map.nodes.find((node) => node.id === first.nextIds[0])!;
    const session = { ...start, screen: "combat" as const, run: { ...start.run, map: { ...start.run.map, currentNodeId: entered.id } } };
    const current = session.run.map.nodes.find((node) => node.id === session.run.map.currentNodeId)!;
    const markup = battleMapOverlayMarkup(session);

    expect(markup).toContain(`data-node-id="${current.id}"`);
    expect(markup).toContain(`data-from="${current.id}"`);
    expect(markup).toMatch(new RegExp(`class="route-visited" data-from="${first.id}" data-to="${current.id}"`));
    for (const nextId of current.nextIds) {
      expect(markup).toContain(`data-to="${nextId}"`);
      expect(markup).toMatch(new RegExp(`class="battle-map-node [^"]* next" data-node-id="${nextId}"`));
    }
    expect(markup).toContain(`次の候補 ${current.nextIds.length}`);
    expect(markup).not.toContain('data-action="enter-node"');
    expect(markup).toContain('data-action="close-battle-map"');
  });
});
