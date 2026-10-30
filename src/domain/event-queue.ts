/** Event payloads are data so queue state can be serialized with a run. */
export interface QueuedEvent<T> {
  sequence: number;
  dueAtMs: number;
  payload: T;
}

export interface EventQueue<T> {
  nextSequence: number;
  pending: QueuedEvent<T>[];
}

export function createEventQueue<T>(): EventQueue<T> {
  return { nextSequence: 0, pending: [] };
}

function assertTimestamp(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("event time must be a nonnegative integer millisecond timestamp");
  }
}

/** Same-time events resolve in insertion order, independent of sort stability. */
export function enqueueEvent<T>(queue: EventQueue<T>, dueAtMs: number, payload: T): EventQueue<T> {
  assertTimestamp(dueAtMs);
  if (!Number.isSafeInteger(queue.nextSequence) || queue.nextSequence < 0 || queue.nextSequence === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("event sequence exhausted");
  }
  const event = { sequence: queue.nextSequence, dueAtMs, payload };
  const pending = [...queue.pending, event];
  pending.sort((left, right) => left.dueAtMs - right.dueAtMs || left.sequence - right.sequence);
  return { nextSequence: queue.nextSequence + 1, pending };
}

/** Take one event at a time so effect resolution can enqueue more events. */
export function takeNextDueEvent<T>(
  queue: EventQueue<T>,
  nowMs: number,
): { queue: EventQueue<T>; event: QueuedEvent<T> | null } {
  assertTimestamp(nowMs);
  const event = queue.pending[0];
  if (!event || event.dueAtMs > nowMs) {
    return { queue, event: null };
  }
  return {
    queue: { nextSequence: queue.nextSequence, pending: queue.pending.slice(1) },
    event,
  };
}
