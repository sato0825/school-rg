import type { Card, ContentRegistry, RunState } from "../domain/schema.js";
import { stageUrlForAct } from "./stage-presentation.js";
import { stageLayout } from "./stage-layout.js";
import { actionDelayMs, loopDelayMs, MOTION_MS } from "./motion-timing.js";
import type { CardFx } from "./card-fx.js";
import type { ResultFx } from "./result-fx.js";

export type BattleArt = {
  stageUrl: string;
  stageUrlByAct?: Readonly<Record<number, string>>;
  heroUrl: string;
  heroUrlByClubId?: Readonly<Record<string, string>>;
  heroPosesByClubId?: Readonly<Record<string, { idle: string; activate: string; hit: string }>>;
  previewLabel?: string;
  previewLabelByClubId?: Readonly<Record<string, string>>;
  enemyUrlById: Readonly<Record<string, string>>;
  fxPaletteByClubId?: Readonly<Record<string, readonly [string, string]>>;
};

export type BattleView = {
  art: BattleArt;
  baseTurnMs: number;
  message: string;
  selectedDiscardId: string | null;
  selectedDebuff: string | null;
  motion: "hero" | "enemy" | "hit" | null;
  motionStartedAtMs: number | null;
  cardFx?: CardFx | null;
  resultFx?: ResultFx | null;
  dyingEnemyInstanceIds?: readonly string[];
  animationNowMs: number;
  potionModeKey: string;
  potionSlotLimit: number;
  lowStimulus: boolean;
  helpOpen?: boolean;
  layoutPreviewAllies?: number;
};

function html(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function describeCard(card: Card, content: ContentRegistry): string {
  const effects = card.effectIds.map((effectId) => {
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) return "効果";
    const value = Number(effect.parameters.amount ?? effect.parameters.amountMs ?? effect.parameters.count ?? 0);
    switch (effect.kind) {
      case "damage": case "damage_multi": case "damage_all": case "damage_pierce": return `攻撃 ${value}${effect.kind === "damage_multi" ? ` × ${effect.parameters.hits}` : ""}`;
      case "block": return `防御 ${value}`;
      case "draw": return `${value}枚ドロー`;
      case "apply_poison": return `毒 ${value}`;
      case "apply_weak": return `弱体 ${effect.parameters.turns}`;
      case "damage_if_status": return `攻撃 ${value} · ${effect.parameters.status === "weak" ? "弱体" : "毒"}時 ${effect.parameters.conditionalAmount}`;
      case "conditional_damage": return `攻撃 ${value} · 条件時 ${effect.parameters.conditionalAmount}`;
      case "add_time": return `時間 +${value / 1_000}秒`;
      case "thorns": return `反撃 ${value}`;
      case "retrieve_discard": return "捨て札を1枚回収";
      case "copy_card": return "手札を1枚複製";
      case "exhaust_card": return "手札を1枚除外";
      case "transform_card": return "手札を1枚変化";
      default: return "特殊効果";
    }
  });
  if (card.keywordIds.includes("retain")) effects.push("保持");
  return effects.join(" · ");
}

function wordMarkup(word: string, buffer: string): string {
  if (!buffer || !word.toLowerCase().startsWith(buffer.toLowerCase())) return html(word);
  return `<span class="typed">${html(word.slice(0, buffer.length))}</span>${html(word.slice(buffer.length))}`;
}

function statusMarkup(bag: Record<string, number>): string {
  return Object.entries(bag).filter(([, amount]) => amount !== 0)
    .map(([kind, amount]) => {
      const name = statusNames[kind] ?? kind;
      const icon = statusIcons[kind] ?? "◆";
      const description = statusDescriptions[kind];
      const label = `${name} ${amount}${description ? `。${description}` : ""}`;
      return `<span class="status-chip" data-status="${html(kind)}" role="img" aria-label="${html(label)}" title="${html(label)}"><span class="status-symbol" aria-hidden="true">${icon}</span><span class="status-name" aria-hidden="true">${html(name)}</span><strong aria-hidden="true">${amount}</strong></span>`;
    }).join("");
}

