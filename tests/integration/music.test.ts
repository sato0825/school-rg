import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { musicCardDefinitions } from "../../src/content/music-cards.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { RunState } from "../../src/domain/schema.js";
import { resumePlayerTurn, submitPlayerKey } from "../../src/domain/turn-state.js";
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

function typeAt(run: RunState, word: string, startedAtMs: number, intervalMs: number): RunState {
  let current = run;
  for (const [index, key] of [...word].entries()) {
    current = submitPlayerKey(current, { key }, { nowMs: () => startedAtMs + (index + 1) * intervalMs },
      DEFAULT_GAME_CONFIG, demoContent,
      (state, instanceId, targetEnemyInstanceId) => useCardEffects(state, instanceId, { targetEnemyInstanceId }, DEFAULT_GAME_CONFIG, demoContent),
      () => "discard");
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

  it("chains tempo, sync and multi-hit beat within the same turn across save/load", () => {
    const initial = musicCombat("MUS-001").run;
    const combat = initial.combat!;
    const tempoId = combat.hand[0]!;
    const syncId = combat.cards.find((card) => card.cardId === "MUS-004")!.instanceId;
    const beatId = combat.cards.find((card) => card.cardId === "MUS-002")!.instanceId;
    const remainingDraw = combat.drawPile.filter((id) => id !== syncId && id !== beatId);
    const staged: RunState = { ...initial, combat: { ...combat, drawPile: [...remainingDraw, beatId, syncId] } };

    const afterTempo = typeAt(staged, "tempo", 0, 450);
    expect(afterTempo.combat!.clock.remainingMs).toBe(9_750);
    expect(afterTempo.combat!.hand).toContain(syncId);
    expect(afterTempo.combat!.discardPile).toContain(tempoId);

    const saved = serializeRunSession({ run: afterTempo, screen: "combat", completedNodeIds: [], rewardCardIds: [], encounterHistory: {} },
      demoContent, { nowMs: () => 2_250 }, () => "discard");
    const loaded = deserializeRunSession(saved, demoContent, { nowMs: () => 2_500 });
    expect(loaded.run.combat!.clock.paused).toBe(true);
    const afterSync = typeAt(resumePlayerTurn(loaded.run, { nowMs: () => 2_500 }), "sync", 2_500, 450);
    expect(afterSync.combat!.clock.remainingMs).toBe(8_950);
    expect(afterSync.combat!.hand).toContain(beatId);
    expect(afterSync.combat!.discardPile).toContain(syncId);

    const enemyBefore = afterSync.combat!.enemies[0]!.hp;
    const afterBeat = typeAt(afterSync, "beat", 4_300, 450);
    expect(afterBeat.combat!.clock.remainingMs).toBe(7_150);
    expect(afterBeat.combat!.enemies[0]!.hp).toBe(enemyBefore - 6);
    expect(afterBeat.combat!.discardPile).toEqual(expect.arrayContaining([tempoId, syncId, beatId]));
    expect((afterBeat.combat!.actionLog ?? []).filter((entry) => entry.kind === "card").map((entry) => entry.actionId))
      .toEqual(["MUS-001", "MUS-004", "MUS-002"]);
    expect(parseRunState(afterBeat, demoContent)).toEqual(afterBeat);
  });

  it("caps consecutive time extensions instead of storing excess time", () => {
    const initial = musicCombat("MUS-001", 29_500).run;
    const restId = initial.combat!.cards.find((card) => card.cardId === "MUS-003")!.instanceId;
    const staged: RunState = { ...initial, combat: { ...initial.combat!,
      hand: [...initial.combat!.hand, restId], drawPile: initial.combat!.drawPile.filter((id) => id !== restId) } };
    const afterTempo = typeAt(staged, "tempo", 0, 10);
    expect(afterTempo.combat!.clock.remainingMs).toBe(30_000);
    const afterRest = typeAt(afterTempo, "rest", 50, 10);
    expect(afterRest.combat!.clock.remainingMs).toBe(30_000);
    expect(afterRest.player.block).toBe(6);
    expect(parseRunState(afterRest, demoContent)).toEqual(afterRest);
  });
});
