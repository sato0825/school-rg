import { describe, expect, it } from "vitest";
import { createDemoBattle, demoContent, demoRelicRules } from "../../src/content/demo-battle.js";
import { extraConsumableBalance, extraPotions, extraRelics } from "../../src/content/extra-consumables.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { collectPotion, setPotionInputActive, submitPotionKey } from "../../src/domain/potions.js";
import { emitRelicEvent } from "../../src/domain/relic-hooks.js";
import { parseRunState } from "../../src/domain/validate.js";

const disposition = () => "discard" as const;

function playerInput() {
  const run = createDemoBattle();
  run.combat!.phase = "PLAYER_INPUT";
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  return run;
}

function typePotion(run: ReturnType<typeof playerInput>, word: string) {
  let current = setPotionInputActive(run, true, { nowMs: () => 0 }, demoContent, disposition);
  for (const key of word) current = submitPotionKey(current, { key }, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, demoContent, disposition);
  return current;
}

describe("additional relic and potion content", () => {
  it("registers distinct swappable definitions and preserves new inventory data", () => {
    expect(extraRelics).toHaveLength(4);
    expect(extraPotions).toHaveLength(3);
    expect(new Set(demoContent.relics.map((item) => item.id)).size).toBe(demoContent.relics.length);
    expect(new Set(demoContent.potions.map((item) => item.id)).size).toBe(demoContent.potions.length);
    let run = createDemoBattle();
    run = collectPotion(run, "potion-splash", demoContent, DEFAULT_GAME_CONFIG);
    run = { ...run, relicIds: ["attendance-stamp", "practice-timer"] };
    expect(parseRunState(JSON.parse(JSON.stringify(run)), demoContent)).toEqual(run);
  });

  it("resolves acquired, combat-end, hit and card hooks once in priority order", () => {
    let run = { ...playerInput(), relicIds: ["attendance-stamp", "lunch-coupon", "pocket-bandage", "practice-timer"],
      player: { hp: 20, maxHp: 40, block: 0 } };
    const acquired = emitRelicEvent(run, "acquired", demoRelicRules, demoContent, { relicId: "attendance-stamp" });
    expect(acquired.run.gold).toBe(run.gold + extraConsumableBalance.stampAcquiredGold);
    expect(emitRelicEvent(acquired.run, "acquired", demoRelicRules, demoContent, { relicId: "attendance-stamp" }).run.gold)
      .toBe(acquired.run.gold + extraConsumableBalance.stampAcquiredGold);
    run = emitRelicEvent(run, "combat_end", demoRelicRules, demoContent).run;
    expect(run.gold).toBe(3);
    expect(run.player.hp).toBe(22);
    run = emitRelicEvent(run, "hit_taken", demoRelicRules, demoContent, { hpLost: 5 }).run;
    expect(run.player.hp).toBe(23);
    expect(emitRelicEvent({ ...run, player: { ...run.player, hp: 0 } }, "hit_taken", demoRelicRules, demoContent, { hpLost: 5 }).run.player.hp).toBe(0);
    const timed = emitRelicEvent(run, "card_used", demoRelicRules, demoContent, { cardInstanceId: "combat-1" });
    expect(timed.run.combat?.clock.remainingMs).toBe(10_400);
    expect(timed.trace.map((item) => item.ruleId)).toContain("timer-card-used");
    expect(parseRunState(JSON.parse(JSON.stringify(timed.run)), demoContent)).toEqual(timed.run);
  });

  it("types self block, all-enemy damage and ordered healing plus time", () => {
    const base = playerInput();
    const shield = typePotion({ ...base, potionIds: ["potion-guard"] }, "shield");
    expect(shield.player.block).toBe(8);
    expect(shield.potionIds).toEqual([]);
    const pair = playerInput();
    pair.combat!.enemies.push({ ...pair.combat!.enemies[0]!, instanceId: "paper-2" });
    const splash = typePotion({ ...pair, potionIds: ["potion-splash"] }, "splash");
    expect(splash.combat!.enemies.map((enemy) => enemy.hp)).toEqual([22, 22]);
    const tea = typePotion({ ...playerInput(), player: { hp: 20, maxHp: 40, block: 0 }, potionIds: ["potion-tea"] }, "tea");
    expect(tea.player.hp).toBe(23);
    expect(tea.combat?.clock.remainingMs).toBe(11_000);
    expect(parseRunState(JSON.parse(JSON.stringify(tea)), demoContent)).toEqual(tea);
  });
});
