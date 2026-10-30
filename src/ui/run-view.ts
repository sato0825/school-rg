import { availableRunNodes, type RunSession } from "../domain/run-flow.js";
import { activeEvent, availableEventChoices } from "../domain/events.js";
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

export function renderRunTitle(root: HTMLElement, art: BattleArt): void {
  root.innerHTML = shell("放課後から始まる", `<section class="front-panel title-panel"><div class="front-copy"><span class="eyebrow">TYPE YOUR NEXT MOVE</span><h2>放課後を、打ち抜く。</h2><p>カード名を入力して行動する、学園タイピングローグライク。</p><div class="front-actions"><button type="button" data-action="open-clubs">ランを始める</button><button type="button" data-action="open-compendium">図鑑を見る</button></div><p class="front-note">現在は文芸部の検証用コンテンツを公開中です。5部活の固有デッキは制作中です。</p></div><img class="front-hero" src="${html(art.heroUrl)}" alt="文芸部の生徒" /></section>`, art);
}

export function renderClubSelect(root: HTMLElement, content: ContentRegistry, art: BattleArt): void {
  const clubs = content.clubs.map((club) => `<button type="button" class="club-choice" data-action="choose-club" data-id="${html(club.id)}"><img src="${html(art.heroUrl)}" alt="" /><span><small>CLUB</small><strong>${html(club.name)}</strong><em>初期HP ${club.startingHp} · デッキ ${club.starterCardIds.length}枚</em></span></button>`).join("");
  root.innerHTML = shell("部活を選ぶ", `<section class="front-panel club-panel"><span class="eyebrow">CHOOSE YOUR CLUB</span><h2>所属する部活を選ぶ</h2><p>部活ごとに初期デッキとカードプールが変わります。</p><div class="club-choices">${clubs}</div><button type="button" class="front-back" data-action="front-back">タイトルへ戻る</button></section>`, art);
}

export function renderCompendium(root: HTMLElement, content: ContentRegistry, art: BattleArt): void {
  const cardRows = content.cards.map((card) => `<li><strong>${html(card.input.text)}</strong><span>${html(describeCard(card, content))}</span></li>`).join("");
  const relicRows = content.relics.map((relic) => `<li><strong>${html(relic.name)}</strong></li>`).join("");
  const potionRows = content.potions.map((potion) => `<li><strong>${html(potion.name)}</strong><span>入力語 ${html(potion.input.text)}</span></li>`).join("");
  const enemyRows = content.enemies.map((enemy) => `<li><strong>${html(enemy.name)}</strong><span>HP ${enemy.maxHp}</span></li>`).join("");
  root.innerHTML = shell("図鑑", `<section class="front-panel compendium-panel"><span class="eyebrow">COMPENDIUM</span><h2>学園図鑑</h2><p>掲載内容は現在の検証用コンテンツです。</p><div class="compendium-list"><details open><summary>カード · ${content.cards.length}</summary><ul>${cardRows}</ul></details><details><summary>レリック · ${content.relics.length}</summary><ul>${relicRows}</ul></details><details><summary>ポーション · ${content.potions.length}</summary><ul>${potionRows}</ul></details><details><summary>敵 · ${content.enemies.length}</summary><ul>${enemyRows}</ul></details></div><button type="button" class="front-back" data-action="front-back">戻る</button></section>`, art);
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
  root.innerHTML = shell(`ACT ${run.act} · ${current.floor}F`, `<section class="map-panel"><div class="map-intro"><span>ROUTE SELECT</span><h2>次の行き先を選ぶ</h2><p>接続された場所だけに進めます。戦闘ではカード名を直接タイプします。</p><div class="map-stats">♥ ${run.player.hp}/${run.player.maxHp} · ${run.gold}G · デッキ ${run.deck.length}枚 · シード ${run.seed}</div><button type="button" class="map-compendium" data-action="open-compendium">図鑑</button></div><div class="map-scroll" aria-label="Act ${run.act} マップ">${rows}</div></section>`, art);
}

export function renderRunReward(root: HTMLElement, session: RunSession, content: ContentRegistry, art: BattleArt): void {
  const cards = session.rewardCardIds.map((cardId) => {
    const card = content.cards.find((item) => item.id === cardId)!;
    return `<button type="button" class="reward-card" data-action="reward-card" data-id="${card.id}"><small>${html(card.type.toUpperCase())}</small><strong>${html(card.input.text)}</strong><span>${html(describeCard(card, content))}</span></button>`;
  }).join("");
  root.innerHTML = shell("戦闘報酬", `<section class="reward-panel"><span class="eyebrow">COMBAT CLEAR</span><h2>カードを1枚選ぶ</h2><p>選んだカードはこのランのデッキへ加わります。</p><div class="reward-options">${cards}</div><button type="button" class="skip-reward" data-action="skip-reward">報酬を受け取らず進む</button><div class="map-stats">♥ ${session.run.player.hp}/${session.run.player.maxHp} · ${session.run.gold}G · デッキ ${session.run.deck.length}枚</div></section>`, art);
}

