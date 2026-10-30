import { describe, expect, it } from "vitest";
import { createDemoBattle } from "../../src/content/demo-battle.js";
import { availableNextNodes, generateRunMap, moveToConnectedNode } from "../../src/domain/map-generation.js";

describe("seeded three-Act map DAG", () => {
  it("keeps all nodes reachable, live and replayable across 1000 seeds", () => {
    for (let seed = 0; seed < 1_000; seed++) {
      const map = generateRunMap(seed);
      expect(generateRunMap(seed)).toEqual(map);
      const byId = new Map(map.nodes.map((node) => [node.id, node]));
      expect(byId.size).toBe(map.nodes.length);
      const reached = new Set<string>();
      const stack = [map.currentNodeId];
      while (stack.length) {
        const nextId = stack.pop()!;
        if (reached.has(nextId)) continue;
        reached.add(nextId);
        const node = byId.get(nextId)!;
        for (const targetId of node.nextIds) {
          const target = byId.get(targetId);
          expect(target).toBeDefined();
          expect(target!.act > node.act || (target!.act === node.act && target!.floor > node.floor)).toBe(true);
          stack.push(targetId);
        }
      }
      expect(reached.size).toBe(map.nodes.length);
      const terminal = map.nodes.filter((node) => node.nextIds.length === 0);
      expect(terminal.map((node) => [node.act, node.kind])).toEqual([[3, "boss"]]);
      const canReachEnd = new Set(terminal.map((node) => node.id));
      for (let index = map.nodes.length - 1; index >= 0; index--) {
        const node = map.nodes[index]!;
        if (node.nextIds.some((nextId) => canReachEnd.has(nextId))) canReachEnd.add(node.id);
      }
      expect(canReachEnd.size).toBe(map.nodes.length);
      expect(map.nodes.filter((node) => node.kind === "boss").map((node) => node.act)).toEqual([1, 2, 3]);
    }
    expect(generateRunMap(1).nodes).not.toEqual(generateRunMap(2).nodes);
  }, 20_000);

  it("rejects invalid generation settings", () => {
    const valid = { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
    expect(generateRunMap(7, valid).nodes).toHaveLength(3 * (2 * 3 + 2));
    expect(() => generateRunMap(7, { ...valid, lanes: 1 })).toThrow(RangeError);
    expect(() => generateRunMap(7, { ...valid, kindWeights: { ...valid.kindWeights, combat: 0 } })).toThrow(RangeError);
    expect(() => generateRunMap(7, { ...valid, kindWeights: { ...valid.kindWeights, event: -1 } })).toThrow(RangeError);
  });

  it("permits only listed next nodes and blocks movement during combat", () => {
    const map = generateRunMap(42, { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } });
    const run = { ...createDemoBattle(), map: { nodes: map.nodes, currentNodeId: map.currentNodeId }, combat: null };
    expect(availableNextNodes(run.map).map((node) => node.id)).toEqual(map.nodes[0]!.nextIds);
    expect(() => moveToConnectedNode(run, "a1-f3-n0")).toThrow(/not connected/);
    const moved = moveToConnectedNode(run, map.nodes[0]!.nextIds[0]!);
    expect(moved.map.currentNodeId).toBe(map.nodes[0]!.nextIds[0]);
    expect(run.map.currentNodeId).toBe(map.currentNodeId);
    expect(() => moveToConnectedNode({ ...run, combat: createDemoBattle().combat }, map.nodes[0]!.nextIds[0]!)).toThrow(/combat/);
    const actTwoStart = map.nodes.find((node) => node.act === 2 && node.kind === "start")!;
    const actOneBoss = map.nodes.find((node) => node.act === 1 && node.kind === "boss")!;
    expect(moveToConnectedNode({ ...run, map: { ...run.map, currentNodeId: actOneBoss.id } }, actTwoStart.id).act).toBe(2);
  });
});
