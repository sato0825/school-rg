import { describe, expect, it } from "vitest";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../../src/content/demo-battle.js";
import { availableEventChoices, resolveEventChoice } from "../../src/domain/events.js";
import { availableRunNodes, chooseRunEventChoice, createRunSession, enterRunNode, settleRunCombat } from "../../src/domain/run-flow.js";
import { parseRunState } from "../../src/domain/validate.js";

const eventMap = { floorsPerAct: 1, lanes: 2, kindWeights: { combat: 0, elite: 0, event: 1, shop: 0, rest: 0, treasure: 0 } };

describe("data-driven event choices", () => {
  it("selects the same event for the same seed and resumes the unresolved state", () => {
    const start = createRunSession(42, "literature-demo", demoContent, eventMap);
    const nodeId = availableRunNodes(start)[0]!.id;
    const event = enterRunNode(start, nodeId, demoContent, demoEnemyAi, demoEncounterTable);
    expect(event.screen).toBe("event");
    expect(enterRunNode(createRunSession(42, "literature-demo", demoContent, eventMap), nodeId, demoContent, demoEnemyAi, demoEncounterTable)).toEqual(event);
    expect(parseRunState(JSON.parse(JSON.stringify(event.run)), demoContent)).toEqual(event.run);
    expect(availableEventChoices(event.run, demoContent).some((item) => item.choice.id === "fight")).toBe(true);
    expect(() => chooseRunEventChoice(event, "missing-choice", demoContent, demoEnemyAi)).toThrow(/unknown event choice/);
    const battle = chooseRunEventChoice(event, "fight", demoContent, demoEnemyAi);
    expect(battle.screen).toBe("combat");
    expect(battle.run.event?.pendingCombat).toBe(true);
    expect(battle.run.combat?.enemies[0]?.enemyId).toBe("paper-heap");
    expect(parseRunState(JSON.parse(JSON.stringify(battle.run)), demoContent)).toEqual(battle.run);
    const won = { ...battle, run: { ...battle.run, combat: { ...battle.run.combat!, phase: "WON" as const, enemies: battle.run.combat!.enemies.map((enemy) => ({ ...enemy, hp: 0 })) } } };
    const completed = settleRunCombat(won, demoContent);
    expect(completed.screen).toBe("map");
    expect(completed.run.event).toBeNull();
    expect(completed.completedNodeIds).toContain(nodeId);
    expect(() => chooseRunEventChoice(completed, "fight", demoContent, demoEnemyAi)).toThrow(/event screen/);
    expect(() => enterRunNode(completed, nodeId, demoContent, demoEnemyAi, demoEncounterTable)).toThrow(/not available/);
  });

  it("enforces conditions and applies selected costs and rewards in order", () => {
    const start = createRunSession(8, "literature-demo", demoContent, eventMap);
    const opened = enterRunNode(start, availableRunNodes(start)[0]!.id, demoContent, demoEnemyAi, demoEncounterTable);
    const board = { ...opened.run, event: { ...opened.run.event!, eventId: "after-school-board" } };
    expect(availableEventChoices({ ...board, gold: 0 }, demoContent).find((item) => item.choice.id === "borrow")?.available).toBe(false);
    expect(() => resolveEventChoice({ ...board, gold: 0 }, "borrow", demoContent)).toThrow(/conditions/);
    const borrowed = chooseRunEventChoice({ ...opened, run: board }, "borrow", demoContent, demoEnemyAi);
    expect(borrowed.run.gold).toBe(40);
    expect(borrowed.run.deck.at(-1)?.cardId).toBe("BASE-007");
    expect(borrowed.screen).toBe("map");
    const box = { ...opened.run, event: { ...opened.run.event!, eventId: "collection-box" } };
    expect(availableEventChoices(box, demoContent).find((item) => item.choice.id === "recover")?.available).toBe(false);
    const injured = { ...box, player: { ...box.player, hp: 17 } };
    const healed = chooseRunEventChoice({ ...opened, run: injured }, "recover", demoContent, demoEnemyAi);
    expect(healed.run.player.hp).toBe(21);
    expect(parseRunState(healed.run, demoContent)).toEqual(healed.run);
  });
});
