import { describe, expect, it } from "vitest";
import { demoContent, demoEnemyAi, demoEventPools, demoRunContentTables } from "../../src/content/demo-battle.js";
import { extraEvents } from "../../src/content/extra-events.js";
import { availableEventChoices } from "../../src/domain/events.js";
import { chooseRunEventChoice, createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { deserializeRunSession, serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";

function eventSession(act: 1 | 2 | 3, eventId?: string) {
  const base = createRunSession(42, "literature-demo", demoContent);
  const start: MapNode = { id: `a${act}-start`, act, floor: 0, kind: "start", nextIds: [`a${act}-event`] };
  const node: MapNode = { id: `a${act}-event`, act, floor: 1, kind: "event", nextIds: [] };
  const session = { ...base, run: { ...base.run, act, map: { currentNodeId: start.id, nodes: [start, node] } }, completedNodeIds: [start.id] };
  const opened = enterRunNode(session, node.id, demoContent, demoEnemyAi, demoRunContentTables);
  return eventId ? { ...opened, run: { ...opened.run, event: { ...opened.run.event!, eventId } } } : opened;
}

describe("expanded Act events", () => {
  it("draws all four distinct events per Act reproducibly and survives save/load", () => {
    for (const act of [1, 2, 3] as const) {
      expect(new Set(demoEventPools[act]).size).toBe(4);
      const opened = eventSession(act);
      expect(demoEventPools[act]).toContain(opened.run.event?.eventId);
      expect(eventSession(act)).toEqual(opened);
      const saved = serializeRunSession(opened, demoContent, { nowMs: () => 0 }, () => "discard");
      expect(deserializeRunSession(saved, demoContent, { nowMs: () => 1000 })).toEqual(opened);
    }
    expect(extraEvents).toHaveLength(6);
    expect(new Set(extraEvents.map((event) => event.id)).size).toBe(6);
  });

  it("guards HP, gold and potion costs without consuming the event on failed choices", () => {
    const session = eventSession(1, "gym-supply-locker");
    const poor = { ...session.run, gold: 0, player: { ...session.run.player, hp: 3 } };
    const choices = availableEventChoices(poor, demoContent);
    expect(choices.find((item) => item.choice.id === "leave")?.available).toBe(true);
    expect(choices.find((item) => item.choice.id === "sort")?.available).toBe(false);
    expect(choices.find((item) => item.choice.id === "potion")?.available).toBe(false);
    expect(() => chooseRunEventChoice({ ...session, run: poor }, "sort", demoContent, demoEnemyAi)).toThrow(/conditions/);
    const work = chooseRunEventChoice(session, "sort", demoContent, demoEnemyAi);
    expect(work.run.player.hp).toBe(session.run.player.hp - 3);
    expect(work.run.gold).toBe(session.run.gold + 20);
    expect(work.screen).toBe("map");
    const full = { ...session.run, potionIds: ["potion-heal", "potion-ink", "potion-time"] };
    expect(availableEventChoices(full, demoContent).find((item) => item.choice.id === "potion")?.available).toBe(false);
  });

  it("applies every new resource branch and connects battle branches to the right enemies", () => {
    const cases: { act: 1 | 2 | 3; eventId: string; choiceId: string; gold?: number; hp?: number; card?: string; potion?: string; enemy?: string }[] = [
      { act: 1, eventId: "gym-supply-locker", choiceId: "potion", gold: -12, potion: "potion-heal" },
      { act: 1, eventId: "unfinished-draft", choiceId: "rewrite", gold: -10, card: "BASE-014" },
      { act: 1, eventId: "unfinished-draft", choiceId: "protect", hp: -2, card: "BASE-002" },
      { act: 2, eventId: "lab-cleanup", choiceId: "ink", hp: -4, potion: "potion-ink" },
      { act: 2, eventId: "lab-cleanup", choiceId: "notes", gold: -15, card: "BASE-010" },
      { act: 2, eventId: "lab-cleanup", choiceId: "fight", enemy: "safety-sign" },
      { act: 2, eventId: "stairwell-memo", choiceId: "study", gold: -12, card: "BASE-012" },
      { act: 2, eventId: "stairwell-memo", choiceId: "rest", gold: -8, hp: 5 },
      { act: 2, eventId: "stairwell-memo", choiceId: "fight", enemy: "stairwell-echo" },
      { act: 3, eventId: "exam-material-box", choiceId: "focus", gold: -20, card: "BASE-020" },
      { act: 3, eventId: "exam-material-box", choiceId: "strike", hp: -5, card: "BASE-003" },
      { act: 3, eventId: "last-train-board", choiceId: "rest", gold: -10, hp: 7 },
      { act: 3, eventId: "last-train-board", choiceId: "clock", hp: -4, potion: "potion-time" },
      { act: 3, eventId: "last-train-board", choiceId: "fight", enemy: "night-announcement" },
    ];
    for (const item of cases) {
      const opened = eventSession(item.act, item.eventId);
      const run = { ...opened.run, player: { ...opened.run.player, hp: 20 }, gold: 50, potionIds: [] };
      const result = chooseRunEventChoice({ ...opened, run }, item.choiceId, demoContent, demoEnemyAi);
      expect(result.run.gold, `${item.eventId}/${item.choiceId}`).toBe(50 + (item.gold ?? 0));
      expect(result.run.player.hp, `${item.eventId}/${item.choiceId}`).toBe(Math.min(40, 20 + (item.hp ?? 0)));
      if (item.card) expect(result.run.deck.at(-1)?.cardId).toBe(item.card);
      if (item.potion) expect(result.run.potionIds).toEqual([item.potion]);
      if (item.enemy) {
        expect(result.screen).toBe("combat");
        expect(result.run.combat?.enemies[0]?.enemyId).toBe(item.enemy);
      } else expect(result.screen).toBe("map");
    }
  });
});
