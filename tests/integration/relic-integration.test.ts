import { describe, expect, it } from "vitest";
import { createDemoBattle, demoContent, demoEncounterTable, demoEnemyAi, demoRelicRules } from "../../src/content/demo-battle.js";
import { useCardEffects } from "../../src/domain/card-effects.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { executeEnemyIntentEffects } from "../../src/domain/enemy-intent-effects.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { availableRunNodes, chooseRunEventChoice, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";

describe("relics across event acquisition and typed combat", () => {
  it("keeps an acquired duplicate and its once-only reward through a state round trip", () => {
    const start = createRunSession(8, "literature-demo", demoContent, { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 1, shop: 0, rest: 0, treasure: 0 } });
    const opened = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const box = { ...opened, run: { ...opened.run, event: { ...opened.run.event!, eventId: "collection-box" } } };
    const chosen = chooseRunEventChoice(box, "bookmark", demoContent, demoEnemyAi);
    expect(chosen.run.relicIds).toEqual(["library-bookmark", "library-bookmark"]);
    const acquired = emitRelicEvent(chosen.run, "acquired", demoRelicRules, demoContent, { relicId: "library-bookmark" });
    expect(acquired.run.gold).toBe(chosen.run.gold + 2);
    expect(parseRunState(JSON.parse(JSON.stringify(acquired.run)), demoContent)).toEqual(acquired.run);
    expect(parseRunState(JSON.parse(JSON.stringify(acquired.run)), demoContent).gold).toBe(acquired.run.gold);
  });

  it("applies turn and skill hooks after the typed card resolves, with duplicate stacking", () => {
    let run = createDemoBattle();
    run = { ...run, relicIds: ["library-bookmark", "library-bookmark"] };
    run.combat!.phase = "PLAYER_INPUT";
    run.combat!.hand = ["combat-3"];
    run.combat!.drawPile = run.combat!.drawPile.filter((id) => id !== "combat-3");
    run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
    run = emitRelicEvent(run, "turn_start", demoRelicRules, demoContent).run;
    expect(run.player.block).toBe(2);
    run = useCardEffects(run, "combat-3", { targetEnemyInstanceId: null }, DEFAULT_GAME_CONFIG, demoContent);
    run = emitRelicEvent(run, "card_used", demoRelicRules, demoContent, { cardInstanceId: "combat-3" }).run;
    expect(run.player.block).toBe(9);
    expect(run.combat!.discardPile).toContain("combat-3");
  });

  it("fires a hit hook for each resolved hit rather than once for the enemy phase", () => {
    const content = structuredClone(validContent);
    content.effects[0]!.parameters = { amount: 2, hits: 2, pierceBlock: false };
    content.relics[0]!.triggerIds = ["on-hit"];
    const run = structuredClone(validRun);
    run.combat!.phase = "ENEMY_PHASE";
    run.player.block = 0;
    const hits: number[] = [];
    const rule = { id: "on-hit", on: "hit_taken" as const, priority: 0, stackMode: "each" as const,
      apply: (state: typeof run, event: { hpLost?: number }) => {
        hits.push(event.hpLost ?? 0);
        return { ...state, player: { ...state.player, block: state.player.block + 1 } };
      } };
    const resolved = executeEnemyIntentEffects(run, "enemy-1", content.intents[0]!, {}, content, DEFAULT_GAME_CONFIG,
      (state, hpLost) => emitRelicEvent(state, "hit_taken", [rule], content, { hpLost }).run);
    expect(hits).toEqual([2, 1]);
    expect(resolved.player).toMatchObject({ hp: 37, block: 1 });
    expect(resolved.relicEventCounter).toBe(2);
  });
});
