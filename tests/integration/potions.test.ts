import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, parseGameConfig } from "../../src/domain/config.js";
import { availableEventChoices, resolveEventChoice } from "../../src/domain/events.js";
import { collectPotion, discardPotion, selectPotionEnemy, setPotionInputActive, submitPotionKey } from "../../src/domain/potions.js";
import { parseRunState } from "../../src/domain/validate.js";
import { validContent, validRun } from "../fixtures/domain.js";
import { demoContent } from "../../src/content/demo-battle.js";

const disposition = () => "discard" as const;

function fixture() {
  const content = structuredClone(validContent);
  content.effects.push(
    { id: "clock-effect", kind: "add_time", parameters: { amountMs: 3_000 } },
    { id: "bandage-effect", kind: "heal", parameters: { amount: 5 } },
    { id: "ink-effect", kind: "damage", parameters: { amount: 7 } },
  );
  content.potions = [
    { id: "clock", name: "Clock", input: { text: "clock", locale: "en" }, target: "self", effectIds: ["clock-effect"] },
    { id: "bandage", name: "Bandage", input: { text: "bandage", locale: "en" }, target: "self", effectIds: ["bandage-effect"] },
    { id: "ink", name: "Ink", input: { text: "ink", locale: "en" }, target: "enemy", effectIds: ["ink-effect"] },
  ];
  const run = structuredClone(validRun);
  run.potionIds = [];
  run.combat!.clock = { remainingMs: 10_000, lastEventAtMs: 0, paused: false };
  return { content, run };
}

describe("typed potion use", () => {
  it("enforces slots and discards only the selected inventory copy", () => {
    const { content, run } = fixture();
    const one = collectPotion(run, "clock", content, DEFAULT_GAME_CONFIG);
    const two = collectPotion(one, "clock", content, DEFAULT_GAME_CONFIG);
    const full = collectPotion(two, "ink", content, DEFAULT_GAME_CONFIG);
    expect(full.potionIds).toEqual(["clock", "clock", "ink"]);
    expect(run.potionIds).toEqual([]);
    expect(() => collectPotion(full, "bandage", content, DEFAULT_GAME_CONFIG)).toThrow("full");
    expect(discardPotion(full, 1).potionIds).toEqual(["clock", "ink"]);
    expect(() => discardPotion(full, 3)).toThrow("slot");
  });

  it("uses the configured slot count for event availability and acquisition", () => {
    const config = parseGameConfig({ ...DEFAULT_GAME_CONFIG, potionSlots: { ...DEFAULT_GAME_CONFIG.potionSlots, value: 2 } });
    const run = { ...structuredClone(validRun), potionIds: ["potion-time", "potion-heal"], event: { nodeId: "node-start", eventId: "collection-box", choiceId: null, pendingCombat: false } };
    expect(availableEventChoices(run, demoContent, config).find((item) => item.choice.id === "ink")?.available).toBe(false);
    expect(() => resolveEventChoice(run, "ink", demoContent, config)).toThrow("conditions");
  });

  it("ignores a wrong key, uses a time potion once, and preserves the remaining clock", () => {
    const { content } = fixture();
    let { run } = fixture();
    run.potionIds = ["clock"];
    let now = 0;
    const clock = { nowMs: () => now };
    run = setPotionInputActive(run, true, clock, content, disposition);
    now = 100;
    run = submitPotionKey(run, { key: "x" }, clock, DEFAULT_GAME_CONFIG, content, disposition);
    expect(run.combat!.potionControl?.typing.buffer).toBe("");
    for (const key of "clock") {
      now += 100;
      run = submitPotionKey(run, { key }, clock, DEFAULT_GAME_CONFIG, content, disposition);
    }
    expect(run.potionIds).toEqual([]);
    expect(run.combat!.clock.remainingMs).toBe(12_400);
    expect(run.combat!.potionControl).toBeUndefined();
    expect(parseRunState(JSON.parse(JSON.stringify(run)), content)).toEqual(run);
  });

  it("keeps a partial potion when the deadline wins and does not consume it", () => {
    const { content } = fixture();
    let { run } = fixture();
    run.potionIds = ["clock"];
    run = setPotionInputActive(run, true, { nowMs: () => 0 }, content, disposition);
    run = submitPotionKey(run, { key: "c" }, { nowMs: () => 100 }, DEFAULT_GAME_CONFIG, content, disposition);
    run = submitPotionKey(run, { key: "l" }, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content, disposition);
    expect(run.combat!.phase).toBe("PLAYER_END");
    expect(run.combat!.potionControl).toBeUndefined();
    expect(run.potionIds).toEqual(["clock"]);
  });

  it("waits for a living enemy target before consuming an attack potion", () => {
    const { content } = fixture();
    let { run } = fixture();
    run.potionIds = ["ink"];
    run.combat!.enemies.push({ ...run.combat!.enemies[0]!, instanceId: "enemy-2" });
    run = setPotionInputActive(run, true, { nowMs: () => 0 }, content, disposition);
    let now = 0;
    const clock = { nowMs: () => now };
    for (const key of "ink") {
      now += 100;
      run = submitPotionKey(run, { key }, clock, DEFAULT_GAME_CONFIG, content, disposition);
    }
    expect(run.potionIds).toEqual(["ink"]);
    expect(run.combat!.potionControl?.typing.selectedCardInstanceId).toBe("potion-0");
    expect(() => selectPotionEnemy(run, "missing", clock, DEFAULT_GAME_CONFIG, content, disposition)).toThrow("not alive");
    now = 400;
    run = selectPotionEnemy(run, "enemy-2", clock, DEFAULT_GAME_CONFIG, content, disposition);
    expect(run.potionIds).toEqual([]);
    expect(run.combat!.enemies.map((enemy) => enemy.hp)).toEqual([20, 13]);
  });

  it("uses the configurable exact-deadline policy for a completed potion word", () => {
    const { content } = fixture();
    const setup = () => {
      const { run } = fixture();
      run.potionIds = ["bandage"];
      run.player.hp = 30;
      return setPotionInputActive(run, true, { nowMs: () => 0 }, content, disposition);
    };
    let timeout = setup();
    let inputWins = setup();
    const alternate = parseGameConfig({ ...DEFAULT_GAME_CONFIG, deadlineTiePolicy: { ...DEFAULT_GAME_CONFIG.deadlineTiePolicy, value: "input_wins" } });
    for (const key of "bandag") {
      timeout = submitPotionKey(timeout, { key }, { nowMs: () => 0 }, DEFAULT_GAME_CONFIG, content, disposition);
      inputWins = submitPotionKey(inputWins, { key }, { nowMs: () => 0 }, alternate, content, disposition);
    }
    timeout = submitPotionKey(timeout, { key: "e" }, { nowMs: () => 10_000 }, DEFAULT_GAME_CONFIG, content, disposition);
    inputWins = submitPotionKey(inputWins, { key: "e" }, { nowMs: () => 10_000 }, alternate, content, disposition);
    expect(timeout.player.hp).toBe(30);
    expect(timeout.potionIds).toEqual(["bandage"]);
    expect(inputWins.player.hp).toBe(35);
    expect(inputWins.potionIds).toEqual([]);
  });
});