const statusNames: Record<string, string> = { strength: "力", dexterity: "技", weak: "弱体", poison: "毒", thorns: "反撃", barrier: "結界", focus: "集中", vulnerable: "脆弱", frail: "虚弱" };
const statusIcons: Record<string, string> = { strength: "↑", dexterity: "↗", weak: "↓", poison: "◉", thorns: "✹", barrier: "◇", focus: "✦", vulnerable: "⊗", frail: "▱" };
const statusDescriptions: Record<string, string> = {
  strength: "攻撃の基礎値に加算", dexterity: "防御の基礎値に加算", weak: "攻撃の威力が低下", vulnerable: "受ける攻撃の威力が増加",
  frail: "得るブロックが低下", poison: "ターン境界でブロックを無視してHP減少", thorns: "攻撃された時に反撃",
  barrier: "ターン開始時にブロック獲得", focus: "ターン開始時に力を追加",
};
const cardTypeNames: Record<string, string> = { attack: "攻撃", skill: "技能", power: "持続", status: "状態", curse: "呪い" };

function pileMarkup(name: string, kind: string, count: number): string {
  return `<span class="pile-token" data-pile="${kind}" role="img" aria-label="${name} ${count}枚"><span class="pile-symbol" aria-hidden="true"></span><span class="pile-name" aria-hidden="true">${name}</span><strong aria-hidden="true">${count}</strong></span>`;
}

function cardFxMarkup(fx: CardFx | null, clubId: string, nowMs: number, palette: BattleArt["fxPaletteByClubId"]): string {
  if (!fx) return "";
  const [accent, glow] = palette?.[clubId] ?? ["#75a9df", "#d7e7ff"];
  const delay = actionDelayMs(nowMs, fx.startedAtMs, MOTION_MS.hero);
  const targets = fx.targetXPercents.map((x) => {
    const trailStart = Math.max(fx.sourceXPercent, x - 14);
    const trail = fx.kind === "attack" ? `<span class="card-fx-trail" style="left:${trailStart}%;width:${Math.max(0, x - trailStart)}%;animation-delay:${delay}ms"></span>` : "";
    return `${trail}<span class="card-fx-mark ${fx.kind}" style="left:${x}%;animation-delay:${delay}ms"><i></i><b></b></span>`;
  }).join("");
  return `<div class="card-fx-layer" aria-hidden="true" data-kind="${fx.kind}" data-target-count="${fx.targetXPercents.length}" style="--fx-accent:${accent};--fx-glow:${glow}">${targets}</div>`;
}

function resultFxMarkup(fx: ResultFx | null, nowMs: number): string {
  if (!fx) return "";
  const delay = actionDelayMs(nowMs, fx.startedAtMs, MOTION_MS.hit);
  return `<div class="result-fx-layer" aria-hidden="true">${fx.marks.map((mark, index) => {
    const stack = fx.marks.slice(0, index).filter((previous) => previous.xPercent === mark.xPercent).length;
    return `<span class="result-fx-mark" data-kind="${mark.kind}" style="left:${mark.xPercent}%;--fx-offset:${stack * 36}px;animation-delay:${delay}ms">${html(mark.label)}</span>`;
  }).join("")}</div>`;
}