export function renderRunShop(root: HTMLElement, session: RunSession, content: ContentRegistry, art: BattleArt, message: string): void {
  const shop = session.run.shop;
  if (!shop) throw new Error("shop screen requires active stock");
  const offers = shop.offers.map((offer) => {
    const card = content.cards.find((item) => item.id === offer.cardId)!;
    return `<button type="button" class="reward-card" data-action="buy-offer" data-id="${offer.offerId}" ${offer.purchased ? "disabled" : ""}><small>${html(card.type.toUpperCase())}</small><strong>${html(card.input.text)}</strong><span>${html(describeCard(card, content))}</span><b>${offer.purchased ? "購入済み" : `${offer.price}G`}</b></button>`;
  }).join("");
  const removal = session.run.deck.map((instance) => {
    const card = content.cards.find((item) => item.id === instance.cardId)!;
    return `<button type="button" class="mini-choice" data-action="remove-shop-card" data-id="${instance.instanceId}" ${shop.removalUsed ? "disabled" : ""}>${html(card.input.text)}${instance.upgraded ? "+" : ""}</button>`;
  }).join("");
  root.innerHTML = shell("購買", `<section class="reward-panel economy-panel"><span class="eyebrow">SCHOOL SHOP</span><h2>購買</h2><p>所持金 ${session.run.gold}G。商品は一度ずつ購入できます。</p><div class="reward-options">${offers}</div><div class="economy-section"><h3>カード削除 · ${shop.removalPrice}G</h3><div class="choice-list">${removal}</div></div><button type="button" class="skip-reward" data-action="leave-shop">購買を出る</button><p class="economy-message" role="status">${html(message)}</p></section>`, art);
}

export function renderRunRest(root: HTMLElement, session: RunSession, content: ContentRegistry, art: BattleArt): void {
  const choices = session.run.deck.filter((instance) => !instance.upgraded).map((instance) => {
    const card = content.cards.find((item) => item.id === instance.cardId)!;
    return `<button type="button" class="mini-choice" data-action="rest-upgrade" data-id="${instance.instanceId}">${html(card.input.text)}</button>`;
  }).join("");
  root.innerHTML = shell("休憩", `<section class="reward-panel economy-panel"><span class="eyebrow">REST STOP</span><h2>休憩</h2><p>回復するか、デッキのカードを1枚強化します。</p><div class="rest-actions"><button type="button" class="skip-reward" data-action="rest-heal">休んで回復 · ♥ ${session.run.player.hp}/${session.run.player.maxHp}</button><div class="economy-section"><h3>強化するカード</h3><div class="choice-list">${choices || "強化可能なカードなし"}</div></div></div></section>`, art);
}

export function renderRunEvent(root: HTMLElement, session: RunSession, content: ContentRegistry, art: BattleArt): void {
  const event = activeEvent(session.run, content);
  const choices = availableEventChoices(session.run, content).map(({ choice, available }) => `<button type="button" class="event-choice" data-action="event-choice" data-id="${choice.id}" ${available ? "" : "disabled"}>${html(choice.label)}${available ? "" : " · 条件未達"}</button>`).join("");
  root.innerHTML = shell("校内イベント", `<section class="reward-panel event-panel"><span class="eyebrow">AFTER SCHOOL</span><h2>${html(event.title)}</h2><p>${html(event.description)}</p><div class="event-choices">${choices}</div><div class="map-stats">♥ ${session.run.player.hp}/${session.run.player.maxHp} · ${session.run.gold}G · デッキ ${session.run.deck.length}枚</div></section>`, art);
}

export function renderRunResult(root: HTMLElement, session: RunSession, art: BattleArt): void {
  const won = session.screen === "won";
  root.innerHTML = shell(won ? "全Act完走" : "ラン終了", `<section class="reward-panel run-result"><span class="eyebrow">RUN RESULT</span><h2>${won ? "全Actクリア" : "敗北"}</h2><p>${won ? "3つのActのボスを突破しました。" : "次のランで再挑戦できます。"}</p><div class="map-stats">ACT ${session.run.act} · ♥ ${session.run.player.hp}/${session.run.player.maxHp}</div><button type="button" class="skip-reward" data-action="new-run">新しいランを始める</button></section>`, art);
}

export function renderSaveRecovery(root: HTMLElement, art: BattleArt): void {
  root.innerHTML = shell("保存データ", `<section class="reward-panel run-result"><span class="eyebrow">SAVE DATA</span><h2>保存データを読み込めません</h2><p>保存データはそのまま保持しています。新しいランを始めると、この端末の保存データを更新します。</p><button type="button" class="skip-reward" data-action="new-run">新しいランを始める</button></section>`, art);
}
