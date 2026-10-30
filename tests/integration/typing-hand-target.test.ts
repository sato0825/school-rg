import { describe, expect, it } from "vitest";
import { moveCardFromHand } from "../../src/domain/card-piles.js";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import type { ContentRegistry, RunState } from "../../src/domain/schema.js";
import { selectTypedHandTarget, submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

function setup(): { run: RunState; content: ContentRegistry } {
  const content = structuredClone(validContent);
  content.cards.push({ ...content.cards[0]!, id: "card-duplicate", name: "Duplicate", target: "hand", input: { text: "duplicate", locale: "en" } });
  const run = structuredClone(validRun);
  run.combat!.cards = [
    { instanceId: "use", cardId: "card-duplicate", upgraded: false },
    { instanceId: "target", cardId: "card-strike", upgraded: false },
  ];
  run.combat!.hand = ["use", "target"];
  run.combat!.drawPile = [];
  run.combat!.typing = { buffer: "", candidateCardInstanceIds: ["use", "target"], selectedCardInstanceId: null, progress: 0, targetEnemyInstanceId: null, targetHandInstanceId: null };
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  return { run, content };
}

describe("typed hand target selection", () => {
  it("waits for an explicit other card and passes its instance ID to the card action", () => {
    const { content } = setup();
    let { run } = setup();
    let now = 0;
    const clock = { nowMs: () => now };
    const used: string[] = [];
    const use = (state: RunState, instanceId: string, _enemy: string | null, handId: string | null) => {
      used.push(`${instanceId}:${handId}`);
      return { ...state, combat: moveCardFromHand(state.combat!, instanceId, "discard") };
    };
    for (const key of "duplicate") {
      now += 10;
      run = submitPlayerKey(run, { key }, clock, DEFAULT_GAME_CONFIG, content, use, () => "discard");
    }
    expect(used).toEqual([]);
    expect(run.combat!.typing.selectedCardInstanceId).toBe("use");
    expect(run.combat!.typing.buffer).toBe("duplicate");
    expect(() => selectTypedHandTarget(run, "missing", clock, DEFAULT_GAME_CONFIG, content, use, () => "discard")).toThrow("not in hand");
    const self = selectTypedHandTarget(run, "use", clock, DEFAULT_GAME_CONFIG, content, use, () => "discard");
    expect(self.combat!.phase).toBe("PLAYER_INPUT");
    expect(used).toEqual([]);
    run = selectTypedHandTarget(run, "target", clock, DEFAULT_GAME_CONFIG, content, use, () => "discard");
    expect(used).toEqual(["use:target"]);
    expect(run.combat!.hand).toEqual(["target"]);
    expect(run.combat!.discardPile).toEqual(["use"]);
    expect(parseRunState(JSON.parse(JSON.stringify(run)), content)).toEqual(run);
  });

  it("adjudicates a target click at the exact deadline using the configured tie rule", () => {
    const { content } = setup();
    const { run } = setup();
    run.combat!.typing = { buffer: "duplicate", candidateCardInstanceIds: ["use"], selectedCardInstanceId: "use", progress: 9, targetEnemyInstanceId: null, targetHandInstanceId: null };
    let uses = 0;
    const use = (state: RunState, instanceId: string) => {
      uses++;
      return { ...state, combat: moveCardFromHand(state.combat!, instanceId, "discard") };
    };
    expect(selectTypedHandTarget(run, "target", { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content, use, () => "discard").combat!.phase).toBe("PLAYER_END");
    expect(uses).toBe(0);
    const inputWins = parseGameConfig({ ...DEFAULT_GAME_CONFIG, deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" } });
    const played = selectTypedHandTarget(run, "target", { nowMs: () => 10_000 }, inputWins, content, use, () => "discard");
    expect(uses).toBe(1);
    expect(played.combat!.discardPile).toEqual(["use", "target"]);
  });
});
