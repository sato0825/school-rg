import { requireSetting } from "./config.js";
import { createRandomState, randomInt, type RandomState } from "./random.js";
import type { MapNode, RunState } from "./schema.js";

export type EncounterKind = Extract<MapNode["kind"], "combat" | "elite" | "event" | "shop" | "rest" | "treasure">;
export type MapGenerationOptions = {
  floorsPerAct: number;
  lanes: number;
  kindWeights: Readonly<Record<EncounterKind, number>>;
};

const issue = "https://github.com/sato0825/school-rg/issues/15";
export const DEFAULT_MAP_SETTINGS = {
  floorsPerAct: { status: "provisional", value: 12, source: issue, ownerIssue: 15 },
  lanes: { status: "provisional", value: 4, source: issue, ownerIssue: 15 },
  kindWeights: { status: "provisional", value: { combat: 55, elite: 8, event: 15, shop: 7, rest: 10, treasure: 5 }, source: issue, ownerIssue: 15 },
} as const;

export const DEFAULT_MAP_OPTIONS: MapGenerationOptions = {
  floorsPerAct: requireSetting(DEFAULT_MAP_SETTINGS.floorsPerAct),
  lanes: requireSetting(DEFAULT_MAP_SETTINGS.lanes),
  kindWeights: requireSetting(DEFAULT_MAP_SETTINGS.kindWeights),
};

const ENCOUNTER_KINDS: EncounterKind[] = ["combat", "elite", "event", "shop", "rest", "treasure"];
/** Provisional route density for #181: one adjacent branch between ordinary floors. */
const BRANCHES_PER_FLOOR = 1;

function validateOptions(options: MapGenerationOptions): number {
  if (!Number.isSafeInteger(options.floorsPerAct) || options.floorsPerAct < 1 || options.floorsPerAct > 100) {
    throw new RangeError("floorsPerAct must be an integer in [1, 100]");
  }
  if (!Number.isSafeInteger(options.lanes) || options.lanes < 2 || options.lanes > 20) {
    throw new RangeError("lanes must be an integer in [2, 20]");
  }
  let total = 0;
  for (const kind of ENCOUNTER_KINDS) {
    const weight = options.kindWeights[kind];
    if (!Number.isSafeInteger(weight) || weight < 0) throw new RangeError(`invalid weight for ${kind}`);
    total += weight;
  }
  if (!Number.isSafeInteger(total) || total < 1 || total > 0xffffffff) throw new RangeError("map weights must have a positive uint32 sum");
  return total;
}

function chooseKind(state: RandomState, options: MapGenerationOptions, totalWeight: number): { state: RandomState; kind: EncounterKind } {
  const draw = randomInt(state, totalWeight);
  let offset = draw.value;
  for (const kind of ENCOUNTER_KINDS) {
    offset -= options.kindWeights[kind];
    if (offset < 0) return { state: draw.state, kind };
  }
  throw new Error("unreachable map weight selection");
}

function id(act: number, floor: number, lane: number): string {
  return `a${act}-f${floor}-n${lane}`;
}

/** One seeded DAG with every node reachable from the first start and able to reach the final boss. */
export function generateRunMap(seed: number, options: MapGenerationOptions = DEFAULT_MAP_OPTIONS): { nodes: MapNode[]; currentNodeId: string; rngState: RandomState } {
  let state = createRandomState(seed);
  const totalWeight = validateOptions(options);
  const nodes: MapNode[] = [];
  for (const act of [1, 2, 3] as const) {
    const start: MapNode = { id: id(act, 0, 0), act, floor: 0, kind: "start", nextIds: [] };
    nodes.push(start);
    let previous: MapNode[] = [start];
    for (let floor = 1; floor <= options.floorsPerAct; floor++) {
      const current: MapNode[] = [];
      for (let lane = 0; lane < options.lanes; lane++) {
        const selected = chooseKind(state, options, totalWeight);
        state = selected.state;
        current.push({ id: id(act, floor, lane), act, floor, kind: selected.kind, nextIds: [] });
      }
      nodes.push(...current);
      if (previous.length === 1) previous[0]!.nextIds = current.map((node) => node.id);
      else {
        // A same-lane spine keeps each node live. A single local fork gives a
        // real choice without the crossing, almost-complete mesh of old maps.
        for (let lane = 0; lane < previous.length; lane++) {
          previous[lane]!.nextIds = [current[lane]!.id];
        }
        for (let branch = 0; branch < BRANCHES_PER_FLOOR; branch++) {
          const gap = randomInt(state, current.length - 1);
          state = gap.state;
          const direction = randomInt(state, 2);
          state = direction.state;
          const source = gap.value + direction.value;
          const target = gap.value + (1 - direction.value);
          previous[source]!.nextIds.push(current[target]!.id);
        }
      }
      previous = current;
    }
    const boss: MapNode = { id: id(act, options.floorsPerAct + 1, 0), act, floor: options.floorsPerAct + 1, kind: "boss", nextIds: [] };
    for (const node of previous) node.nextIds = [boss.id];
    if (act < 3) boss.nextIds = [id(act + 1, 0, 0)];
    nodes.push(boss);
  }
  return { nodes, currentNodeId: id(1, 0, 0), rngState: state };
}

export function availableNextNodes(map: RunState["map"]): MapNode[] {
  const current = map.nodes.find((node) => node.id === map.currentNodeId);
  if (!current) throw new RangeError(`unknown current map node: ${map.currentNodeId}`);
  return current.nextIds.map((nextId) => {
    const node = map.nodes.find((item) => item.id === nextId);
    if (!node) throw new RangeError(`unknown next map node: ${nextId}`);
    return node;
  });
}

/** Encounter completion is handled by #16; movement itself never skips a graph edge. */
export function moveToConnectedNode(run: RunState, nextNodeId: string): RunState {
  if (run.combat) throw new Error("cannot move while combat state exists");
  const next = availableNextNodes(run.map).find((node) => node.id === nextNodeId);
  if (!next) throw new RangeError(`node is not connected: ${nextNodeId}`);
  return { ...run, act: next.act, map: { ...run.map, currentNodeId: next.id } };
}
