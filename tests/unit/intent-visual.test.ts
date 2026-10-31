import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { DEFAULT_GAME_CONFIG } from "../../src/domain/config.js";
import { describeEnemyIntent } from "../../src/ui/intent-visual.js";
import { validRun } from "../fixtures/domain.js";

function preview(enemyId: string, intentId: string) {
  const run = structuredClone(validRun);
  const definition = demoContent.enemies.find((enemy) => enemy.id === enemyId)!;
  const enemy = run.combat!.enemies[0]!;
  enemy.enemyId = enemyId;
  enemy.intentId = intentId;
  enemy.maxHp = definition.maxHp;
  enemy.hp = definition.maxHp;
  run.combat!.statuses.player = {};
  run.combat!.statuses.enemies = { [enemy.instanceId]: {} };
  return describeEnemyIntent(run, enemy, demoContent, DEFAULT_GAME_CONFIG);
}

describe("live enemy Intent visual grammar", () => {
  it("shows attack hits before Block with targets and values", () => {
    const visual = preview("hall-mop", "mop-intent-sweep");
    expect(visual.steps.map((step) => [step.kind, step.value, step.target])).toEqual([
      ["attack", "3×2", "player"], ["block", "+4", "self"],
    ]);
    expect(visual.ariaLabel).toContain("1番目、味方へ攻撃3を2回。2番目、自身にブロック4を付与");
  });

  it("shows strength before Block and keeps debuffs and summon distinct", () => {
    const clock = preview("archive-clock", "clock-intent-prepare");
    expect(clock.steps.map((step) => [step.kind, step.value, step.target])).toEqual([
      ["buff", "力+1", "self"], ["block", "+5", "self"],
    ]);
    const poison = preview("beaker-mist", "mist-intent-poison");
    expect(poison.steps[0]).toMatchObject({ kind: "debuff", value: "毒+1", target: "player" });
    const vulnerable = preview("stage-spotlight", "spotlight-intent-glare");
    expect(vulnerable.steps[0]).toMatchObject({ kind: "debuff", value: "脆弱+1", target: "player" });
    const summon = preview("folded-school-map", "map-intent-call");
    expect(summon.steps[0]).toMatchObject({ kind: "summon", value: "+1", target: "enemy_side" });
    expect(summon.ariaLabel).toContain("答案の切れ端を1体召喚");
  });

  it("applies current strength to the next attack value", () => {
    const run = structuredClone(validRun);
    const enemy = run.combat!.enemies[0]!;
    enemy.enemyId = "hall-mop";
    enemy.intentId = "mop-intent-sweep";
    run.combat!.statuses.enemies = { [enemy.instanceId]: { strength: 2 } };
    run.combat!.statuses.player = {};
    expect(describeEnemyIntent(run, enemy, demoContent, DEFAULT_GAME_CONFIG).steps[0]?.value).toBe("5×2");
  });
});
