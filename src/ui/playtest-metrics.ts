import * as z from "zod";
import type { MapNode, RunState } from "../domain/schema.js";

const nonnegative = z.number().int().nonnegative().safe();
const VisitSchema = z.strictObject({ nodeId: z.string().min(1), act: z.number().int().min(1).max(3),
  kind: z.enum(["start", "combat", "elite", "event", "shop", "rest", "treasure", "boss"]), atActiveMs: nonnegative });
export const PlaytestRecordSchema = z.strictObject({
  formatVersion: z.literal(1), runId: z.string().min(1), clubId: z.string().min(1), seed: nonnegative,
  ascensionLevel: nonnegative, partial: z.boolean(), activeMs: nonnegative,
  visits: z.array(VisitSchema), battleNodeIds: z.array(z.string().min(1)), result: z.enum(["won", "lost"]).nullable(),
});
export type PlaytestRecord = z.infer<typeof PlaytestRecordSchema>;
export type PlaytestTracker = { record: PlaytestRecord; lastAtMs: number; active: boolean };

function validNow(nowMs: number): void {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new RangeError("playtest clock must be a nonnegative safe integer");
}

export function startPlaytest(run: RunState, runId: string, nowMs: number, partial = false): PlaytestTracker {
  validNow(nowMs);
  if (!runId) throw new RangeError("playtest run ID is required");
  return { record: { formatVersion: 1, runId, clubId: run.clubId, seed: run.seed, ascensionLevel: run.ascensionLevel ?? 0,
    partial, activeMs: 0, visits: [], battleNodeIds: [], result: null }, lastAtMs: nowMs, active: true };
}

export function resumePlaytest(record: PlaytestRecord, run: RunState, nowMs: number, active = true): PlaytestTracker {
  validNow(nowMs);
  const parsed = PlaytestRecordSchema.parse(record);
  if (parsed.clubId !== run.clubId || parsed.seed !== run.seed || parsed.ascensionLevel !== (run.ascensionLevel ?? 0)) {
    throw new RangeError("playtest record does not match the run");
  }
  return { record: parsed, lastAtMs: nowMs, active: active && parsed.result === null };
}

/** Charge the interval that was active before this observation, then change activity state. */
export function observePlaytest(tracker: PlaytestTracker, nowMs: number, active: boolean): PlaytestTracker {
  validNow(nowMs);
  if (nowMs < tracker.lastAtMs) throw new RangeError("playtest clock moved backwards");
  const delta = tracker.active && tracker.record.result === null ? nowMs - tracker.lastAtMs : 0;
  const activeMs = tracker.record.activeMs + delta;
  if (!Number.isSafeInteger(activeMs)) throw new RangeError("playtest duration overflow");
  return { record: { ...tracker.record, activeMs }, lastAtMs: nowMs, active: active && tracker.record.result === null };
}

export function visitPlaytestNode(tracker: PlaytestTracker, node: MapNode): PlaytestTracker {
  if (tracker.record.visits.some((visit) => visit.nodeId === node.id)) return tracker;
  return { ...tracker, record: { ...tracker.record,
    visits: [...tracker.record.visits, { nodeId: node.id, act: node.act, kind: node.kind, atActiveMs: tracker.record.activeMs }] } };
}

export function recordPlaytestBattle(tracker: PlaytestTracker, nodeId: string): PlaytestTracker {
  if (tracker.record.battleNodeIds.includes(nodeId)) return tracker;
  return { ...tracker, record: { ...tracker.record, battleNodeIds: [...tracker.record.battleNodeIds, nodeId] } };
}

export function finishPlaytest(tracker: PlaytestTracker, result: "won" | "lost", nowMs: number): PlaytestTracker {
  const observed = observePlaytest(tracker, nowMs, false);
  return { ...observed, record: { ...observed.record, result } };
}

export function parsePlaytestRecord(value: unknown): PlaytestRecord {
  return PlaytestRecordSchema.parse(value);
}

export function formatPlaytestTime(activeMs: number): string {
  const seconds = Math.floor(activeMs / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
