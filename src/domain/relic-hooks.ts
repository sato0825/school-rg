import { createEventQueue, enqueueEvent, takeNextDueEvent } from "./event-queue.js";
import type { ContentRegistry, RunState } from "./schema.js";

export type RelicEventKind = "acquired" | "combat_start" | "card_used" | "hit_taken" | "turn_start" | "turn_end" | "combat_end";
export type RelicEvent = {
  id: string;
  kind: RelicEventKind;
  cardInstanceId?: string;
  hpLost?: number;
};
export type RelicRule = {
  id: string;
  on: RelicEventKind;
  priority: number;
  stackMode: "each" | "aggregate";
  condition?: (run: RunState, event: RelicEvent) => boolean;
  apply: (run: RunState, event: RelicEvent, stacks: number) => RunState;
};
export type RelicHookTrace = { eventId: string; relicId: string; ruleId: string; stacks: number };

/** Adding a copy is explicit; the configured rule determines whether copies fire separately. */
export function acquireRelic(run: RunState, relicId: string, content: ContentRegistry): RunState {
  if (!content.relics.some((relic) => relic.id === relicId)) throw new RangeError(`unknown relic: ${relicId}`);
  return { ...run, relicIds: [...run.relicIds, relicId] };
}

export function emitRelicEvent(
  run: RunState,
  kind: RelicEventKind,
  rules: readonly RelicRule[],
  content: ContentRegistry,
  detail: Omit<RelicEvent, "id" | "kind"> = {},
): { run: RunState; trace: RelicHookTrace[] } {
  const counter = run.relicEventCounter ?? 0;
  if (!Number.isSafeInteger(counter) || counter === Number.MAX_SAFE_INTEGER) throw new RangeError("relic event counter exhausted");
  return resolveRelicHooks({ ...run, relicEventCounter: counter + 1 }, [{ id: `event-${counter}`, kind, ...detail }], rules, content);
}

/** Stable event and rule order; the history is saved with the run before handlers execute. */
export function resolveRelicHooks(
  run: RunState,
  events: readonly RelicEvent[],
  rules: readonly RelicRule[],
  content: ContentRegistry,
): { run: RunState; trace: RelicHookTrace[] } {
  const ruleIds = new Set<string>();
  for (const rule of rules) {
    if (!rule.id || ruleIds.has(rule.id)) throw new RangeError(`duplicate or empty relic rule ID: ${rule.id}`);
    if (!Number.isSafeInteger(rule.priority)) throw new RangeError(`invalid relic priority: ${rule.id}`);
    ruleIds.add(rule.id);
  }
  const contentById = new Map(content.relics.map((relic) => [relic.id, relic]));
  let queue = createEventQueue<RelicEvent>();
  for (const event of events) {
    if (!event.id) throw new RangeError("relic event ID is required");
    queue = enqueueEvent(queue, 0, event);
  }
  const trace: RelicHookTrace[] = [];
  let current = run;
  for (;;) {
    const taken = takeNextDueEvent(queue, 0);
    if (!taken.event) break;
    queue = taken.queue;
    const event = taken.event.payload;
    const groups = new Map<string, { relicId: string; count: number; ownerIndex: number }>();
    current.relicIds.forEach((relicId, ownerIndex) => {
      const relic = contentById.get(relicId);
      if (!relic) throw new RangeError(`unknown owned relic: ${relicId}`);
      const group = groups.get(relicId);
      if (group) group.count++;
      else groups.set(relicId, { relicId, count: 1, ownerIndex });
    });
    const jobs = [...groups.values()].flatMap((group) => {
      const relic = contentById.get(group.relicId)!;
      return relic.triggerIds.map((ruleId, declarationIndex) => ({ group, ruleId, declarationIndex, rule: rules.find((item) => item.id === ruleId) }));
    }).filter((job) => job.rule?.on === event.kind)
      .sort((a, b) => a.rule!.priority - b.rule!.priority || a.group.ownerIndex - b.group.ownerIndex || a.declarationIndex - b.declarationIndex);
    for (const job of jobs) {
      const rule = job.rule!;
      const count = rule.stackMode === "aggregate" ? 1 : job.group.count;
      for (let stack = 0; stack < count; stack++) {
        const historyKey = `${event.id}.${job.group.relicId}.${rule.id}.${stack}`;
        if (current.relicHookHistory?.includes(historyKey)) continue;
        if (rule.condition && !rule.condition(current, event)) continue;
        const marked: RunState = { ...current, relicHookHistory: [...(current.relicHookHistory ?? []), historyKey] };
        current = rule.apply(marked, event, rule.stackMode === "aggregate" ? job.group.count : 1);
        if (!current.relicHookHistory?.includes(historyKey)) throw new Error(`relic rule lost event history: ${rule.id}`);
        trace.push({ eventId: event.id, relicId: job.group.relicId, ruleId: rule.id, stacks: rule.stackMode === "aggregate" ? job.group.count : 1 });
      }
    }
  }
  return { run: current, trace };
}
