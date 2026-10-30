import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi, demoEventPools, demoRunContentTables } from "../../src/content/demo-battle.js";
import { availableEventChoices, openRandomEvent } from "../../src/domain/events.js";
import { chooseRunEventChoice, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

function eventStart(act: 1 | 2 | 3) {
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: `a${act}-start`, act, floor: 0, kind: "start", nextIds: [`a${act}-event`] };
  const event: MapNode = { id: `a${act}-event`, act, floor: 1, kind: "event", nextIds: [] };
  return { ...base, run: { ...base.run, act, map: { currentNodeId: start.id, nodes: [start, event] } }, completedNodeIds: [start.id] };
}

describe("Act-specific event pools", () => {
  for (const act of [1, 2, 3] as const) {
    it(`opens an Act ${act} event deterministically and preserves it on reload`, () => {
      const start = eventStart(act);
      const event = enterRunNode(start, `a${act}-event`, demoContent, demoEnemyAi, demoRunContentTables);
      expect(event.screen).toBe("event");
      expect(demoEventPools[act]).toContain(event.run.event?.eventId);
      expect(enterRunNode(start, `a${act}-event`, demoContent, demoEnemyAi, demoRunContentTables)).toEqual(event);
      const saved = serializeRunSession(event, demoContent, { nowMs: () => 0 }, () => "discard");
      expect(deserializeRunSession(saved, demoContent, { nowMs: () => 10_000 })).toEqual(event);
      expect(availableEventChoices(event.run, demoContent).some((item) => item.available)).toBe(true);
    });
  }

  it("keeps the all-event fallback injectable and rejects bad pools", () => {
    const start = eventStart(2);
    const moved = { ...start.run, map: { ...start.run.map, currentNodeId: "a2-event" } };
    const fallback = openRandomEvent(moved, demoContent);
    expect(demoContent.events.map((event) => event.id)).toContain(fallback.event?.eventId);
    expect(() => openRandomEvent(moved, demoContent, [])).toThrow(/empty/);
    expect(() => openRandomEvent(moved, demoContent, ["missing"])).toThrow(/unknown/);
    expect(() => openRandomEvent(moved, demoContent, ["archive-inventory", "archive-inventory"])).toThrow(/duplicate/);
  });

  it("applies Act 2 cost before adding a card and Act 3 potion condition", () => {
    const actTwo = enterRunNode(eventStart(2), "a2-event", demoContent, demoEnemyAi, demoRunContentTables);
    const archive = { ...actTwo, run: { ...actTwo.run, event: { ...actTwo.run.event!, eventId: "archive-inventory" } } };
    const borrowed = chooseRunEventChoice(archive, "borrow", demoContent, demoEnemyAi);
    expect(borrowed.run.gold).toBe(40);
    expect(borrowed.run.deck.at(-1)?.cardId).toBe("BASE-009");
    const actThree = enterRunNode(eventStart(3), "a3-event", demoContent, demoEnemyAi, demoRunContentTables);
    const broadcast = { ...actThree.run, event: { ...actThree.run.event!, eventId: "night-broadcast" } };
    expect(availableEventChoices({ ...broadcast, potionIds: ["potion-time", "potion-heal", "potion-ink"] }, demoContent)
      .find((item) => item.choice.id === "clock")?.available).toBe(false);
  });
});
