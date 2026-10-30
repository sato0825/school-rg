import type { Card, ContentRegistry, RunState } from "../domain/schema.js";

export type BattleArt = {
  stageUrl: string;
  heroUrl: string;
  enemyUrlById: Readonly<Record<string, string>>;
};

export type BattleView = {
  art: BattleArt;
  baseTurnMs: number;
  message: string;
  selectedDiscardId: string | null;
  selectedDebuff: string | null;
  motion: "hero" | "enemy" | null;
};

function html(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function describeCard(card: Card, content: ContentRegistry): string {
  const effect = content.effects.find((item) => item.id === card.effectIds[0]);
  if (!effect) return "効果";
  const value = Number(effect.parameters.amount ?? effect.parameters.amountMs ?? effect.parameters.count ?? 0);
  switch (effect.kind) {
    case "damage": case "damage_multi": case "damage_all": case "damage_pierce": return `攻撃 ${value}${effect.kind === "damage_multi" ? ` × ${effect.parameters.hits}` : ""}`;
    case "block": return `防御 ${value}`;
    case "draw": return `${value}枚ドロー`;
    case "apply_poison": return `毒 ${value}`;
    case "add_time": return `時間 +${value / 1_000}秒`;
    case "thorns": return `反撃 ${value}`;
    default: return "特殊効果";
  }
}

function wordMarkup(word: string, buffer: string): string {
  if (!buffer || !word.toLowerCase().startsWith(buffer.toLowerCase())) return html(word);
  return `<span class="typed">${html(word.slice(0, buffer.length))}</span>${html(word.slice(buffer.length))}`;
}

function statusMarkup(bag: Record<string, number>): string {
  const names: Record<string, string> = { strength: "力", weak: "弱体", poison: "毒", thorns: "反撃", barrier: "結界", focus: "集中", vulnerable: "脆弱", frail: "虚弱" };
  return Object.entries(bag).filter(([, amount]) => amount !== 0)
    .map(([kind, amount]) => `<span class="status-chip">${html(names[kind] ?? kind)} ${amount}</span>`).join("");
}

export function renderBattle(root: HTMLElement, run: RunState, content: ContentRegistry, view: BattleView): void {
  const combat = run.combat!;
  const hand = combat.hand.map((instanceId) => {
    const instance = combat.cards.find((item) => item.instanceId === instanceId)!;
    return { instanceId, card: content.cards.find((card) => card.id === instance.cardId)! };
  });
  const selected = combat.typing.selectedCardInstanceId;
  const pendingHandTarget = selected && hand.find((entry) => entry.instanceId === selected)?.card.target === "hand";
  const pendingEnemyTarget = selected && hand.find((entry) => entry.instanceId === selected)?.card.target === "enemy" && !combat.typing.targetEnemyInstanceId && combat.enemies.filter((enemy) => enemy.hp > 0).length > 1;
  const typingHint = pendingHandTarget ? "対象にする手札を選んでください" : combat.typing.buffer && combat.typing.candidateCardInstanceIds.length > 1 ? `候補 ${combat.typing.candidateCardInstanceIds.length}枚 · 使うカードを選択` : pendingEnemyTarget ? "攻撃対象の敵を選択" : "カード名を入力 · Escで取消";
  const remaining = (combat.clock.remainingMs / 1_000).toFixed(1);
  const timeRatio = Math.max(0, Math.min(100, combat.clock.remainingMs / view.baseTurnMs * 100));
  const clubName = content.clubs.find((club) => club.id === run.clubId)?.name ?? run.clubId;
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  const enemies = combat.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => {
    const definition = content.enemies.find((item) => item.id === enemy.enemyId);
    const intent = content.intents.find((item) => item.id === enemy.intentId);
    const intentEffect = content.effects.find((item) => item.id === intent?.effectIds[0]);
    const amount = intentEffect?.parameters.amount;
    const targeted = combat.typing.targetEnemyInstanceId === enemy.instanceId;
    return `<button type="button" class="enemy-slot ${targeted ? "targeted" : ""}" data-action="enemy" data-id="${enemy.instanceId}" aria-pressed="${targeted}" aria-label="${html(definition?.name ?? "敵")}を対象に選ぶ${targeted ? "（選択中）" : ""}">
      <span class="intent-ticket"><small>INTENT</small><strong>${html(intent?.label ?? "行動")}</strong>${amount ? `<b>${amount}</b>` : ""}</span>
      <img class="enemy-art ${view.motion === "enemy" ? "act" : ""}" src="${html(view.art.enemyUrlById[enemy.enemyId] ?? "")}" alt="${html(definition?.name ?? "敵")}" />
      <span class="enemy-hud"><strong>${targeted ? "対象: " : ""}${html(definition?.name ?? "敵")}</strong><span>♥ ${enemy.hp}/${enemy.maxHp} · ◇ ${enemy.block}</span></span>
      <span class="enemy-status">${statusMarkup(combat.statuses.enemies[enemy.instanceId] ?? {})}</span>
    </button>`;
  }).join("");
  const cards = hand.map(({ instanceId, card }, index) => `<button type="button" class="card ${combat.typing.candidateCardInstanceIds.includes(instanceId) ? "candidate" : "dim"} ${selected === instanceId ? "selected" : ""}" data-action="card" data-id="${instanceId}" aria-pressed="${selected === instanceId}" aria-label="${html(card.input.text)} ${html(describeCard(card, content))}${selected === instanceId ? "（選択中）" : ""}">
    <span class="card-index">${String(index + 1).padStart(2, "0")}</span><span class="card-kind">${html(card.type.toUpperCase())}</span>
    <strong class="card-word">${wordMarkup(card.input.text, combat.typing.buffer)}</strong><span class="card-effect">${html(describeCard(card, content))}</span>
  </button>`).join("");
  const discard = combat.discardPile.map((instanceId) => {
    const cardId = combat.cards.find((item) => item.instanceId === instanceId)?.cardId;
    const word = content.cards.find((card) => card.id === cardId)?.input.text ?? instanceId;
    return `<button type="button" class="mini-choice ${view.selectedDiscardId === instanceId ? "chosen" : ""}" data-action="discard" data-id="${instanceId}">${html(word)}</button>`;
  }).join("");
  const debuffs = (["weak", "vulnerable", "frail", "poison"] as const)
    .filter((kind) => (combat.statuses.player[kind] ?? 0) > 0)
    .map((kind) => `<button type="button" class="mini-choice ${view.selectedDebuff === kind ? "chosen" : ""}" data-action="debuff" data-id="${kind}">${kind} ${combat.statuses.player[kind]}</button>`).join("");
  const terminal = combat.phase === "WON" || combat.phase === "LOST";
  root.innerHTML = `<main class="game" aria-label="学園タイピングローグライク戦闘">
    <header class="topbar"><div class="brand"><span class="brand-mark">✦</span><div><small>SCHOOL ROGUELIKE</small><h1>学園タイピングローグライク</h1></div></div><div class="run-meta"><span>ACT ${run.act}</span><span>${node?.floor ?? 0}F · ${html(node?.kind ?? "combat")}</span><span>TURN ${combat.turn}</span></div><button type="button" class="pause-button" data-action="pause" ${combat.phase !== "PLAYER_INPUT" ? "disabled" : ""}>${combat.clock.paused ? "再開" : "一時停止"}</button></header>
    <section class="stage" aria-label="戦闘ステージ" style="background-image:url('${html(view.art.stageUrl)}')"><div class="stage-vignette"></div><div class="ally-group"><div class="ally-slot"><img class="hero-art ${view.motion === "hero" ? "act" : ""}" src="${html(view.art.heroUrl)}" alt="${html(clubName)}の生徒" /><div class="hero-shadow"></div></div></div><div class="enemy-group">${enemies}</div><div class="player-hud"><span class="hud-name">${html(clubName)}</span><strong>♥ ${run.player.hp}<span>/${run.player.maxHp}</span></strong><b>◇ ${run.player.block}</b><div class="status-row">${statusMarkup(combat.statuses.player)}</div></div></section>
    <section class="control-deck" aria-label="タイピング戦闘操作"><div class="time-row"><div class="time-label"><span>PLAYER INPUT</span><strong data-role="time" aria-label="残り時間 ${remaining}秒">${remaining}<small> sec</small></strong></div><div class="time-track"><div class="time-fill" data-role="time-fill" style="width:${timeRatio}%"></div></div><div class="pile-counts"><span>山札 ${combat.drawPile.length}</span><span>捨て札 ${combat.discardPile.length}</span><span>除外 ${combat.exhaustPile.length}</span></div></div>
      <div class="typing-row"><span class="typing-caption">TYPE A CARD NAME</span><div class="typing-buffer">${combat.typing.buffer ? html(combat.typing.buffer) : `<span class="placeholder">ここに入力が表示されます</span>`}<span class="caret"></span></div><span class="typing-hint" role="status">${typingHint}</span></div>
      <div class="hand" aria-label="手札">${cards || `<p class="empty-hand">手札がありません。残り時間で敵の行動へ進みます。</p>`}</div>
      <div class="selection-shelf"><div><span class="shelf-label">捨て札から選択</span><div class="choice-list">${discard || `<span class="shelf-empty">なし</span>`}</div></div><div><span class="shelf-label">解除する状態</span><div class="choice-list">${debuffs || `<span class="shelf-empty">なし</span>`}</div></div></div><p class="battle-message" role="status" aria-live="polite">${html(view.message)}</p>
    </section>
    ${terminal ? `<div class="result-backdrop"><section class="result-panel" role="dialog" aria-modal="true"><span>COMBAT RESULT</span><h2>${combat.phase === "WON" ? "勝利" : "敗北"}</h2><p>${combat.phase === "WON" ? "廊下の敵を退けました。" : "もう一度、カードの入力を試しましょう。"}</p><button type="button" data-action="restart">もう一度戦う</button></section></div>` : ""}
    ${combat.phase === "ENEMY_PHASE" ? `<div class="phase-banner" role="status">敵の行動</div>` : ""}
  </main>`;
}
