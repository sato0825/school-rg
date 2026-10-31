import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { musicCardDefinitions } from "../../src/content/music-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import type { RunState } from "../../src/domain/schema.js";
import { submitPlayerKey } from "../../src/domain/turn-state.js";
import { parseRunState } from "../../src/domain/validate.js";

function musicCombat(cardId: string, remainingMs = 10_000): { run: RunState; instanceId: string } {
  const mapOptions = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };
  const start = createRunSession(42, "music-demo", demoContent, mapOptions);
  const run = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable).run;
  const instanceId = run.combat!.cards.find((card) => card.cardId === cardId)!.instanceId;
  return { run: { ...run, combat: { ...run.combat!, phase: "PLAYER_INPUT", hand: [instanceId],
    drawPile: run.combat!.drawPile.filter((id) => id !== instanceId),
    clock: { remainingMs, lastEventAtMs: 0, paused: false } } }, instanceId };
}

function type(run: RunState, word: string): RunState {
  let current = run;
  let now = 0;
  for (const key of word) {
    now += 10;
    current = submitPlayerKey(current, { key }, { nowMs: () => now }, DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent), () => "discard");
  }
  return current;
}

describe("music time economy", () => {
  it("has distinct cards, reward pool and a capped turn-start time relic", () => {
    const club = demoContent.clubs.find((item) => item.id === "music-demo")!;
    expect(musicCardDefinitions).toHaveLength(12);
    expect(club.starterCardIds.filter((id) => id.startsWith("MUS-"))).toHaveLength(4);
    expect(musicCardDefinitions.every((card) => club.cardPoolIds.includes(card.id))).toBe(true);
    const started = emitRelicEvent(musicCombat("MUS-001").run, "turn_start", demoRelicRules, demoContent).run;
    expect(started.combat!.clock.remainingMs).toBe(11_000);
    const capped = emitRelicEvent(musicCombat("MUS-001", 29_500).run, "turn_start", demoRelicRules, demoContent).run;
    expect(capped.combat!.clock.remainingMs).toBe(30_000);
  });

  it("adds time after the typed word, draws once, and obeys the cap", () => {
    const tempo = type(musicCombat("MUS-001").run, "tempo");
    expect(tempo.combat!.clock.remainingMs).toBe(11_950);
    expect(tempo.combat!.hand).toHaveLength(1);
    expect(tempo.combat!.discardPile).toHaveLength(1);
    expect(parseRunState(tempo, demoContent)).toEqual(tempo);
    expect(type(musicCombat("MUS-001", 29_990).run, "tempo").combat!.clock.remainingMs).toBe(30_000);
  });
});
