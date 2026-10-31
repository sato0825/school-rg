import type { MapNode } from "../domain/schema.js";
import type { RunSession } from "../domain/run-flow.js";
import { MAP_ROW_HEIGHT, mapRouteSegments } from "./map-layout.js";

const kindLabels: Record<MapNode["kind"], string> = {
  start: "開始", combat: "戦闘", elite: "強敵", event: "出来事", shop: "購買", rest: "休憩", treasure: "宝箱", boss: "ボス",
};
const kindMarks: Record<MapNode["kind"], string> = {
  start: "◆", combat: "✦", elite: "✧", event: "?", shop: "▣", rest: "☕", treasure: "◇", boss: "★",
};

function html(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** A read-only projection of the run map during combat. Route selection stays on the map screen. */
export function battleMapOverlayMarkup(session: RunSession): string {
  const { run } = session;
  const current = run.map.nodes.find((node) => node.id === run.map.currentNodeId);
  if (!current) throw new RangeError(`unknown current node: ${run.map.currentNodeId}`);
  const nodes = run.map.nodes.filter((node) => node.act === run.act);
  const floors = [...new Map(nodes.map((node) => [node.floor, { act: node.act, floor: node.floor }])).values()]
    .sort((a, b) => a.floor - b.floor);
  const nextIds = new Set(current.nextIds);
  const routeSegments = mapRouteSegments(nodes, floors, current.id, nextIds, new Set(session.completedNodeIds));
  const lines = routeSegments.map((segment) => `<path class="route-${segment.state}" data-from="${html(segment.fromId)}" data-to="${html(segment.toId)}" d="M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}" />`).join("");
  const rows = floors.map(({ floor }) => `<li class="battle-map-floor" ${floor === current.floor ? 'data-current-floor="true"' : ""}><span class="battle-map-floor-label">${floor === 0 ? "START" : `${floor}F`}</span><div class="battle-map-floor-nodes">${nodes.filter((node) => node.floor === floor).map((node) => {
    const state = node.id === current.id ? "current" : nextIds.has(node.id) ? "next" : session.completedNodeIds.includes(node.id) ? "visited" : "future";
    const status = state === "current" ? "現在地" : state === "next" ? "戦闘後の候補" : state === "visited" ? "通過済み" : "未到達";
    return `<div class="battle-map-node kind-${node.kind} ${state}" data-node-id="${html(node.id)}" aria-label="${floor}階 ${html(kindLabels[node.kind])}、${status}"><span aria-hidden="true">${kindMarks[node.kind]}</span><small>${html(kindLabels[node.kind])}</small></div>`;
  }).join("")}</div></li>`).join("");

  return `<div class="battle-map-overlay" data-role="battle-map-overlay">
    <button type="button" class="battle-map-scrim" data-action="close-battle-map" aria-label="経路マップを閉じる"></button>
    <aside id="battle-map-panel" class="battle-map-panel" role="region" aria-labelledby="battle-map-title" aria-describedby="battle-map-context">
      <header class="battle-map-heading"><div><span>ACT ${run.act} / ROUTE</span><h2 id="battle-map-title">校内経路</h2></div><button type="button" class="battle-map-close" data-action="close-battle-map">閉じる <kbd>Esc</kbd></button></header>
      <p id="battle-map-context" class="battle-map-context"><strong>${current.floor}階 · ${html(kindLabels[current.kind])}</strong><span>現在地</span><span class="battle-map-next-count">次の候補 ${nextIds.size}</span></p>
      <div class="battle-map-scroll" aria-label="Act ${run.act} の経路、戦闘中は閲覧のみ"><div class="battle-map-track"><svg viewBox="0 0 1000 ${floors.length * MAP_ROW_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg><ol class="battle-map-floors">${rows}</ol></div></div>
      <footer class="battle-map-footer"><span><i class="battle-map-key-current"></i>現在地</span><span><i class="battle-map-key-next"></i>戦闘後の候補</span><span>ここでは行き先を選べません</span></footer>
    </aside>
  </div>`;
}
