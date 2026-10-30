import { describe, expect, it } from "vitest";
import { acquireRelic, emitRelicEvent, resolveRelicHooks, type RelicRule } from "../../src/domain/relic-hooks.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

function fixture() {
  const content = structuredClone(validContent);
  content.relics = [
    { id: "bell", name: "Bell", triggerIds: ["guard", "mend"], effectIds: [] },
    { id: "badge", name: "Badge", triggerIds: ["boost"], effectIds: [] },
  ];
  content.clubs[0]!.startingRelicId = "bell";
  const run = { ...structuredClone(validRun), relicIds: ["bell", "badge", "bell"] };
  return { content, run };
}

describe("relic hook dispatch", () => {
  it("resolves priority, conditions and duplicate ownership deterministically", () => {
    const { content, run } = fixture();
    const rules: RelicRule[] = [
      { id: "guard", on: "turn_start", priority: 0, stackMode: "each", apply: (state) => ({ ...state, player: { ...state.player, block: state.player.block + 2 } }) },
      { id: "mend", on: "turn_start", priority: 2, stackMode: "aggregate", condition: (state) => state.player.block >= 4, apply: (state, _event, stacks) => ({ ...state, player: { ...state.player, hp: state.player.hp - stacks } }) },
      { id: "boost", on: "turn_start", priority: 1, stackMode: "each", apply: (state) => ({ ...state, player: { ...state.player, block: state.player.block + 1 } }) },
    ];
    const result = resolveRelicHooks(run, [{ id: "turn-1", kind: "turn_start" }], rules, content);
    expect(result.trace.map((entry) => `${entry.ruleId}:${entry.stacks}`)).toEqual(["guard:1", "guard:1", "boost:1", "mend:2"]);
    expect(result.run.player).toMatchObject({ hp: 38, block: 5 });
    expect(parseRunState(JSON.parse(JSON.stringify(result.run)), content)).toEqual(result.run);
    expect(resolveRelicHooks(result.run, [{ id: "turn-1", kind: "turn_start" }], rules, content).trace).toEqual([]);
  });

  it("marks an event before handler execution so recursive dispatch cannot double fire", () => {
    const { content, run } = fixture();
    const rules: RelicRule[] = [{ id: "guard", on: "combat_start", priority: 0, stackMode: "aggregate", apply: (state) => {
      const nested = resolveRelicHooks(state, [{ id: "same-event", kind: "combat_start" }], rules, content);
      expect(nested.trace).toEqual([]);
      return { ...state, gold: state.gold + 1 };
    } }];
    const result = resolveRelicHooks(run, [{ id: "same-event", kind: "combat_start" }], rules, content);
    expect(result.run.gold).toBe(1);
    expect(result.trace).toHaveLength(1);
    const next = emitRelicEvent(result.run, "combat_start", rules, content);
    expect(next.run.gold).toBe(2);
    expect(next.run.relicEventCounter).toBe(1);
  });

  it("acquires a known relic without mutating the prior run", () => {
    const { content, run } = fixture();
    const next = acquireRelic(run, "badge", content);
    expect(next.relicIds).toEqual(["bell", "badge", "bell", "badge"]);
    expect(run.relicIds).toHaveLength(3);
    expect(() => acquireRelic(run, "missing", content)).toThrow("unknown relic");
  });
});
