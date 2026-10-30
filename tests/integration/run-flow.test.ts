import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableRunNodes, chooseRunReward, createRunSession, enterRunNode, settleRunCombat } from "../../src/domain/run-flow.js";
import { parseRunState } from "../../src/domain/validate.js";

const combatOnlyMap = { floorsPerAct: 2, lanes: 3, kindWeights: { combat: 1, elite: 0, event: 0, shop: 0, rest: 0, treasure: 0 } };

describe("run encounter and reward loop", () => {
  it("replays seeded node choices, combat setup and reward choices", () => {
    const start = createRunSession(42, "literature-demo", demoContent, combatOnlyMap);
    expect(createRunSession(42, "literature-demo", demoContent, combatOnlyMap)).toEqual(start);
    expect(start.screen).toBe("map");
    expect(start.run.gold).toBe(50);
    expect(availableRunNodes(start)).toHaveLength(3);
    expect(() => enterRunNode(start, "a1-f3-n0", demoContent, demoEnemyAi, demoEncounterTable)).toThrow(/not available/);
    const first = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    expect(first.screen).toBe("combat");
    expect(first.run.combat?.phase).toBe("PLAYER_START");
    expect(first.run.combat?.drawPile).toHaveLength(10);
    expect(first.run.combat?.enemies[0]?.intentId).toBe("paper-intent-hit");
    expect(() => enterRunNode(first, "a1-f2-n0", demoContent, demoEnemyAi, demoEncounterTable)).toThrow(/map screen/);
    const won = { ...first, run: { ...first.run, combat: { ...first.run.combat!, phase: "WON" as const, enemies: first.run.combat!.enemies.map((enemy) => ({ ...enemy, hp: 0 })) } } };
    const reward = settleRunCombat(won, demoContent);
    expect(reward.screen).toBe("reward");
    expect(reward.run.gold).toBe(65);
    expect(reward.rewardCardIds).toHaveLength(3);
    expect(() => chooseRunReward(reward, "not-offered")).toThrow(/not a reward/);
    const skipped = chooseRunReward(reward, null);
    expect(skipped.run.deck).toHaveLength(10);
    expect(skipped.run.combat).toBeNull();
    expect(skipped.completedNodeIds).toContain(first.run.map.currentNodeId);
    const selected = chooseRunReward(reward, reward.rewardCardIds[0]!);
    expect(selected.run.deck).toHaveLength(11);
    expect(selected.run.deck.at(-1)?.cardId).toBe(reward.rewardCardIds[0]);
    expect(parseRunState(selected.run, demoContent)).toEqual(selected.run);
  });

  it("crosses the Act boundary after boss victory and treats defeat as terminal", () => {
    let session = createRunSession(5, "literature-demo", demoContent, combatOnlyMap);
    for (let index = 0; index < 3; index++) {
      const next = availableRunNodes(session)[0]!;
      session = enterRunNode(session, next.id, demoContent, demoEnemyAi, demoEncounterTable);
      expect(session.run.combat?.enemies[0]?.enemyId).toBe(next.kind === "boss" ? "final-exam" : "paper-heap");
      const won = { ...session, run: { ...session.run, combat: { ...session.run.combat!, phase: "WON" as const } } };
      session = chooseRunReward(settleRunCombat(won, demoContent), null);
    }
    expect(session.run.map.currentNodeId).toBe("a1-f3-n0");
    const nextAct = availableRunNodes(session)[0]!;
    expect(nextAct.kind).toBe("start");
    session = enterRunNode(session, nextAct.id, demoContent, demoEnemyAi, demoEncounterTable);
    expect(session.run.act).toBe(2);
    expect(session.completedNodeIds).toContain(nextAct.id);
    const actTwoFight = enterRunNode(session, availableRunNodes(session)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const lost = settleRunCombat({ ...actTwoFight, run: { ...actTwoFight.run, combat: { ...actTwoFight.run.combat!, phase: "LOST" }, player: { ...actTwoFight.run.player, hp: 0 } } }, demoContent);
    expect(lost.screen).toBe("lost");
    expect(availableRunNodes(lost)).toEqual([]);
  });
});
