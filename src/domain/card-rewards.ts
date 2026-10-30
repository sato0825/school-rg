import type { ContentRegistry } from "./schema.js";
import { createRandomState, shuffle } from "./random.js";

export type RewardOptions = { choiceCount: number; minimumSignatureCards: number };
export type RewardGenerator = (state: number, club: ContentRegistry["clubs"][number]) => { state: number; cardIds: string[] };
/** Provisional #94 distribution. Final rarity and balance belong to #68. */
export const PROVISIONAL_REWARD_OPTIONS: RewardOptions = { choiceCount: 3, minimumSignatureCards: 1 };

/** Selects unique card IDs with a serializable RNG state; content and policy are injected. */
export function generateCardRewards(state: number, club: ContentRegistry["clubs"][number], options: RewardOptions = PROVISIONAL_REWARD_OPTIONS): { state: number; cardIds: string[] } {
  createRandomState(state);
  if (!Number.isSafeInteger(options.choiceCount) || options.choiceCount < 1 || !Number.isSafeInteger(options.minimumSignatureCards) || options.minimumSignatureCards < 0 || options.minimumSignatureCards > options.choiceCount) {
    throw new RangeError("invalid reward policy");
  }
  const pool = [...new Set(club.cardPoolIds)];
  const signature = [...new Set(club.signatureCardIds ?? [])].filter((cardId) => pool.includes(cardId));
  const minimum = Math.min(options.minimumSignatureCards, signature.length, options.choiceCount);
  if (minimum === 0) {
    const shuffled = shuffle(state, pool);
    return { state: shuffled.state, cardIds: shuffled.items.slice(0, options.choiceCount) };
  }
  const first = shuffle(state, signature);
  const chosen = first.items.slice(0, minimum);
  const remainder = shuffle(first.state, pool.filter((cardId) => !chosen.includes(cardId)));
  const mixed = shuffle(remainder.state, [...chosen, ...remainder.items.slice(0, options.choiceCount - chosen.length)]);
  return { state: mixed.state, cardIds: mixed.items };
}
