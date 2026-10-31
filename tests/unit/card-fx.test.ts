import { expect, it } from "vitest";
import { createDemoBattle, demoContent } from "../../src/content/demo-battle.js";
import { cardFxForUse } from "../../src/ui/card-fx.js";

it("captures the selected enemy or all enemy positions before a card resolves", () => {
  const base = createDemoBattle();
  const first = base.combat!.enemies[0]!;
  const run = { ...base, combat: { ...base.combat!, enemies: [first, { ...first, instanceId: "paper-2" }] } };
  const strike = demoContent.cards.find((card) => card.id === "BASE-001")!;
  const sweep = demoContent.cards.find((card) => card.id === "BASE-011")!;
  const block = demoContent.cards.find((card) => card.id === "BASE-002")!;
  expect(cardFxForUse(strike, run, "paper-2", 1, 123)).toEqual({ kind: "attack", sourceXPercent: 22, targetXPercents: [88], startedAtMs: 123 });
  expect(cardFxForUse(sweep, run, null, 1, 123).targetXPercents).toEqual([62, 88]);
  expect(cardFxForUse(block, run, null, 3, 123)).toEqual({ kind: "support", sourceXPercent: 10, targetXPercents: [10], startedAtMs: 123 });
});

it("derives the art prop cue from card effects instead of localized card text", () => {
  const run = createDemoBattle();
  for (const [cardId, cue] of [["ART-002", "retain"], ["ART-003", "copy"], ["ART-005", "transform"]] as const) {
    const card = demoContent.cards.find((item) => item.id === cardId)!;
    expect(cardFxForUse(card, run, null, 1, 123, demoContent.effects).visualAction).toBe(cue);
  }
});
