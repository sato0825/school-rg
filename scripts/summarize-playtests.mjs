import { readFile } from "node:fs/promises";

export const TARGET_RUN_MS = 60 * 60 * 1_000;
const CLUB_IDS = ["literature-demo", "science-demo", "kendo-demo", "music-demo", "art-demo"];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round((sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2);
}

function validRecord(value) {
  if (!value || value.formatVersion !== 1 || typeof value.runId !== "string" || !CLUB_IDS.includes(value.clubId)
    || !Number.isSafeInteger(value.activeMs) || value.activeMs < 0 || !["won", "lost", null].includes(value.result)
    || !Array.isArray(value.visits) || !Array.isArray(value.battleNodeIds)
    || (value.battles !== undefined && !Array.isArray(value.battles))) throw new Error("invalid playtest record");
  return value;
}

function actDurations(record) {
  const visits = [...record.visits].sort((a, b) => a.atActiveMs - b.atActiveMs);
  const durations = [null, null, null];
  for (let act = 1; act <= 3; act++) {
    const first = visits.find((visit) => visit.act === act);
    if (!first) continue;
    const nextAct = visits.find((visit) => visit.act > act && visit.atActiveMs >= first.atActiveMs);
    if (nextAct || record.result !== null) durations[act - 1] = (nextAct?.atActiveMs ?? record.activeMs) - first.atActiveMs;
  }
  return durations;
}

export function summarizePlaytests(values) {
  const byRun = new Map();
  for (const value of values) {
    const record = validRecord(value);
    const previous = byRun.get(record.runId);
    if (previous && (previous.clubId !== record.clubId || previous.seed !== record.seed)) throw new Error(`conflicting run ID: ${record.runId}`);
    if (!previous || record.activeMs > previous.activeMs || (record.activeMs === previous.activeMs && record.result !== null)) byRun.set(record.runId, record);
  }
  const clubs = {};
  for (const clubId of CLUB_IDS) {
    const records = [...byRun.values()].filter((record) => record.clubId === clubId);
    const terminal = records.filter((record) => record.result !== null);
    const won = records.filter((record) => record.result === "won");
    const battles = records.flatMap((record) => record.battles ?? []);
    const finishedBattles = battles.filter((battle) => !battle.partial && (battle.result === "won" || battle.result === "lost")
      && Number.isSafeInteger(battle.hpBefore) && Number.isSafeInteger(battle.hpAfter)
      && Number.isSafeInteger(battle.startedAtActiveMs) && Number.isSafeInteger(battle.endedAtActiveMs)
      && battle.endedAtActiveMs >= battle.startedAtActiveMs);
    const acts = records.map(actDurations);
    const medianWonMs = median(won.map((record) => record.activeMs));
    clubs[clubId] = {
      runs: records.length, won: won.length, lost: records.filter((record) => record.result === "lost").length,
      incomplete: records.length - terminal.length,
      completionRate: records.length ? terminal.length / records.length : null,
      winRate: terminal.length ? won.length / terminal.length : null,
      medianTerminalMs: median(terminal.map((record) => record.activeMs)),
      medianWonMs, wonGapToTargetMs: medianWonMs === null ? null : medianWonMs - TARGET_RUN_MS,
      battlesRecorded: battles.length, battlesWithHpAndTime: finishedBattles.length,
      medianBattleMs: median(finishedBattles.map((battle) => battle.endedAtActiveMs - battle.startedAtActiveMs)),
      totalHpLoss: finishedBattles.reduce((sum, battle) => sum + Math.max(0, battle.hpBefore - battle.hpAfter), 0),
      medianActMs: [0, 1, 2].map((index) => median(acts.map((durations) => durations[index]).filter((value) => value !== null))),
    };
  }
  return { targetRunMs: TARGET_RUN_MS, uniqueRuns: byRun.size, inputRecords: values.length,
    note: "incomplete means an exported unfinished snapshot, not confirmed abandonment; missing samples are excluded from medians",
    clubs };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (process.argv.length < 3) {
    console.error("Usage: node scripts/summarize-playtests.mjs <playtest-1.json> [playtest-2.json ...]");
    process.exitCode = 1;
  } else {
    try {
      const records = await Promise.all(process.argv.slice(2).map(async (path) => JSON.parse(await readFile(path, "utf8"))));
      console.log(JSON.stringify(summarizePlaytests(records), null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
