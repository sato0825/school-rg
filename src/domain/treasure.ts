import { requireSetting, type GameConfig } from "./config.js";
import { collectPotion } from "./potions.js";
import { shuffle } from "./random.js";
import { acquireRelic } from "./relic-hooks.js";
import type { ContentRegistry, RunState, TreasureState } from "./schema.js";

const issue = "https://github.com/sato0825/school-rg/issues/67";
export const DEFAULT_TREASURE_SETTINGS = {
  relicOffers: { status: "provisional", value: 1, source: issue, ownerIssue: 67 },
  potionOffers: { status: "provisional", value: 2, source: issue, ownerIssue: 67 },
} as const;

export type TreasureOptions = { relicOffers: number; potionOffers: number };
export const DEFAULT_TREASURE_OPTIONS: TreasureOptions = {
  relicOffers: requireSetting(DEFAULT_TREASURE_SETTINGS.relicOffers),
  potionOffers: requireSetting(DEFAULT_TREASURE_SETTINGS.potionOffers),
};

function assertOfferCount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("treasure offer count must be nonnegative");
}

export function openTreasure(run: RunState, content: ContentRegistry, options: TreasureOptions = DEFAULT_TREASURE_OPTIONS): RunState {
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (node?.kind !== "treasure" || run.combat || run.shop || run.event || run.treasure) throw new Error("expected unopened treasure node outside combat");
  assertOfferCount(options.relicOffers);
  assertOfferCount(options.potionOffers);
  const relics = shuffle(run.rngState, content.relics.map((item) => item.id));
  const potions = shuffle(relics.state, content.potions.map((item) => item.id));
  const offers: TreasureState["offers"] = [
    ...relics.items.slice(0, options.relicOffers).map((contentId, index) => ({ offerId: `relic-${index + 1}`, kind: "relic" as const, contentId })),
    ...potions.items.slice(0, options.potionOffers).map((contentId, index) => ({ offerId: `potion-${index + 1}`, kind: "potion" as const, contentId })),
  ];
  if (!offers.length) throw new RangeError("treasure pool has no offers");
  return { ...run, rngState: potions.state, treasure: { nodeId: node.id, offers } };
}

export function claimTreasure(run: RunState, offerId: string, content: ContentRegistry, config: GameConfig): RunState {
  const treasure = run.treasure;
  if (!treasure || treasure.nodeId !== run.map.currentNodeId || run.combat) throw new Error("treasure is not active");
  const offer = treasure.offers.find((item) => item.offerId === offerId);
  if (!offer) throw new RangeError(`unknown treasure offer: ${offerId}`);
  const gained = offer.kind === "relic" ? acquireRelic(run, offer.contentId, content) : collectPotion(run, offer.contentId, content, config);
  return { ...gained, treasure: null };
}

export function leaveTreasure(run: RunState): RunState {
  if (!run.treasure || run.treasure.nodeId !== run.map.currentNodeId || run.combat) throw new Error("treasure is not active");
  return { ...run, treasure: null };
}
