import { readFile } from "node:fs/promises";
import console from "node:console";
import process from "node:process";
import { URL } from "node:url";

export const TARGET_RUN_MS = 60 * 60 * 1_000;
const CLUB_IDS = ["literature-demo", "science-demo", "kendo-demo", "music-demo", "art-demo"];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round((sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2);
}

function range(values) {
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

function validRecord(value) {
  if (!value || ![1, 2].includes(value.formatVersion) || typeof value.runId !== "string" || !CLUB_IDS.includes(value.clubId)
    || !Number.isSafeInteger(value.activeMs) || value.activeMs < 0 || !["won", "lost", null].includes(value.result)
    || typeof value.partial !== "boolean" || !Array.isArray(value.visits) || !Array.isArray(value.battleNodeIds)
    || (value.battles !== undefined && !Array.isArray(value.battles))
    || (value.formatVersion === 2 && (typeof value.contentPartial !== "boolean" || !Array.isArray(value.contentEvents)))) throw new Error("invalid playtest record");
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

function encounterSamples(record) {
  if (record.partial || record.result === null || !Array.isArray(record.battles)
    || record.battles.length === 0 || record.battles.length !== record.battleNodeIds.length) return null;
  const battles = record.battles;
  if (!battles.every((battle) => !battle.partial && (battle.result === "won" || battle.result === "lost")
    && Number.isSafeInteger(battle.act) && battle.act >= 1 && battle.act <= 3
    && Array.isArray(battle.enemyIds) && battle.enemyIds.length > 0
    && battle.enemyIds.every((id) => typeof id === "string" && id.length > 0))) return null;
  return battles;
}

function encounterVariety(records) {
  const runs = records.map(encounterSamples).filter((samples) => samples !== null);
  const byAct = [1, 2, 3].map((act) => ({ act, battles: 0, repeatedBattles: 0, distinctEnemyIds: 0 }));
  const enemyIdsByAct = [new Set(), new Set(), new Set()];
  const repeatsPerRun = [];
  for (const battles of runs) {
    const seen = new Set();
    let repeated = 0;
    for (const battle of battles) {
      const index = battle.act - 1;
      const signature = `${battle.act}:${[...battle.enemyIds].sort().join("|")}`;
      if (seen.has(signature)) { byAct[index].repeatedBattles++; repeated++; }
      else seen.add(signature);
      byAct[index].battles++;
      for (const enemyId of battle.enemyIds) enemyIdsByAct[index].add(enemyId);
    }
    repeatsPerRun.push(repeated);
  }
  for (let index = 0; index < 3; index++) byAct[index].distinctEnemyIds = enemyIdsByAct[index].size;
  return {
    runsWithUsableEncounterRecords: runs.length,
    medianRepeatedBattlesPerRun: median(repeatsPerRun),
    byAct,
  };
}

function observedVisits(records) {
  const kinds = {};
  let runs = 0;
  for (const record of records) {
    if (record.partial || record.result === null) continue;
    if (record.visits.length) runs++;
    for (const visit of record.visits) {
      if (typeof visit.kind !== "string" || !visit.kind) continue;
      kinds[visit.kind] = (kinds[visit.kind] ?? 0) + 1;
    }
  }
  return { fullRunsWithVisits: runs, visitKinds: kinds };
}

function usableContentEvents(record) {
  if (record.formatVersion !== 2 || record.partial || record.contentPartial || record.result === null) return null;
  const visited = new Map(record.visits.map((visit) => [visit.nodeId, visit.act]));
  const ids = new Set();
  if (!record.contentEvents.every((event) => {
    if (!event || typeof event.eventId !== "string" || ids.has(event.eventId)
      || visited.get(event.nodeId) !== event.act || !Number.isSafeInteger(event.atActiveMs)
      || event.atActiveMs < 0 || event.atActiveMs > record.activeMs
      || (event.contentId !== null && (typeof event.contentId !== "string" || !event.contentId))
      || (event.offerId !== null && (typeof event.offerId !== "string" || !event.offerId))
      || ![true, false, null].includes(event.available)
      || !["offered", "selected", "skipped", "acquired", "consumed", "discarded"].includes(event.action)
      || !["card", "relic", "potion", "event_choice"].includes(event.kind)
      || !["reward", "treasure", "shop", "event", "combat"].includes(event.source)
      || (event.source === "event" && event.kind === "event_choice" && (!event.contentId || !event.offerId))) return false;
    ids.add(event.eventId);
    return true;
  })) return null;
  return record.contentEvents;
}

function emptyContentCount() {
  return { offered: 0, availableOffers: 0, unavailableOffers: 0, unknownAvailabilityOffers: 0,
    selected: 0, skipped: 0, acquired: 0, consumed: 0, discarded: 0,
    repeatedOffers: 0, eventsShown: 0, repeatedEvents: 0, selectionRate: null };
}

function contentExposure(records) {
  const usable = records.map(usableContentEvents).filter((events) => events !== null);
  const byAct = [1, 2, 3].map((act) => ({ act, ...emptyContentCount(), bySource: {} }));
  for (const events of usable) {
    const seen = new Set();
    const seenEventNodes = new Set();
    const seenEventTypes = new Set();
    for (const event of events) {
      const act = byAct[event.act - 1];
      const source = act.bySource[event.source] ??= emptyContentCount();
      act[event.action]++;
      source[event.action]++;
      if (event.action === "offered") {
        if (event.source === "event" && event.kind === "event_choice") {
          const nodeKey = `${event.act}:${event.nodeId}`;
          if (!seenEventNodes.has(nodeKey)) {
            seenEventNodes.add(nodeKey);
            act.eventsShown++;
            source.eventsShown++;
            const typeKey = `${event.act}:${event.contentId}`;
            if (seenEventTypes.has(typeKey)) { act.repeatedEvents++; source.repeatedEvents++; }
            else seenEventTypes.add(typeKey);
          }
        }
        const availabilityKey = event.available === true ? "availableOffers"
          : event.available === false ? "unavailableOffers" : "unknownAvailabilityOffers";
        act[availabilityKey]++;
        source[availabilityKey]++;
        const key = JSON.stringify([event.act, event.kind, event.contentId,
          event.kind === "event_choice" ? event.offerId : null]);
        if (seen.has(key)) { act.repeatedOffers++; source.repeatedOffers++; }
        else seen.add(key);
      }
    }
  }
  for (const act of byAct) {
    act.selectionRate = act.offered ? act.selected / act.offered : null;
    for (const count of Object.values(act.bySource)) count.selectionRate = count.offered ? count.selected / count.offered : null;
  }
  return { runsWithUsableContentRecords: usable.length, byAct };
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
      rangeTerminalMs: range(terminal.map((record) => record.activeMs)),
      medianWonMs, rangeWonMs: range(won.map((record) => record.activeMs)),
      wonGapToTargetMs: medianWonMs === null ? null : medianWonMs - TARGET_RUN_MS,
      battlesRecorded: battles.length, battlesWithHpAndTime: finishedBattles.length,
      medianBattleMs: median(finishedBattles.map((battle) => battle.endedAtActiveMs - battle.startedAtActiveMs)),
      totalHpLoss: finishedBattles.reduce((sum, battle) => sum + Math.max(0, battle.hpBefore - battle.hpAfter), 0),
      medianActMs: [0, 1, 2].map((index) => median(acts.map((durations) => durations[index]).filter((value) => value !== null))),
      encounterVariety: encounterVariety(records),
      observedVisits: observedVisits(records),
      contentExposure: contentExposure(records),
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
