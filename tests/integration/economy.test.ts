import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { DEFAULT_ECONOMY_OPTIONS } from "../../src/domain/economy.js";
import { availableRunNodes, buyRunShopCard, buyRunShopPotion, buyRunShopRelic, createRunSession, enterRunNode, leaveRunShop, removeRunShopCard, useRunRest } from "../../src/domain/run-flow.js";
import { serializeRunSession, deserializeRunSession } from "../../src/domain/save.js";
import { parseRunState } from "../../src/domain/validate.js";

const shopMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 0, shop: 1, rest: 0, treasure: 0 } };
const restMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 0, shop: 0, rest: 1, treasure: 0 } };

describe("shop and rest nodes", () => {
  it("blocks unaffordable and duplicate buys, and preserves purchases in saved run state", () => {
    const start = createRunSession(42, "literature-demo", demoContent, shopMap);
    const shop = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    expect(shop.screen).toBe("shop");
    expect(shop.run.shop?.offers).toHaveLength(3);
    expect(shop.run.gold).toBe(50);
    expect(createRunSession(42, "literature-demo", demoContent, shopMap)).toEqual(start);
    const offerId = shop.run.shop!.offers[0]!.offerId;
    const bought = buyRunShopCard(shop, offerId);
    expect(bought.run.gold).toBe(10);
    expect(bought.run.deck).toHaveLength(11);
    expect(bought.run.shop?.offers[0]?.purchased).toBe(true);
    expect(() => buyRunShopCard(bought, offerId)).toThrow(/already purchased/);
    expect(() => buyRunShopCard(bought, shop.run.shop!.offers[1]!.offerId)).toThrow(/insufficient gold/);
    expect(parseRunState(JSON.parse(JSON.stringify(bought.run)), demoContent)).toEqual(bought.run);
    const left = leaveRunShop(bought);
    expect(left.screen).toBe("map");
    expect(left.run.shop).toBeNull();
    expect(left.completedNodeIds).toContain(shop.run.map.currentNodeId);
  });

  it("removes only a selected deck card once at an active shop", () => {
    const economy = { ...DEFAULT_ECONOMY_OPTIONS, startingGold: 200 };
    const start = createRunSession(7, "literature-demo", demoContent, shopMap, economy);
    const shop = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable, economy);
    expect(() => removeRunShopCard(shop, "missing-card")).toThrow(/no card removal target/);
    const target = shop.run.deck[0]!.instanceId;
    const removed = removeRunShopCard(shop, target);
    expect(removed.run.deck.some((card) => card.instanceId === target)).toBe(false);
    expect(removed.run.gold).toBe(125);
    expect(() => removeRunShopCard(removed, shop.run.deck[1]!.instanceId)).toThrow(/already used/);
    expect(parseRunState(removed.run, demoContent)).toEqual(removed.run);
  });

  it("sells deterministic relic and potion stock and preserves mixed purchases", () => {
    const economy = { ...DEFAULT_ECONOMY_OPTIONS, startingGold: 200 };
    const start = createRunSession(42, "literature-demo", demoContent, shopMap, economy);
    const nodeId = availableRunNodes(start)[0]!.id;
    const shop = enterRunNode(start, nodeId, demoContent, demoEnemyAi, demoEncounterTable, economy);
    expect(enterRunNode(start, nodeId, demoContent, demoEnemyAi, demoEncounterTable, economy)).toEqual(shop);
    expect(shop.run.shop?.relicOffers).toHaveLength(1);
    expect(shop.run.shop?.potionOffers).toHaveLength(1);
    const relic = shop.run.shop!.relicOffers[0]!;
    const potion = shop.run.shop!.potionOffers[0]!;
    const withRelic = buyRunShopRelic(shop, relic.offerId, demoContent);
    expect(withRelic.run.relicIds).toContain(relic.contentId);
    expect(withRelic.run.gold).toBe(110);
    expect(() => buyRunShopRelic(withRelic, relic.offerId, demoContent)).toThrow(/already purchased/);
    const withPotion = buyRunShopPotion(withRelic, potion.offerId, demoContent);
    expect(withPotion.run.potionIds).toContain(potion.contentId);
    expect(withPotion.run.gold).toBe(85);
    const withCard = buyRunShopCard(withPotion, shop.run.shop!.offers[0]!.offerId);
    expect(withCard.run.gold).toBe(45);
    expect(withCard.run.deck).toHaveLength(11);
    const saved = serializeRunSession(withCard, demoContent, { nowMs: () => 0 }, () => "discard");
    const restored = deserializeRunSession(saved, demoContent, { nowMs: () => 1_000 });
    expect(restored).toEqual(withCard);
    expect(parseRunState(restored.run, demoContent)).toEqual(restored.run);

    const full = { ...shop, run: { ...shop.run, potionIds: ["potion-time", "potion-heal", "potion-ink"] } };
    expect(() => buyRunShopPotion(full, potion.offerId, demoContent)).toThrow(/slots are full/);
    const poor = { ...shop, run: { ...shop.run, gold: 0 } };
    expect(() => buyRunShopPotion(poor, potion.offerId, demoContent)).toThrow(/insufficient gold/);
    expect(() => buyRunShopRelic(poor, relic.offerId, demoContent)).toThrow(/insufficient gold/);
  });

  it("loads older card-only shop saves with empty item stock", () => {
    const start = createRunSession(42, "literature-demo", demoContent, shopMap);
    const shop = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const old = JSON.parse(serializeRunSession(shop, demoContent, { nowMs: () => 0 }, () => "discard"));
    delete old.session.run.shop.relicOffers;
    delete old.session.run.shop.potionOffers;
    const restored = deserializeRunSession(JSON.stringify(old), demoContent, { nowMs: () => 1_000 });
    expect(restored.run.shop?.relicOffers).toEqual([]);
    expect(restored.run.shop?.potionOffers).toEqual([]);
  });

  it("offers one healing or upgrade action at a rest node", () => {
    const start = createRunSession(9, "literature-demo", demoContent, restMap);
    const rest = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    expect(rest.screen).toBe("rest");
    const injured = { ...rest, run: { ...rest.run, player: { ...rest.run.player, hp: 17 } } };
    const healed = useRunRest(injured, { kind: "heal" });
    expect(healed.run.player.hp).toBe(29);
    expect(healed.screen).toBe("map");
    expect(() => useRunRest(healed, { kind: "heal" })).toThrow(/rest screen/);
    const cardId = rest.run.deck[0]!.instanceId;
    expect(() => useRunRest(rest, { kind: "upgrade", cardInstanceId: "missing-card" })).toThrow(/no upgrade target/);
    const upgraded = useRunRest(rest, { kind: "upgrade", cardInstanceId: cardId });
    expect(upgraded.run.deck[0]?.upgraded).toBe(true);
    expect(parseRunState(upgraded.run, demoContent)).toEqual(upgraded.run);
  });
});
