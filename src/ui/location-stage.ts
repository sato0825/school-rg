import { activeEvent, availableEventChoices, eventChoiceTargets, eventConditionMet } from "../domain/events.js";
import { DEFAULT_ECONOMY_OPTIONS } from "../domain/economy.js";
import { DEFAULT_GAME_CONFIG, requireSetting, type GameConfig } from "../domain/config.js";
import type { RunSession } from "../domain/run-flow.js";
import type { ContentRegistry, EventChoice, EventEffect, RunState } from "../domain/schema.js";
import { describeCard } from "./battle-view.js";
import { cardArtForId } from "./card-art.js";

import { potionEffectText, potionObjectMarkup, relicObjectMarkup, relicRuleText } from "./item-art.js";

import lockerArt from "../assets/locations/issue304/archive-locker-candidate-v1.png";
import shopArt from "../assets/locations/issue304/school-shop-candidate-v1.png";
import restArt from "../assets/locations/issue304/rest-bench-candidate-v1.png";
import eventArt from "../assets/locations/issue304/event-board-candidate-v1.png";


type LocationScreen = Extract<RunSession["screen"], "treasure" | "shop" | "rest" | "event">;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function cardThumbnail(cardId: string): string {
  const art = cardArtForId(cardId);
  return `<span class="location-card-art" data-art-state="${art.state}" aria-hidden="true">${art.url ? `<img src="${escapeHtml(art.url)}" alt="" />` : "▣"}</span>`;
}

function choiceButton(action: string, id: string, symbol: string, kind: string, name: string, detail: string, outcome: string, disabledReason = "", image = "", offerIndex?: number): string {
  const disabled = Boolean(disabledReason);
  return `<button type="button" class="location-choice" data-action="${action}" data-id="${escapeHtml(id)}" ${offerIndex === undefined ? "" : `data-offer-index="${offerIndex}"`} ${disabled ? "disabled" : ""}><span class="location-choice-icon" aria-hidden="true">${image || symbol}</span><span class="location-choice-copy"><small>${escapeHtml(kind)}</small><strong>${escapeHtml(name)}</strong><span>${escapeHtml(detail)}</span></span><b class="location-choice-outcome" data-unavailable="${disabled}">${escapeHtml(disabledReason || outcome)}</b></button>`;
}

