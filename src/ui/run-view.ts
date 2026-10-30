import { availableRunNodes, type RunSession } from "../domain/run-flow.js";
import type { ContentRegistry, MapNode } from "../domain/schema.js";
import { describeCard } from "./battle-view.js";
import type { BattleArt } from "./battle-view.js";

const kindNames: Record<MapNode["kind"], string> = {
  start: "開始", combat: "戦闘", elite: "強敵", event: "イベント", shop: "購買", rest: "休憩", treasure: "宝箱", boss: "ボス",
};
const kindIcons: Record<MapNode["kind"], string> = {
  start: "◆", combat: "✦", elite: "✧", event: "?", shop: "▣", rest: "☕", treasure: "◇", boss: "★",
};

function html(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function shell(title: string, body: string, art: BattleArt): string {
  return `<main class="run-screen" style="background-image:url('${html(art.stageUrl)}')"><div class="run-scrim"></div><header class="run-header"><div class="brand"><span class="brand-mark">✦</span><div><small>SCHOOL ROGUELIKE</small><h1>学園タイピングローグライク</h1></div></div><strong>${html(title)}</strong></header>${body}</main>`;
}

export function renderRunMap(root: HTMLElement, session: RunSession, art: BattleArt): void {
  const run = session.run;
  const current = run.map.nodes.find((node) => node.id === run.map.currentNodeId)!;
  const available = new Set(availableRunNodes(session).map((node) => node.id));
  const visibleNodes = run.map.nodes.filter((node) => node.act === run.act || available.has(node.id));
  const floors = [...new Map(visibleNodes.map((node) => [`${node.act}:${node.floor}`, { act: node.act, floor: node.floor }])).values()]
    .sort((a, b) => a.act - b.act || a.floor - b.floor);
  const rows = floors.map(({ act, floor }) => `<div class="map-floor"><span class="map-floor-label">${act === run.act ? (floor === 0 ? "START" : `${floor}F`) : `ACT ${act} START`}</span><div class="map-floor-nodes">${visibleNodes.filter((node) => node.act === act && node.floor === floor).map((node) => {
    const enabled = available.has(node.id);
    const visited = session.completedNodeIds.includes(node.id);
    return `<button type="button" class="map-node ${node.id === current.id ? "current" : ""} ${visited ? "visited" : ""} ${enabled ? "available" : ""}" data-action="enter-node" data-id="${node.id}" ${enabled ? "" : "disabled"} aria-label="${floor}階 ${html(kindNames[node.kind])}${enabled ? " 選択可能" : ""}"><span>${kindIcons[node.kind]}</span><small>${html(kindNames[node.kind])}</small></button>`;
  }).join("")}</div></div>`).join("");
  root.innerHTML = shell(`ACT ${run.act} · ${current.floor}F`, `<section class="map-panel"><div class="map-intro"><span>ROUTE SELECT</span><h2>次の行き先を選ぶ</h2><p>接続された場所だけに進めます。戦闘ではカード名を直接タイプします。</p><div class="map-stats">♥ ${run.player.hp}/${run.player.maxHp} · デッキ ${run.deck.length}枚 · シード ${run.seed}</div></div><div class="map-scroll" aria-label="Act ${run.act} マップ">${rows}</div></section>`, art);
}

export function renderRunReward(root: HTMLElement, session: RunSession, content: ContentRegistry, art: BattleArt): void {
  const cards = session.rewardCardIds.map((cardId) => {
    const card = content.cards.find((item) => item.id === cardId)!;
    return `<button type="button" class="reward-card" data-action="reward-card" data-id="${card.id}"><small>${html(card.type.toUpperCase())}</small><strong>${html(card.input.text)}</strong><span>${html(describeCard(card, content))}</span></button>`;
  }).join("");
  root.innerHTML = shell("戦闘報酬", `<section class="reward-panel"><span class="eyebrow">COMBAT CLEAR</span><h2>カードを1枚選ぶ</h2><p>選んだカードはこのランのデッキへ加わります。</p><div class="reward-options">${cards}</div><button type="button" class="skip-reward" data-action="skip-reward">報酬を受け取らず進む</button><div class="map-stats">♥ ${session.run.player.hp}/${session.run.player.maxHp} · デッキ ${session.run.deck.length}枚</div></section>`, art);
}

export function renderRunResult(root: HTMLElement, session: RunSession, art: BattleArt): void {
  const won = session.screen === "won";
  root.innerHTML = shell(won ? "全Act完走" : "ラン終了", `<section class="reward-panel run-result"><span class="eyebrow">RUN RESULT</span><h2>${won ? "全Actクリア" : "敗北"}</h2><p>${won ? "3つのActのボスを突破しました。" : "次のランで再挑戦できます。"}</p><div class="map-stats">ACT ${session.run.act} · ♥ ${session.run.player.hp}/${session.run.player.maxHp}</div><button type="button" class="skip-reward" data-action="new-run">新しいランを始める</button></section>`, art);
}
