import * as z from "zod";
import type { RunSession } from "./run-flow.js";

const nonnegative = z.number().int().nonnegative().safe();
const EntrySchema = z.strictObject({
  runId: z.string().min(1), clubId: z.string().min(1), seed: nonnegative,
  ascensionLevel: nonnegative, result: z.enum(["won", "lost"]),
  act: z.number().int().min(1).max(3), floor: nonnegative,
  hp: nonnegative, maxHp: z.number().int().positive().safe(), reachedNodes: z.number().int().positive().safe(),
});
export const RunHistorySchema = z.strictObject({
  formatVersion: z.literal(1), entries: z.array(EntrySchema),
}).refine((history) => new Set(history.entries.map((entry) => entry.runId)).size === history.entries.length,
  "run history has duplicate IDs");
export type RunHistory = z.infer<typeof RunHistorySchema>;
export type RunHistoryEntry = z.infer<typeof EntrySchema>;

export function emptyRunHistory(): RunHistory { return { formatVersion: 1, entries: [] }; }
export function parseRunHistory(value: unknown): RunHistory { return RunHistorySchema.parse(value); }

/** Pre-ID terminal saves need a stable identity even when the active save cannot be rewritten. */
export function legacyTerminalRunId(saved: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < saved.length; index++) {
    const code = saved.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `legacy-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

/** The run ID is persisted with the active save; repeated terminal renders are idempotent. */
export function terminalRunEntry(session: RunSession): RunHistoryEntry {
  if (!session.runId || (session.screen !== "won" && session.screen !== "lost")) throw new RangeError("terminal run with ID required");
  const node = session.run.map.nodes.find((item) => item.id === session.run.map.currentNodeId);
  if (!node) throw new RangeError("terminal run node is missing");
  return EntrySchema.parse({
    runId: session.runId, clubId: session.run.clubId, seed: session.run.seed,
    ascensionLevel: session.run.ascensionLevel ?? 0, result: session.screen,
    act: node.act, floor: node.floor, hp: session.run.player.hp, maxHp: session.run.player.maxHp,
    reachedNodes: new Set([...session.completedNodeIds, node.id]).size,
  });
}

export function appendRunHistory(history: RunHistory, entry: RunHistoryEntry): RunHistory {
  const parsed = parseRunHistory(history);
  const validated = EntrySchema.parse(entry);
  if (parsed.entries.some((item) => item.runId === validated.runId)) return history;
  return { formatVersion: 1, entries: [...parsed.entries, validated] };
}

export function historyCounts(history: RunHistory, clubId: string): { won: number; lost: number } {
  const entries = history.entries.filter((entry) => entry.clubId === clubId);
  return { won: entries.filter((entry) => entry.result === "won").length, lost: entries.filter((entry) => entry.result === "lost").length };
}