function eventEffect(effect: EventEffect, content: ContentRegistry): string {
  switch (effect.kind) {
    case "gold": return `◉ ${effect.amount >= 0 ? "+" : ""}${effect.amount}G`;
    case "hp": return `♥ ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
    case "add_card": return `▣ ${content.cards.find((card) => card.id === effect.cardId)?.input.text ?? effect.cardId}を得る`;
    case "upgrade_card": return "↑ カードを強化";
    case "remove_card": return "− カードを削除";
    case "add_relic": return `✦ ${content.relics.find((relic) => relic.id === effect.relicId)?.name ?? effect.relicId}を得る`;
    case "add_potion": return `✚ ${content.potions.find((potion) => potion.id === effect.potionId)?.name ?? effect.potionId}を得る`;
    case "battle": return "⚔ 戦闘へ";
  }
}

function eventUnavailableReason(run: RunState, choice: EventChoice, config: GameConfig): string {
  const failed = choice.requires.find((condition) => !eventConditionMet(run, condition, config));
  if (failed) {
    switch (failed.kind) {
      case "gold_at_least": return `${failed.amount}G必要`;
      case "hp_at_least": return `HP ${failed.amount}以上必要`;
      case "hp_at_most_percent": return `HP ${failed.percent}%以下で選択可`;
      case "has_card": return "必要なカードなし";
      case "potion_slot_available": return "ポーション枠が満杯";
    }
  }
  return eventChoiceTargets(run, choice)?.length === 0 ? "対象カードなし" : "条件未達";
}

function treasureChoices(session: RunSession, content: ContentRegistry, config: GameConfig): string {
  const treasure = session.run.treasure;
  if (!treasure) throw new Error("treasure screen requires offers");
  const full = session.run.potionIds.length >= requireSetting(config.potionSlots);
  return treasure.offers.map((offer, index) => {
    const item = offer.kind === "relic" ? content.relics.find((relic) => relic.id === offer.contentId) : content.potions.find((potion) => potion.id === offer.contentId);
    if (!item) throw new Error(`unknown treasure content: ${offer.contentId}`);
    const detail = offer.kind === "relic" ? relicRuleText[offer.contentId] ?? "効果詳細は未登録"
      : `入力語 ${content.potions.find((potion) => potion.id === offer.contentId)!.input.text} · ${potionEffectText(offer.contentId, content)}`;
    const image = offer.kind === "relic" ? relicObjectMarkup(offer.contentId) : potionObjectMarkup(offer.contentId);
    return choiceButton("treasure-offer", offer.offerId, "", offer.kind === "relic" ? "レリック" : "ポーション", item.name, detail, "受け取る", offer.kind === "potion" && full ? "所持枠が満杯" : "", image, index);
  }).join("");
}

function shopChoices(session: RunSession, content: ContentRegistry, config: GameConfig): string {
  const { run } = session;
  const shop = run.shop;
  if (!shop) throw new Error("shop screen requires stock");
  const full = run.potionIds.length >= requireSetting(config.potionSlots);
  const cards = shop.offers.map((offer) => {
    const card = content.cards.find((item) => item.id === offer.cardId);
    if (!card) throw new Error(`unknown shop card: ${offer.cardId}`);
    const reason = offer.purchased ? "購入済み" : run.gold < offer.price ? "所持金不足" : "";
    return choiceButton("buy-offer", offer.offerId, "▣", "カード", card.input.text, describeCard(card, content), `${offer.price}G`, reason, cardThumbnail(card.id));
  });
  const relics = shop.relicOffers.map((offer) => {
    const relic = content.relics.find((item) => item.id === offer.contentId);
    if (!relic) throw new Error(`unknown shop relic: ${offer.contentId}`);
    const reason = offer.purchased ? "購入済み" : run.relicIds.includes(offer.contentId) ? "所持済み" : run.gold < offer.price ? "所持金不足" : "";
    return choiceButton("buy-relic", offer.offerId, "", "レリック", relic.name, relicRuleText[relic.id] ?? "効果詳細は未登録", `${offer.price}G`, reason, relicObjectMarkup(relic.id));
  });
  const potions = shop.potionOffers.map((offer) => {
    const potion = content.potions.find((item) => item.id === offer.contentId);
    if (!potion) throw new Error(`unknown shop potion: ${offer.contentId}`);
    const reason = offer.purchased ? "購入済み" : full ? "所持枠が満杯" : run.gold < offer.price ? "所持金不足" : "";
    return choiceButton("buy-potion", offer.offerId, "", "ポーション", potion.name, `入力語 ${potion.input.text} · ${potionEffectText(potion.id, content)}`, `${offer.price}G`, reason, potionObjectMarkup(potion.id));
  });
  const removalReason = shop.removalUsed ? "この購買では削除済み" : run.deck.length <= 1 ? "最後の1枚は削除不可" : run.gold < shop.removalPrice ? "所持金不足" : "";
  const removal = run.deck.map((instance) => {
    const card = content.cards.find((item) => item.id === instance.cardId);
    if (!card) throw new Error(`unknown deck card: ${instance.cardId}`);
    return choiceButton("remove-shop-card", instance.instanceId, "−", "デッキ", `${card.input.text}${instance.upgraded ? "+" : ""}`, "このカードを削除", "削除する", removalReason, cardThumbnail(card.id));
  }).join("");
  return `<div class="location-shelf" aria-label="購買の品">${[...cards, ...relics, ...potions].join("")}</div><details class="location-drawer"><summary>カードを1枚整理 <b>◉ ${shop.removalPrice}G</b>${removalReason ? `<small>${escapeHtml(removalReason)}</small>` : ""}</summary><div class="location-deck-choices">${removal}</div></details>`;
}

function restChoices(session: RunSession, content: ContentRegistry): string {
  const { hp, maxHp } = session.run.player;
  const healed = Math.min(maxHp - hp, Math.ceil(maxHp * DEFAULT_ECONOMY_OPTIONS.restHealPercent / 100));
  const upgradeable = session.run.deck.filter((instance) => !instance.upgraded);
  const cards = upgradeable.map((instance) => {
    const card = content.cards.find((item) => item.id === instance.cardId);
    if (!card) throw new Error(`unknown deck card: ${instance.cardId}`);
    return choiceButton("rest-upgrade", instance.instanceId, "↑", "強化対象", card.input.text, describeCard(card, content), "強化する", "", cardThumbnail(card.id));
  }).join("");
  const full = healed === 0;
  const heal = choiceButton("rest-heal", "", "♥", "回復", full && !upgradeable.length ? "休んで進む" : "ひと休み", full ? `HP ${hp}/${maxHp}` : `HP ${hp} → ${hp + healed} / ${maxHp}`, full ? "効果なしで進む" : `+${healed} HP`, full && upgradeable.length ? "HPは満タン" : "");
  return `${heal}<details class="location-drawer"><summary>ノートを手直し <b>↑ カードを1枚強化</b></summary><div class="location-deck-choices">${cards || `<p>強化可能なカードなし</p>`}</div></details>`;
}

function eventChoices(session: RunSession, content: ContentRegistry, config: GameConfig): string {
  return availableEventChoices(session.run, content, config).map(({ choice, available }) => {
    const effects = choice.effects.map((effect) => eventEffect(effect, content)).join(" · ");
    const itemEffect = choice.effects.find((effect) => effect.kind === "add_relic" || effect.kind === "add_potion");
    const image = itemEffect?.kind === "add_relic" ? relicObjectMarkup(itemEffect.relicId)
      : itemEffect?.kind === "add_potion" ? potionObjectMarkup(itemEffect.potionId) : "";
    const title = choice.label.split(" · ")[0]!.replace(/^\d+Gで/, "");
    const targets = eventChoiceTargets(session.run, choice);
    const reason = available ? "" : eventUnavailableReason(session.run, choice, config);
    if (!targets || !available) return choiceButton("event-choice", choice.id, image ? "" : "✦", "選択", title, effects, "決める", reason, image);
    const radios = targets.map((instance, index) => {
      const card = content.cards.find((item) => item.id === instance.cardId);
      if (!card) throw new Error(`unknown event target: ${instance.cardId}`);
      return `<label class="location-target-card"><input type="radio" name="event-target-${escapeHtml(choice.id)}" value="${escapeHtml(instance.instanceId)}" ${index === 0 ? "checked" : ""} />${cardThumbnail(card.id)}<span>${escapeHtml(card.input.text)}${instance.upgraded ? "+" : ""}</span></label>`;
    }).join("");
    return `<div class="event-target-choice location-event-target"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(effects)}</span><div class="location-target-list" role="group" aria-label="${escapeHtml(title)}の対象カード">${radios}</div><button type="button" data-action="event-choice" data-id="${escapeHtml(choice.id)}">選んだカードで決定</button></div>`;
  }).join("");
}

function sceneProp(screen: LocationScreen, run: RunState): string {
  const image = (assetId: string, url: string) => `<img class="location-prop-art" src="${escapeHtml(url)}" data-asset-id="${assetId}" alt="" decoding="async" />`;
  switch (screen) {

    case "treasure": return `<div class="location-prop-locker" aria-hidden="true">${image("archive-locker-candidate-v1", lockerArt)}<div class="locker-open">${run.treasure?.offers.map((offer, index) => `<span data-offer-index="${index}">${offer.kind === "relic" ? relicObjectMarkup(offer.contentId) : potionObjectMarkup(offer.contentId)}</span>`).join("") ?? ""}</div></div>`;
    case "shop": return `<div class="location-prop-shop" aria-hidden="true">${image("school-shop-candidate-v1", shopArt)}</div>`;
    case "rest": return `<div class="location-prop-rest" aria-hidden="true">${image("rest-bench-candidate-v1", restArt)}</div>`;
    case "event": return `<div class="location-prop-event" aria-hidden="true">${image("event-board-candidate-v1", eventArt)}</div>`;

  }
}

export function renderRunLocation(root: HTMLElement, session: RunSession, content: ContentRegistry, message = "", config: GameConfig = DEFAULT_GAME_CONFIG, lowStimulus = false): void {
  const screen = session.screen;
  if (screen !== "treasure" && screen !== "shop" && screen !== "rest" && screen !== "event") throw new Error("expected location screen");
  const event = screen === "event" ? activeEvent(session.run, content) : null;
  const names = { treasure: "資料保管庫", shop: "校内購買", rest: "窓辺の休憩席", event: event?.title ?? "校内イベント" };
  const instructions = { treasure: "品を一つ選ぶ", shop: "棚から品を選ぶ", rest: "この地点で一つ選ぶ", event: "選択は一つ" };
  const choices = screen === "treasure" ? treasureChoices(session, content, config)
    : screen === "shop" ? shopChoices(session, content, config)
      : screen === "rest" ? restChoices(session, content) : eventChoices(session, content, config);
  const exit = screen === "treasure" ? `<button type="button" class="location-exit" data-action="skip-treasure">何も取らず進む →</button>`
    : screen === "shop" ? `<button type="button" class="location-exit" data-action="leave-shop">購買を出る →</button>` : "";
  root.innerHTML = `<section class="location-scene" data-location="${screen}" data-low-stimulus="${lowStimulus}" aria-label="${escapeHtml(names[screen])}"><div class="location-prop">${sceneProp(screen, session.run)}</div><div class="location-choices"><div class="location-heading"><small>校内 · 地点</small><h2>${escapeHtml(names[screen])}</h2><p>${escapeHtml(instructions[screen])}</p></div>${event ? `<p class="location-event-description">${escapeHtml(event.description)}</p>` : ""}<div class="location-choice-list">${choices}</div>${exit}<p class="location-message" role="status">${escapeHtml(message)}</p></div></section>`;
}
