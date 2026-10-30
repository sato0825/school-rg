import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { availableRunNodes, chooseRunTreasure, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import { parseRunState } from "../../src/domain/validate.js";

const treasureMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 0, shop: 0, rest: 0, treasure: 1 } };
const clock = { nowMs: () => 1_000 };
const disposition = () => "discard" as const;

function enter(seed = 42) {
  const start = createRunSession(seed, "literature-demo", demoContent, treasureMap);
  const nodeId = availableRunNodes(start)[0]!.id;
  return enterRunNode(start, nodeId, demoContent, demoEnemyAi, demoEncounterTable);
}

describe("treasure rewards", () => {
  it("generates stable offers and preserves them through save and restore", () => {
    const a = enter();
    const b = enter();
    expect(a.screen).toBe("treasure");
    expect(a.run.treasure?.offers).toEqual(b.run.treasure?.offers);
    expect(a.run.rngState).toBe(b.run.rngState);
    expect(a.run.treasure?.offers.some((offer) => offer.kind === "relic")).toBe(true);
    expect(a.run.treasure?.offers.some((offer) => offer.kind === "potion")).toBe(true);
    expect(deserializeRunSession(serializeRunSession(a, demoContent, clock, disposition), demoContent, clock)).toEqual(a);
  });

  it("claims a relic even when already held, and completes the node only once", () => {
    const a = enter();
    const offer = a.run.treasure!.offers.find((item) => item.kind === "relic")!;
    const alreadyOwned = { ...a, run: { ...a.run, relicIds: [offer.contentId] } };
    const claimed = chooseRunTreasure(alreadyOwned, offer.offerId, demoContent, DEFAULT_GAME_CONFIG);
    expect(claimed.run.relicIds.filter((id) => id === offer.contentId)).toHaveLength(2);
    expect(claimed.run.treasure).toBeNull();
    expect(claimed.screen).toBe("map");
    expect(claimed.completedNodeIds).toContain(a.run.map.currentNodeId);
    expect(() => chooseRunTreasure(claimed, offer.offerId, demoContent)).toThrow(/expected treasure screen/);
    expect(() => enterRunNode(claimed, a.run.map.currentNodeId, demoContent, demoEnemyAi, demoEncounterTable)).toThrow(/not available/);
  });

  it("blocks a potion at full slots without consuming the treasure, then permits skipping", () => {
    const a = enter();
    const offer = a.run.treasure!.offers.find((item) => item.kind === "potion")!;
    const collected = chooseRunTreasure(a, offer.offerId, demoContent);
    expect(collected.run.potionIds.at(-1)).toBe(offer.contentId);
    const full = { ...a, run: { ...a.run, potionIds: ["potion-time", "potion-time", "potion-time"] } };
    expect(() => chooseRunTreasure(full, offer.offerId, demoContent)).toThrow(/slots are full/);
    expect(full.run.treasure).toEqual(a.run.treasure);
    const skipped = chooseRunTreasure(full, null, demoContent);
    expect(skipped.run.potionIds).toHaveLength(3);
    expect(skipped.run.treasure).toBeNull();
  });

  it("rejects unknown offers and inconsistent saved treasure state", () => {
    const a = enter();
    expect(() => chooseRunTreasure(a, "missing", demoContent)).toThrow(/unknown treasure offer/);
    const broken = { ...a.run, treasure: { ...a.run.treasure!, offers: [{ offerId: "x", kind: "relic" as const, contentId: "missing" }] } };
    expect(() => parseRunState(broken, demoContent)).toThrow(/Unregistered ID/);
    const overlap = { ...a.run, treasure: a.run.treasure, shop: { nodeId: a.run.map.currentNodeId, offers: [], removalUsed: false } };
    expect(() => parseRunState(overlap, demoContent)).toThrow(/Treasure cannot overlap/);
  });
});
