import { requireSetting } from "./config.js";
import { shuffle } from "./random.js";
import { collectPotion } from "./potions.js";
import { acquireRelic } from "./relic-hooks.js";
import { DEFAULT_GAME_CONFIG, type GameConfig } from "./config.js";
import type { ContentRegistry, MapNode, RunState } from "./schema.js";

const issue = "https://github.com/sato0825/school-rg/issues/17";
export const DEFAULT_ECONOMY_SETTINGS = {
  startingGold: { status: "provisional", value: 50, source: issue, ownerIssue: 17 },
  combatGold: { status: "provisional", value: 15, source: issue, ownerIssue: 17 },
  eliteGold: { status: "provisional", value: 30, source: issue, ownerIssue: 17 },
  bossGold: { status: "provisional", value: 50, source: issue, ownerIssue: 17 },
  cardPrice: { status: "provisional", value: 40, source: issue, ownerIssue: 17 },
  relicPrice: { status: "provisional", value: 90, source: "https://github.com/sato0825/school-rg/issues/110", ownerIssue: 110 },
  potionPrice: { status: "provisional", value: 25, source: "https://github.com/sato0825/school-rg/issues/110", ownerIssue: 110 },
  relicOffers: { status: "provisional", value: 1, source: "https://github.com/sato0825/school-rg/issues/110", ownerIssue: 110 },
  potionOffers: { status: "provisional", value: 1, source: "https://github.com/sato0825/school-rg/issues/110", ownerIssue: 110 },
  removalPrice: { status: "provisional", value: 75, source: issue, ownerIssue: 17 },
  restHealPercent: { status: "provisional", value: 30, source: issue, ownerIssue: 17 },
} as const;

export type EconomyOptions = {
  startingGold: number;
  combatGold: number;
  eliteGold: number;
  bossGold: number;
  cardPrice: number;
  relicPrice: number;
  potionPrice: number;
  relicOffers: number;
  potionOffers: number;
  removalPrice: number;
  restHealPercent: number;
};

export const DEFAULT_ECONOMY_OPTIONS: EconomyOptions = {
  startingGold: requireSetting(DEFAULT_ECONOMY_SETTINGS.startingGold),
  combatGold: requireSetting(DEFAULT_ECONOMY_SETTINGS.combatGold),
  eliteGold: requireSetting(DEFAULT_ECONOMY_SETTINGS.eliteGold),
  bossGold: requireSetting(DEFAULT_ECONOMY_SETTINGS.bossGold),
  cardPrice: requireSetting(DEFAULT_ECONOMY_SETTINGS.cardPrice),
  relicPrice: requireSetting(DEFAULT_ECONOMY_SETTINGS.relicPrice),
  potionPrice: requireSetting(DEFAULT_ECONOMY_SETTINGS.potionPrice),
  relicOffers: requireSetting(DEFAULT_ECONOMY_SETTINGS.relicOffers),
  potionOffers: requireSetting(DEFAULT_ECONOMY_SETTINGS.potionOffers),
  removalPrice: requireSetting(DEFAULT_ECONOMY_SETTINGS.removalPrice),
  restHealPercent: requireSetting(DEFAULT_ECONOMY_SETTINGS.restHealPercent),
};

