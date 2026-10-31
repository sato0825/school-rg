import type { MapNode } from "../domain/schema.js";

export const MAP_ROW_HEIGHT = 96;
export type VisibleFloor = Pick<MapNode, "act" | "floor">;
export type RouteSegment = { fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number; state: "visited" | "available" | "future" };

/** Project existing map connections into a display grid without changing route rules. */
export function mapRouteSegments(
  nodes: readonly MapNode[], floors: readonly VisibleFloor[], currentId: string,
  availableIds: ReadonlySet<string>, completedIds: ReadonlySet<string>,
): RouteSegment[] {
  const positions = new Map<string, { x: number; y: number }>();
  floors.forEach((floor, rowIndex) => {
    const row = nodes.filter((node) => node.act === floor.act && node.floor === floor.floor);
    row.forEach((node, index) => positions.set(node.id, { x: (index + .5) * 1_000 / row.length, y: (rowIndex + .5) * MAP_ROW_HEIGHT }));
  });
  return nodes.flatMap((node) => node.nextIds.flatMap((toId) => {
    const from = positions.get(node.id);
    const to = positions.get(toId);
    if (!from || !to) return [];
    const state = completedIds.has(node.id) && completedIds.has(toId) ? "visited"
      : node.id === currentId && availableIds.has(toId) ? "available" : "future";
    return [{ fromId: node.id, toId, x1: from.x, y1: from.y, x2: to.x, y2: to.y, state }];
  }));
}
