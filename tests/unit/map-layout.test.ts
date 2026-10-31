import { describe, expect, it } from "vitest";
import type { MapNode } from "../../src/domain/schema.js";
import { mapRouteSegments } from "../../src/ui/map-layout.js";

describe("map route projection", () => {
  it("keeps an Act boundary connected without making display data a route rule", () => {
    const boss: MapNode = { id: "a1-boss", act: 1, floor: 12, kind: "boss", nextIds: ["a2-start"] };
    const start: MapNode = { id: "a2-start", act: 2, floor: 0, kind: "start", nextIds: ["a2-fight"] };
    const fight: MapNode = { id: "a2-fight", act: 2, floor: 1, kind: "combat", nextIds: [] };
    const nodes = [boss, start, fight];
    const floors = nodes.map(({ act, floor }) => ({ act, floor }));
    const segments = mapRouteSegments(nodes, floors, boss.id, new Set([start.id]), new Set([boss.id]));
    expect(segments.map(({ fromId, toId, state }) => [fromId, toId, state])).toEqual([
      [boss.id, start.id, "available"],
      [start.id, fight.id, "future"],
    ]);
    expect(boss.nextIds).toEqual(["a2-start"]);
  });
});
