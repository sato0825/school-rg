import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { openShop } from "../../src/domain/economy.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import type { RunState } from "../../src/domain/schema.js";
import { recordCombatPotionUses, recordContentAcquisitions, recordContentChoice, recordContentOffers } from "../../src/ui/playtest-exposure.js";
import { parsePlaytestRecord, resumePlaytest, startPlaytest, visitPlaytestNode } from "../../src/ui/playtest-metrics.js";

const session = createRunSession(42, "science-demo", demoContent);
const node = session.run.map.nodes.find((item) => item.id === session.run.map.currentNodeId)!;
const tracker = visitPlaytestNode(startPlaytest(session.run, "exposure", 0), node);

describe("content exposure measurement", () => {
  it("records each reward candidate once across redraw and save, and records a real acquisition", () => {
    const reward = { ...session, screen: "reward" as const, rewardCardIds: ["card-a", "card-b"] };
    const offered = recordContentOffers(tracker, reward, demoContent, DEFAULT_GAME_CONFIG);
    expect(offered.record.contentEvents.map((event) => [event.action, event.contentId])).toEqual([
      ["offered", "card-a"], ["offered", "card-b"],
    ]);
    expect(recordContentOffers(offered, reward, demoContent, DEFAULT_GAME_CONFIG).record.contentEvents).toHaveLength(2);
    const resumed = resumePlaytest(parsePlaytestRecord(JSON.parse(JSON.stringify(offered.record))), session.run, "exposure", 100);
    expect(recordContentOffers(resumed, reward, demoContent, DEFAULT_GAME_CONFIG).record.contentEvents).toHaveLength(2);
    const after: RunState = { ...session.run, deck: [...session.run.deck,
      { instanceId: "new-card-instance", cardId: "card-a", upgraded: false }] };
    const selected = recordContentChoice(resumed, session.run, { source: "reward", kind: "card", action: "selected",
      offerId: "card-a", contentId: "card-a", available: null });
    const acquired = recordContentAcquisitions(selected, session.run, after, "reward", "card-a");
    expect(acquired.record.contentEvents.slice(2).map((event) => [event.action, event.contentId])).toEqual([
      ["selected", "card-a"], ["acquired", "card-a"],
    ]);
    expect(recordContentAcquisitions(acquired, session.run, session.run, "reward", "card-a").record.contentEvents).toHaveLength(4);
  });

  it("measures deterministic shop inventory and preserves separate repeated consumptions", () => {
    const shopNode = { ...node, kind: "shop" as const };
    const shopRun = openShop({ ...session.run, map: { ...session.run.map,
      nodes: session.run.map.nodes.map((item) => item.id === node.id ? shopNode : item) } }, demoContent);
    const inventory = { ...session, run: shopRun, screen: "shop" as const };
    const offers = recordContentOffers(tracker, inventory, demoContent, DEFAULT_GAME_CONFIG);
    expect(offers.record.contentEvents.filter((event) => event.action === "offered")).toHaveLength(
      shopRun.shop!.offers.length + shopRun.shop!.relicOffers.length + shopRun.shop!.potionOffers.length);
    expect(recordContentOffers(offers, inventory, demoContent, DEFAULT_GAME_CONFIG).record.contentEvents).toEqual(offers.record.contentEvents);
    const sameSeed = createRunSession(42, "science-demo", demoContent);
    const sameShop = openShop({ ...sameSeed.run, map: { ...sameSeed.run.map,
      nodes: sameSeed.run.map.nodes.map((item) => item.id === node.id ? shopNode : item) } }, demoContent);
    expect(sameShop.shop).toEqual(shopRun.shop);

    const consumedOne = recordContentChoice(offers, shopRun, { source: "combat", kind: "potion", action: "consumed",
      offerId: null, contentId: "potion-a", available: null }, 1);
    const consumedTwo = recordContentChoice(consumedOne, shopRun, { source: "combat", kind: "potion", action: "consumed",
      offerId: null, contentId: "potion-a", available: null }, 2);
    expect(consumedTwo.record.contentEvents.filter((event) => event.action === "consumed")).toHaveLength(2);
  });

  it("records potion use from resolved combat log only", () => {
    const combat = { ...session.run, combat: { ...session.run.combat!, actionLog: [] } } as RunState;
    const noUse = recordCombatPotionUses(tracker, combat, combat);
    expect(noUse.record.contentEvents).toHaveLength(0);
    const after = { ...combat, combat: { ...combat.combat!, actionLog: [{ kind: "potion", actionId: "potion-a" }] } } as RunState;
    const used = recordCombatPotionUses(tracker, combat, after);
    expect(used.record.contentEvents).toMatchObject([{ source: "combat", kind: "potion", action: "consumed", contentId: "potion-a" }]);
    expect(recordCombatPotionUses(used, combat, after).record.contentEvents).toHaveLength(1);
  });
});