function nonNegative(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a nonnegative safe integer`);
  return value;
}

function currentNode(run: RunState): MapNode {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new RangeError(`unknown current node: ${run.map.currentNodeId}`);
  return node;
}

function nextDeckInstanceId(run: RunState): string {
  const used = new Set(run.deck.map((card) => card.instanceId));
  let index = run.deck.length + 1;
  while (used.has(`deck-${index}`)) index++;
  return `deck-${index}`;
}

export function awardEncounterGold(run: RunState, kind: "combat" | "elite" | "boss", options: EconomyOptions = DEFAULT_ECONOMY_OPTIONS): RunState {
  const value = nonNegative(options[`${kind}Gold`], `${kind}Gold`);
  const gold = run.gold + value;
  if (!Number.isSafeInteger(gold)) throw new RangeError("gold overflow");
  return { ...run, gold };
}

export function openShop(run: RunState, content: ContentRegistry, options: EconomyOptions = DEFAULT_ECONOMY_OPTIONS): RunState {
  if (currentNode(run).kind !== "shop" || run.combat || run.shop) throw new Error("expected an unopened shop node outside combat");
  const club = content.clubs.find((item) => item.id === run.clubId);
  if (!club) throw new RangeError(`unknown club: ${run.clubId}`);
  const pool = [...new Set(club.cardPoolIds)];
  if (pool.length === 0) throw new RangeError("shop card pool is empty");
  const shuffled = shuffle(run.rngState, pool);
  const relics = shuffle(shuffled.state, content.relics.map((item) => item.id).filter((id) => !run.relicIds.includes(id)));
  const potions = shuffle(relics.state, content.potions.map((item) => item.id));
  const price = nonNegative(options.cardPrice, "cardPrice");
  const relicPrice = nonNegative(options.relicPrice, "relicPrice");
  const potionPrice = nonNegative(options.potionPrice, "potionPrice");
  const relicCount = nonNegative(options.relicOffers, "relicOffers");
  const potionCount = nonNegative(options.potionOffers, "potionOffers");
  const removalPrice = nonNegative(options.removalPrice, "removalPrice");
  return { ...run, rngState: potions.state, shop: {
    nodeId: run.map.currentNodeId,
    offers: shuffled.items.slice(0, 3).map((cardId, index) => ({ offerId: `offer-${index + 1}`, cardId, price, purchased: false })),
    relicOffers: relics.items.slice(0, relicCount).map((contentId, index) => ({ offerId: `relic-${index + 1}`, contentId, price: relicPrice, purchased: false })),
    potionOffers: potions.items.slice(0, potionCount).map((contentId, index) => ({ offerId: `potion-${index + 1}`, contentId, price: potionPrice, purchased: false })),
    removalPrice, removalUsed: false,
  } };
}

export function buyShopRelic(run: RunState, offerId: string, content: ContentRegistry): RunState {
  const shop = run.shop;
  if (!shop || shop.nodeId !== run.map.currentNodeId || run.combat) throw new Error("shop is not active");
  const offer = shop.relicOffers.find((item) => item.offerId === offerId);
  if (!offer) throw new RangeError(`unknown relic offer: ${offerId}`);
  if (offer.purchased) throw new Error(`shop offer already purchased: ${offerId}`);
  if (run.gold < offer.price) throw new RangeError("insufficient gold");
  if (run.relicIds.includes(offer.contentId)) throw new Error("relic already owned");
  const gained = acquireRelic(run, offer.contentId, content);
  return { ...gained, gold: gained.gold - offer.price,
    shop: { ...shop, relicOffers: shop.relicOffers.map((item) => item.offerId === offerId ? { ...item, purchased: true } : item) } };
}

export function buyShopPotion(run: RunState, offerId: string, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG): RunState {
  const shop = run.shop;
  if (!shop || shop.nodeId !== run.map.currentNodeId || run.combat) throw new Error("shop is not active");
  const offer = shop.potionOffers.find((item) => item.offerId === offerId);
  if (!offer) throw new RangeError(`unknown potion offer: ${offerId}`);
  if (offer.purchased) throw new Error(`shop offer already purchased: ${offerId}`);
  if (run.gold < offer.price) throw new RangeError("insufficient gold");
  const gained = collectPotion(run, offer.contentId, content, config);
  return { ...gained, gold: gained.gold - offer.price,
    shop: { ...shop, potionOffers: shop.potionOffers.map((item) => item.offerId === offerId ? { ...item, purchased: true } : item) } };
}

export function buyShopCard(run: RunState, offerId: string): RunState {
  const shop = run.shop;
  if (!shop || shop.nodeId !== run.map.currentNodeId || run.combat) throw new Error("shop is not active");
  const offer = shop.offers.find((item) => item.offerId === offerId);
  if (!offer) throw new RangeError(`unknown shop offer: ${offerId}`);
  if (offer.purchased) throw new Error(`shop offer already purchased: ${offerId}`);
  if (run.gold < offer.price) throw new RangeError("insufficient gold");
  return { ...run, gold: run.gold - offer.price,
    deck: [...run.deck, { instanceId: nextDeckInstanceId(run), cardId: offer.cardId, upgraded: false }],
    shop: { ...shop, offers: shop.offers.map((item) => item.offerId === offerId ? { ...item, purchased: true } : item) },
  };
}

export function removeShopCard(run: RunState, cardInstanceId: string): RunState {
  const shop = run.shop;
  if (!shop || shop.nodeId !== run.map.currentNodeId || run.combat) throw new Error("shop is not active");
  if (shop.removalUsed) throw new Error("card removal already used at this shop");
  if (!run.deck.some((card) => card.instanceId === cardInstanceId)) throw new RangeError(`no card removal target: ${cardInstanceId}`);
  if (run.deck.length <= 1) throw new RangeError("cannot remove the last deck card");
  if (run.gold < shop.removalPrice) throw new RangeError("insufficient gold");
  return { ...run, gold: run.gold - shop.removalPrice, deck: run.deck.filter((card) => card.instanceId !== cardInstanceId),
    shop: { ...shop, removalUsed: true } };
}

export function closeShop(run: RunState): RunState {
  if (!run.shop || run.combat) throw new Error("shop is not active");
  return { ...run, shop: null };
}

export function healAtRest(run: RunState, options: EconomyOptions = DEFAULT_ECONOMY_OPTIONS): RunState {
  if (currentNode(run).kind !== "rest" || run.combat || run.shop) throw new Error("expected rest node outside combat");
  const percent = nonNegative(options.restHealPercent, "restHealPercent");
  if (percent > 100) throw new RangeError("restHealPercent must not exceed 100");
  const heal = Math.ceil(run.player.maxHp * percent / 100);
  return { ...run, player: { ...run.player, hp: Math.min(run.player.maxHp, run.player.hp + heal) } };
}

export function upgradeAtRest(run: RunState, cardInstanceId: string): RunState {
  if (currentNode(run).kind !== "rest" || run.combat || run.shop) throw new Error("expected rest node outside combat");
  const card = run.deck.find((item) => item.instanceId === cardInstanceId);
  if (!card) throw new RangeError(`no upgrade target: ${cardInstanceId}`);
  if (card.upgraded) throw new Error(`card already upgraded: ${cardInstanceId}`);
  return { ...run, deck: run.deck.map((item) => item.instanceId === cardInstanceId ? { ...item, upgraded: true } : item) };
}
