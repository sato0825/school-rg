import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { battleMapOverlayMarkup } from "../../src/ui/battle-map-overlay.js";

describe("battle map overlay", () => {
  it("shows the actual current node and its connected successors without allowing route selection", () => {
    const start = createRunSession(42, "literature-demo", demoContent, { floorsPerAct: 2, lanes: 4 });
    const session = { ...start, screen: "combat" as const };
    const current = session.run.map.nodes.find((node) => node.id === session.run.map.currentNodeId)!;
    const markup = battleMapOverlayMarkup(session);

    expect(markup).toContain(`data-node-id="${current.id}"`);
    expect(markup).toContain(`data-from="${current.id}"`);
    for (const nextId of current.nextIds) {
      expect(markup).toContain(`data-to="${nextId}"`);
      expect(markup).toMatch(new RegExp(`class="battle-map-node [^"]* next" data-node-id="${nextId}"`));
    }
    expect(markup).toContain(`次の候補 ${current.nextIds.length}`);
    expect(markup).not.toContain('data-action="enter-node"');
    expect(markup).toContain('data-action="close-battle-map"');
  });
});
