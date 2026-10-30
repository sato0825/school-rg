import { describe, expect, it } from "vitest";
import { resolveCardLifecycleTriggers, type CardTrigger } from "../../src/domain/card-triggers.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

describe("card lifecycle trigger dispatch", () => {
  it("executes multiple matching triggers in declaration order for each event", () => {
    const run = structuredClone(validRun);
    const order: string[] = [];
    const triggers: CardTrigger[] = [
      { id: "first", on: "discarded", apply: (state, event) => {
        order.push(`first:${event.instanceId}`);
        return { ...state, player: { ...state.player, block: state.player.block + 1 } };
      } },
      { id: "second", on: "discarded", apply: (state, event) => {
        order.push(`second:${event.instanceId}`);
        return { ...state, player: { ...state.player, block: state.player.block * 2 } };
      } },
      { id: "other", on: "exhausted", apply: (state) => state },
    ];
    const result = resolveCardLifecycleTriggers(run, [{ instanceId: "combat-1", kind: "discarded" }], triggers);
    expect(order).toEqual(["first:combat-1", "second:combat-1"]);
    expect(result.run.player.block).toBe(2);
    expect(result.trace.map((entry) => entry.triggerId)).toEqual(["first", "second"]);
    expect(parseRunState(JSON.parse(JSON.stringify(result.run)), validContent)).toEqual(result.run);
    expect(run.player.block).toBe(0);
  });

  it("rejects stale card references, duplicate trigger IDs and handlers that lose the event card", () => {
    const run = structuredClone(validRun);
    const event = { instanceId: "combat-1", kind: "discarded" } as const;
    expect(() => resolveCardLifecycleTriggers(run, [{ ...event, instanceId: "missing" }], [])).toThrow("unknown card instance");
    const unchanged: CardTrigger = { id: "same", on: "discarded", apply: (state) => state };
    expect(() => resolveCardLifecycleTriggers(run, [event], [unchanged, unchanged])).toThrow("duplicate");
    const lost: CardTrigger = { id: "lost", on: "discarded", apply: (state) => ({ ...state, combat: { ...state.combat!, cards: [] } }) };
    expect(() => resolveCardLifecycleTriggers(run, [event], [lost])).toThrow("lost its event card reference");
  });
});