export function renderBattle(root: HTMLElement, run: RunState, content: ContentRegistry, view: BattleView): void {
  const combat = run.combat!;
  const hand = combat.hand.map((instanceId) => {
    const instance = combat.cards.find((item) => item.instanceId === instanceId)!;
    return { instanceId, card: content.cards.find((card) => card.id === instance.cardId)! };
  });
  const selected = combat.typing.selectedCardInstanceId;
  const potionControl = combat.potionControl;
  const potionActive = potionControl?.active ?? false;
  const activeInput = potionActive ? potionControl!.typing.buffer : combat.typing.buffer;
  const selectedPotionId = potionControl?.typing.selectedCardInstanceId;
  const potionTargetHint = selectedPotionId && run.potionIds[Number(selectedPotionId.slice(7))] && content.potions.find((potion) => potion.id === run.potionIds[Number(selectedPotionId.slice(7))])?.target === "enemy" && !potionControl?.typing.targetEnemyInstanceId ? "対象の敵を選択" : null;
  const pendingHandTarget = selected && hand.find((entry) => entry.instanceId === selected)?.card.target === "hand";
  const pendingEnemyTarget = selected && hand.find((entry) => entry.instanceId === selected)?.card.target === "enemy" && !combat.typing.targetEnemyInstanceId && combat.enemies.filter((enemy) => enemy.hp > 0).length > 1;
  const typingHint = pendingHandTarget ? "対象にする手札を選んでください" : combat.typing.buffer && combat.typing.candidateCardInstanceIds.length > 1 ? `候補 ${combat.typing.candidateCardInstanceIds.length}枚 · 使うカードを選択` : pendingEnemyTarget ? "攻撃対象の敵を選択" : "";
  const remaining = (combat.clock.remainingMs / 1_000).toFixed(1);
  const timeRatio = Math.max(0, Math.min(100, combat.clock.remainingMs / view.baseTurnMs * 100));
  const playerHpRatio = Math.max(0, Math.min(100, run.player.hp / run.player.maxHp * 100));
  const clubName = content.clubs.find((club) => club.id === run.clubId)?.name ?? run.clubId;
  const heroPoses = view.art.heroPosesByClubId?.[run.clubId];
  const heroUrl = (view.motion === "hero" ? heroPoses?.activate : view.motion === "hit" ? heroPoses?.hit : heroPoses?.idle)
    ?? view.art.heroUrlByClubId?.[run.clubId] ?? view.art.heroUrl;
  const previewLabel = view.art.previewLabelByClubId?.[run.clubId] ?? view.art.previewLabel;
  const heroDelay = view.motion === "hero" || view.motion === "hit"
    ? actionDelayMs(view.animationNowMs, view.motionStartedAtMs ?? view.animationNowMs, view.motion === "hero" ? MOTION_MS.hero : MOTION_MS.hit)
    : loopDelayMs(view.animationNowMs, MOTION_MS.heroIdle);
  const enemyDelay = view.motion === "enemy"
    ? actionDelayMs(view.animationNowMs, view.motionStartedAtMs ?? view.animationNowMs, MOTION_MS.enemy)
    : loopDelayMs(view.animationNowMs, MOTION_MS.enemyIdle);
  const relicNames = run.relicIds.map((id) => content.relics.find((relic) => relic.id === id)?.name ?? id);
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  const nodeKindLabel: Record<string, string> = { combat: "戦闘", elite: "強敵", boss: "ボス" };
  const livingEnemies = combat.enemies.filter((enemy) => enemy.hp > 0 || (combat.phase === "WON" && view.motion === "hero" && view.dyingEnemyInstanceIds?.includes(enemy.instanceId)));
  const layout = stageLayout(view.layoutPreviewAllies ?? 1, livingEnemies.length);
  const denseFormation = livingEnemies.length >= 3;
  const enemyRoster: string[] = [];
  const enemies = livingEnemies.map((enemy, index) => {
    const definition = content.enemies.find((item) => item.id === enemy.enemyId);
    const intent = content.intents.find((item) => item.id === enemy.intentId);
    const intentEffect = content.effects.find((item) => item.id === intent?.effectIds[0]);
    const amount = intentEffect?.parameters.amount;
    const intentVisual: Record<string, { icon: string; label: string }> = {
      attack: { icon: "⚔", label: "攻撃" }, defend: { icon: "◇", label: "防御" },
      buff: { icon: "↑", label: "強化" }, debuff: { icon: "↓", label: "弱体化" },
      summon: { icon: "+", label: "増援" }, mixed: { icon: "✦", label: "複合" },
    };
    const intentKind = intentVisual[intent?.category ?? ""] ?? intentVisual.mixed!;
    const hpRatio = Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100));
    const enemyStatuses = combat.statuses.enemies[enemy.instanceId] ?? {};
    const statusDescription = Object.entries(enemyStatuses).filter(([, count]) => count !== 0)
      .map(([kind, count]) => `${statusNames[kind] ?? kind} ${count}`).join("、");
    const targeted = (potionActive ? potionControl!.typing.targetEnemyInstanceId : combat.typing.targetEnemyInstanceId) === enemy.instanceId;
    const enemyLabel = `敵 ${index + 1}、${html(definition?.name ?? "敵")}を対象に選ぶ。HP ${enemy.hp}/${enemy.maxHp}、ブロック ${enemy.block}。次の行動: ${intentKind.label}、${html(intent?.label ?? "行動")}${typeof amount === "number" ? `、${amount}` : ""}${statusDescription ? `。状態: ${html(statusDescription)}` : ""}${targeted ? "。選択中" : ""}`;
    if (denseFormation) enemyRoster.push(`<button type="button" class="enemy-roster-button ${targeted ? "targeted" : ""}" data-action="enemy" data-id="${enemy.instanceId}" aria-pressed="${targeted}" aria-label="${enemyLabel}"><span class="enemy-roster-head"><span class="enemy-roster-order" aria-hidden="true">${index + 1}</span><span class="enemy-roster-name">${html(definition?.name ?? "敵")}</span><span class="enemy-roster-value">${enemy.hp}<small>/${enemy.maxHp}</small></span></span><span class="enemy-roster-bar" role="meter" aria-label="敵 ${index + 1}のHP" aria-valuemin="0" aria-valuemax="${enemy.maxHp}" aria-valuenow="${enemy.hp}"><span style="width:${hpRatio}%"></span></span><span class="enemy-detail" aria-hidden="true"><span class="enemy-detail-heading"><span>敵 ${index + 1}</span><strong>${html(definition?.name ?? "敵")}</strong></span><span class="enemy-detail-intent"><span class="enemy-detail-icon">${intentKind.icon}</span><span><small>次の行動 · ${intentKind.label}</small><strong>${html(intent?.label ?? "行動")}</strong></span>${typeof amount === "number" && amount > 0 ? `<b>${amount}</b>` : ""}</span><span class="enemy-detail-values">HP ${enemy.hp}/${enemy.maxHp}${enemy.block > 0 ? ` · ブロック ${enemy.block}` : ""}</span>${statusDescription ? `<span class="enemy-detail-status">${statusMarkup(enemyStatuses)}</span>` : ""}</span></button>`);
    const slotTag = denseFormation || enemy.hp <= 0 ? "div" : "button";
    return `<${slotTag} class="enemy-slot ${targeted ? "targeted" : ""} ${enemy.hp <= 0 ? "defeated" : ""}" style="--slot-x:${layout.enemies[index]!.xPercent}%" ${slotTag === "div" ? 'aria-hidden="true"' : `type="button" data-action="enemy" data-id="${enemy.instanceId}" aria-pressed="${targeted}" aria-label="${enemyLabel}"`}>
      <span class="intent-ticket" data-category="${intent?.category ?? "mixed"}"><span class="intent-icon" aria-hidden="true">${intentKind.icon}</span><span class="intent-copy"><small>次の行動 · ${intentKind.label}</small><strong>${html(intent?.label ?? "行動")}</strong></span>${typeof amount === "number" && amount > 0 ? `<b>${amount}</b>` : ""}</span>
      <img class="enemy-art ${view.motion === "enemy" ? "act" : ""}" style="animation-delay:${enemyDelay}ms" src="${html(view.art.enemyUrlById[enemy.enemyId] ?? "")}" alt="" />
      ${denseFormation ? `<span class="enemy-art-number" aria-hidden="true">${index + 1}</span>` : ""}
      <span class="enemy-hud"><span class="enemy-hud-head"><span class="enemy-order" aria-hidden="true">${index + 1}</span><strong>${targeted ? "対象: " : ""}${html(definition?.name ?? "敵")}</strong><span class="enemy-hp-number">${enemy.hp}<small>/${enemy.maxHp}</small></span></span><span class="enemy-health-track" role="meter" aria-label="${html(definition?.name ?? "敵")}のHP" aria-valuemin="0" aria-valuemax="${enemy.maxHp}" aria-valuenow="${enemy.hp}"><span class="enemy-health-fill" style="width:${hpRatio}%"></span></span>${enemy.block > 0 ? `<span class="enemy-block">◇ ${enemy.block} ブロック</span>` : ""}</span>
      <span class="enemy-status">${statusMarkup(enemyStatuses)}</span>
    </${slotTag}>`;
  }).join("");
  const previewAllies = layout.allies.slice(1).map((slot, index) => `<div class="ally-slot mock-ally" style="--slot-x:${slot.xPercent}%" aria-hidden="true"><div class="mock-ally-body"><span>仮配置 ${index + 2}</span></div></div>`).join("");
  const cards = hand.map(({ instanceId, card }, index) => `<button type="button" class="card ${combat.typing.candidateCardInstanceIds.includes(instanceId) ? "candidate" : "dim"} ${selected === instanceId ? "selected" : ""}" data-card-kind="${card.type}" data-action="card" data-id="${instanceId}" aria-pressed="${selected === instanceId}" aria-label="${html(card.input.text)} ${html(describeCard(card, content))}${selected === instanceId ? "（選択中）" : ""}">
    <span class="card-index">${String(index + 1).padStart(2, "0")}</span><span class="card-kind">${html(cardTypeNames[card.type] ?? card.type)}</span><span class="card-sigil" aria-hidden="true"></span>
    <strong class="card-word">${wordMarkup(card.input.text, combat.typing.buffer)}</strong><span class="card-effect">${html(describeCard(card, content))}</span>
  </button>`).join("");
  const potions = run.potionIds.map((potionId, index) => {
    const potion = content.potions.find((item) => item.id === potionId)!;
    const instanceId = `potion-${index}`;
    const candidate = potionControl?.typing.candidateCardInstanceIds.includes(instanceId) ?? false;
    return `<div class="potion-slot"><button type="button" class="potion ${potionActive && candidate ? "candidate" : ""} ${selectedPotionId === instanceId ? "selected" : ""}" data-action="potion" data-id="${instanceId}" aria-pressed="${selectedPotionId === instanceId}" aria-label="${html(potion.name)}、入力語 ${html(potion.input.text)}"><strong>${html(potion.name)}</strong><span>${wordMarkup(potion.input.text, potionActive ? potionControl!.typing.buffer : "")}</span></button><button type="button" class="potion-discard" data-action="discard-potion" data-id="${index}" aria-label="${html(potion.name)}を破棄">×</button></div>`;
  }).join("");
  const discard = combat.discardPile.map((instanceId) => {
    const cardId = combat.cards.find((item) => item.instanceId === instanceId)?.cardId;
    const word = content.cards.find((card) => card.id === cardId)?.input.text ?? instanceId;
    return `<button type="button" class="mini-choice ${view.selectedDiscardId === instanceId ? "chosen" : ""}" data-action="discard" data-id="${instanceId}">${html(word)}</button>`;
  }).join("");
  const debuffs = (["weak", "vulnerable", "frail", "poison"] as const)
    .filter((kind) => (combat.statuses.player[kind] ?? 0) > 0)
    .map((kind) => `<button type="button" class="mini-choice ${view.selectedDebuff === kind ? "chosen" : ""}" data-action="debuff" data-id="${kind}">${kind} ${combat.statuses.player[kind]}</button>`).join("");
  const selectableEffects = new Set(hand.flatMap(({ card }) => card.effectIds.map((id) => content.effects.find((effect) => effect.id === id)?.kind)));
  const showDiscardChoice = selectableEffects.has("retrieve_discard") && discard.length > 0;
  const showDebuffChoice = selectableEffects.has("remove_debuff") && debuffs.length > 0;
  const selectionShelf = showDiscardChoice || showDebuffChoice
    ? `<div class="selection-shelf">${showDiscardChoice ? `<div><span class="shelf-label">回収する捨て札</span><div class="choice-list">${discard}</div></div>` : ""}${showDebuffChoice ? `<div><span class="shelf-label">解除する状態</span><div class="choice-list">${debuffs}</div></div>` : ""}</div>` : "";
  const potionMarkup = `<div class="potion-row ${potionActive ? "active" : ""}" aria-label="ポーション"><button type="button" class="potion-mode ${potionActive ? "active" : ""}" data-action="potion-mode" aria-pressed="${potionActive}">ポーション ${run.potionIds.length}/${view.potionSlotLimit} · 入力 ${html(view.potionModeKey)}</button><span class="potion-buffer" role="status">${potionTargetHint ?? (potionActive ? html(potionControl!.typing.buffer) || "入力待ち" : "")}</span><div class="potion-slots">${potions}</div></div>`;
  const handMarkup = `<div class="hand-guide" aria-hidden="true">${hand.length > 3 ? `手札 ${hand.length}枚 <span>← 横に送って確認 →</span>` : ""}</div><div class="hand" aria-label="手札">${cards || `<p class="empty-hand">手札なし</p>`}</div>`;
  const terminal = (combat.phase === "WON" || combat.phase === "LOST") && view.motion !== "hero" && view.motion !== "hit";
  root.innerHTML = `<main class="game" data-club="${html(run.clubId)}" data-effects="${view.lowStimulus ? "quiet" : "standard"}" aria-label="学園タイピングローグライク戦闘">
    <header class="topbar" aria-label="戦闘情報"><div class="run-meta" data-kind="${html(node?.kind ?? "combat")}"><span>ACT ${run.act} · ${node?.floor ?? 0}F · ${nodeKindLabel[node?.kind ?? "combat"] ?? "戦闘"}</span><span>TURN ${combat.turn}</span></div><div class="player-hud" aria-label="${html(clubName)}の状態"><span class="player-health"><strong>♥ ${run.player.hp}<span>/${run.player.maxHp}</span></strong><span class="player-health-track" role="meter" aria-label="プレイヤーのHP" aria-valuemin="0" aria-valuemax="${run.player.maxHp}" aria-valuenow="${run.player.hp}"><span class="player-health-fill" style="width:${playerHpRatio}%"></span></span></span><b>◇ ${run.player.block}</b><div class="status-row">${statusMarkup(combat.statuses.player)}</div><div class="relic-row" aria-label="レリック">${relicNames.map((name) => `<span class="relic-chip" title="${html(name)}">✦ ${html(name)}</span>`).join("")}</div></div><button type="button" class="pause-button" data-action="pause" ${combat.phase !== "PLAYER_INPUT" ? "disabled" : ""}>${combat.clock.paused ? "再開" : "一時停止"}</button><button type="button" class="battle-guide" data-action="toggle-battle-help" aria-controls="battle-help" aria-expanded="${Boolean(view.helpOpen)}" ${combat.phase !== "PLAYER_INPUT" ? "disabled" : ""}>操作</button></header>
    <aside id="battle-help" class="battle-help" role="region" aria-label="戦闘の操作方法" ${view.helpOpen ? "" : "hidden"}><strong>戦闘の操作</strong><ol><li>手札の英単語をタイプして発動</li><li>対象が必要なら敵や手札を選択</li><li>敵の予告を見て、時間内に行動</li></ol><p>誤キーは無視 · Escで入力取消 · ${html(view.potionModeKey)}でポーション</p><button type="button" data-action="toggle-battle-help">閉じる</button></aside>
    <section class="stage" aria-label="戦闘ステージ" data-act="${run.act}" data-ally-count="${layout.allies.length}" data-enemy-count="${layout.enemies.length}" style="background-image:url('${html(stageUrlForAct(view.art, run.act))}')"><div class="stage-vignette"></div>${previewLabel ? `<span class="art-preview-label">${html(previewLabel)}</span>` : ""}${view.layoutPreviewAllies ? `<span class="layout-preview-label">味方${layout.allies.length}人の配置検討 · 戦闘ルール未実装</span>` : ""}<div class="ally-group"><div class="ally-slot" style="--slot-x:${layout.allies[0]!.xPercent}%"><img class="hero-art ${view.motion === "hero" ? "act" : view.motion === "hit" ? "react" : ""}" style="animation-delay:${heroDelay}ms" src="${html(heroUrl)}" alt="${html(clubName)}の生徒" /><div class="hero-shadow"></div><span class="hero-nameplate" aria-hidden="true">${html(clubName)}</span></div>${previewAllies}</div><div class="enemy-group">${enemies}</div>${denseFormation ? `<div class="enemy-roster" role="group" aria-label="敵の一覧" style="--enemy-count:${livingEnemies.length}">${enemyRoster.join("")}</div>` : ""}${cardFxMarkup(view.cardFx ?? null, run.clubId, view.animationNowMs, view.art.fxPaletteByClubId)}${resultFxMarkup(view.resultFx ?? null, view.animationNowMs)}</section>
    <section class="control-deck" aria-label="タイピング戦闘操作"><div class="time-row"><div class="time-label"><span>残り時間</span><strong data-role="time" aria-label="残り時間 ${remaining}秒">${remaining}<small> 秒</small></strong></div><div class="time-track" role="meter" aria-label="入力時間の残り" aria-valuemin="0" aria-valuemax="${view.baseTurnMs}" aria-valuenow="${combat.clock.remainingMs}"><div class="time-fill" data-role="time-fill" style="width:${timeRatio}%"></div></div><div class="pile-counts" aria-label="カードの束">${pileMarkup("山札", "draw", combat.drawPile.length)}${pileMarkup("捨て札", "discard", combat.discardPile.length)}${pileMarkup("除外", "exhaust", combat.exhaustPile.length)}</div></div>
      <div class="typing-row"><label class="typing-caption" for="battle-typing-input">${potionActive ? "ポーション名をタイプ" : "カード名をタイプ"}</label><div class="typing-buffer"><span class="typing-visual" aria-hidden="true">${activeInput ? html(activeInput) : `<span class="placeholder">${potionActive ? "下のポーションの英単語を入力" : "下の手札から英単語を入力"}</span>`}<span class="caret"></span></span><input id="battle-typing-input" class="typing-input" type="text" value="${html(activeInput)}" placeholder="${potionActive ? "下のポーションの英単語を入力" : "下の手札から英単語を入力"}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="battle-typing-help" ${combat.phase !== "PLAYER_INPUT" || combat.clock.paused ? "disabled" : ""} /></div><span id="battle-typing-help" class="typing-input-help">英単語を1文字ずつ入力。誤キーは無視されます。Escapeで取消、${html(view.potionModeKey)}でポーション入力に切替。</span><span class="typing-hint" role="status">${potionActive ? potionTargetHint ?? "" : typingHint}</span></div>
      ${potionActive ? potionMarkup + handMarkup : handMarkup + potionMarkup}
      ${selectionShelf}<p class="battle-message" role="status" aria-live="polite">${html(view.message)}</p>
    </section>
    ${terminal ? `<div class="result-backdrop"><section class="result-panel" role="dialog" aria-modal="true"><span>COMBAT RESULT</span><h2>${combat.phase === "WON" ? "勝利" : "敗北"}</h2><p>${combat.phase === "WON" ? "廊下の敵を退けました。" : "もう一度、カードの入力を試しましょう。"}</p><button type="button" data-action="restart">もう一度戦う</button></section></div>` : ""}
  </main>`;
}
