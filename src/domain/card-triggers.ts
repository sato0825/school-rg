import type { CardLifecycleEvent } from "./card-keywords.js";
import type { RunState } from "./schema.js";

export type CardTrigger = {
  id: string;
  on: CardLifecycleEvent["kind"];
  apply: (run: RunState, event: CardLifecycleEvent) => RunState;
};

export type CardTriggerTrace = { triggerId: string; instanceId: string; eventKind: CardLifecycleEvent["kind"] };

/** Event order, then declared trigger order, is the stable resolution order. */
export function resolveCardLifecycleTriggers(
  run: RunState,
  events: readonly CardLifecycleEvent[],
  triggers: readonly CardTrigger[],
): { run: RunState; trace: CardTriggerTrace[] } {
  if (!run.combat) throw new Error("combat is required");
  const triggerIds = new Set<string>();
  for (const trigger of triggers) {
    if (!trigger.id || triggerIds.has(trigger.id)) throw new RangeError(`duplicate or empty card trigger ID: ${trigger.id}`);
    triggerIds.add(trigger.id);
  }
  const trace: CardTriggerTrace[] = [];
  let current = run;
  for (const event of events) {
    if (!current.combat?.cards.some((card) => card.instanceId === event.instanceId)) {
      throw new RangeError(`unknown card instance in lifecycle event: ${event.instanceId}`);
    }
    for (const trigger of triggers) {
      if (trigger.on !== event.kind) continue;
      const next = trigger.apply(current, event);
      if (!next.combat?.cards.some((card) => card.instanceId === event.instanceId)) {
        throw new Error(`card trigger lost its event card reference: ${trigger.id}`);
      }
      current = next;
      trace.push({ triggerId: trigger.id, instanceId: event.instanceId, eventKind: event.kind });
    }
  }
  return { run: current, trace };
}
