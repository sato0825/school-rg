import * as z from "zod";
import type { MapNode, RunState } from "../domain/schema.js";

const nonnegative = z.number().int().nonnegative().safe();
const VisitSchema = z.strictObject({ nodeId: z.string().min(1), act: z.number().int().min(1).max(3),
  kind: z.enum(["start", "combat", "elite", "event", "shop", "rest", "treasure", "boss"]), atActiveMs: nonnegative });
const BattleSampleSchema = z.strictObject({
  nodeId: z.string().min(1), act: z.number().int().min(1).max(3),
  enemyIds: z.array(z.string().min(1)).min(1), startedAtActiveMs: nonnegative, endedAtActiveMs: nonnegative.nullable(),
  hpBefore: nonnegative, hpAfter: nonnegative.nullable(), turns: nonnegative.nullable(),
  result: z.enum(["won", "lost"]).nullable(),
});
export const PlaytestRecordSchema = z.strictObject({
  formatVersion: z.literal(1), runId: z.string().min(1), clubId: z.string().min(1), seed: nonnegative,
  ascensionLevel: nonnegative, partial: z.boolean(), activeMs: nonnegative,
  visits: z.array(VisitSchema), battleNodeIds: z.array(z.string().min(1)),
  battles: z.array(BattleSampleSchema).default([]), result: z.enum(["won", "lost"]).nullable(),
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
    partial, activeMs: 0, visits: [], battleNodeIds: [], battles: [], result: null }, lastAtMs: nowMs, active: true };
}

export function resumePlaytest(record: PlaytestRecord, run: RunState, runId: string, nowMs: number, active = true): PlaytestTracker {
  validNow(nowMs);
  const parsed = PlaytestRecordSchema.parse(record);
  if (parsed.runId !== runId || parsed.clubId !== run.clubId || parsed.seed !== run.seed || parsed.ascensionLevel !== (run.ascensionLevel ?? 0)) {
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

export function recordPlaytestBattle(tracker: PlaytestTracker, run: RunState): PlaytestTracker {
  if (!run.combat) throw new RangeError("playtest battle requires active combat");
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new RangeError("playtest battle node is missing");
  if (tracker.record.battles.some((battle) => battle.nodeId === node.id)) return tracker;
  return { ...tracker, record: { ...tracker.record,
    battleNodeIds: tracker.record.battleNodeIds.includes(node.id) ? tracker.record.battleNodeIds : [...tracker.record.battleNodeIds, node.id],
    battles: [...tracker.record.battles, { nodeId: node.id, act: node.act, enemyIds: run.combat.enemies.map((enemy) => enemy.enemyId),
      startedAtActiveMs: tracker.record.activeMs, endedAtActiveMs: null, hpBefore: run.player.hp, hpAfter: null, turns: null, result: null }],
  } };
}

export function finishPlaytestBattle(tracker: PlaytestTracker, run: RunState, result: "won" | "lost"): PlaytestTracker {
  const started = recordPlaytestBattle(tracker, run);
  return { ...started, record: { ...started.record, battles: started.record.battles.map((battle) =>
    battle.nodeId === run.map.currentNodeId && battle.result === null
      ? { ...battle, endedAtActiveMs: started.record.activeMs, hpAfter: run.player.hp, turns: run.combat!.turn, result }
      : battle) } };
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
