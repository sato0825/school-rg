import { extraConsumableBalance } from "../content/extra-consumables.js";
import type { ContentRegistry } from "../domain/schema.js";

/** Presentation-only mapping. Candidate images and rule copy can be replaced independently of save/content IDs. */
export type ItemArt = Readonly<{ artId: string; version: string; url: string | null; state: "candidate" | "missing"; sourceIssue: number | null }>;
const relic = (id: string, issue: number, url: string): ItemArt => ({
  artId: `relic.${id}`, version: "candidate-v1", state: "candidate", sourceIssue: issue,
  url,
});

export const candidateRelicArt: Readonly<Record<string, ItemArt>> = Object.freeze({
  "library-bookmark": relic("library-bookmark", 242, new URL("../assets/relics/issue308/library-bookmark-v1-256.webp", import.meta.url).href),
  "lab-glasses": relic("lab-glasses", 246, new URL("../assets/relics/issue308/lab-glasses-v1-256.webp", import.meta.url).href),
  "bamboo-grip": relic("bamboo-grip", 291, new URL("../assets/relics/issue308/bamboo-grip-v1-256.webp", import.meta.url).href),
  "metronome": relic("metronome", 246, new URL("../assets/relics/issue308/metronome-v1-256.webp", import.meta.url).href),
  "sketchbook": relic("sketchbook", 291, new URL("../assets/relics/issue308/sketchbook-v1-256.webp", import.meta.url).href),
  "spare-shoes": relic("spare-shoes", 291, new URL("../assets/relics/issue308/spare-shoes-v1-256.webp", import.meta.url).href),
  "attendance-stamp": relic("attendance-stamp", 291, new URL("../assets/relics/issue308/attendance-stamp-v1-256.webp", import.meta.url).href),
  "hallway-clock": relic("hallway-clock", 301, new URL("../assets/relics/issue308/hallway-clock-v1-256.webp", import.meta.url).href),
  "lunch-coupon": relic("lunch-coupon", 301, new URL("../assets/relics/issue308/lunch-coupon-v1-256.webp", import.meta.url).href),
  "pocket-bandage": relic("pocket-bandage", 301, new URL("../assets/relics/issue308/pocket-bandage-v1-256.webp", import.meta.url).href),
  "practice-timer": relic("practice-timer", 301, new URL("../assets/relics/issue308/practice-timer-v1-256.webp", import.meta.url).href),
});

export function relicArtForId(id: string, catalog: Readonly<Record<string, ItemArt>> = candidateRelicArt): ItemArt {
  return catalog[id] ?? { artId: `relic.${id}`, version: "unassigned", url: null, state: "missing", sourceIssue: null };
}

/** Exact provisional rule text is kept with the UI metadata; tests compare its numbers to hook effects. */
export const relicRuleText: Readonly<Record<string, string>> = Object.freeze({
  "library-bookmark": "取得時に2G。毎ターン開始時にブロック1。技能カード使用時に所持数ぶんブロック。",
  "lab-glasses": "戦闘開始時に所持数ぶん力を得る。",
  "bamboo-grip": "毎ターン開始時に所持数ぶん反撃を得る。",
  "metronome": "毎ターン開始時に所持数ぶん入力時間を1秒延長。",
  "sketchbook": "美術部カード使用時に所持数ぶんブロック。",
  "spare-shoes": "毎ターン開始時に所持数×2ブロック。",
  "attendance-stamp": `取得時に${extraConsumableBalance.stampAcquiredGold}G。戦闘終了時に所持数×${extraConsumableBalance.stampCombatGold}G。`,
  "hallway-clock": "毎ターン開始時に所持数ぶん入力時間を0.5秒延長。",
  "lunch-coupon": `生存して戦闘終了時に所持数×${extraConsumableBalance.lunchHeal}HP回復（最大HPまで）。`,
  "pocket-bandage": `HPダメージを受けて生存した時に所持数×${extraConsumableBalance.bandageHitHeal}HP回復（最大HPまで）。`,
  "practice-timer": `カード使用時に所持数×${extraConsumableBalance.timerCardMs / 1_000}秒延長。`,
});

const html = (value: string): string => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function relicObjectMarkup(id: string, className = "relic-object"): string {
  const art = relicArtForId(id);
  return `<span class="${className}" data-art-id="${html(art.artId)}" data-art-version="${html(art.version)}" data-art-state="${art.state}" aria-hidden="true">${art.url ? `<img src="${html(art.url)}" alt="" />` : "?"}</span>`;
}

export function relicInventoryMarkup(ids: readonly string[], content: ContentRegistry, selectedId: string | null = null): string {
  return `<div class="relic-row" role="group" aria-label="所持レリック">${[...new Set(ids)].map((id, index) => {
    const name = content.relics.find((item) => item.id === id)?.name ?? id;
    const detail = relicRuleText[id] ?? "効果詳細は未登録";
    const copies = ids.filter((item) => item === id).length;
    return `<button type="button" class="relic-item" data-action="relic-detail" data-id="${html(id)}" aria-expanded="${selectedId === id}" aria-label="${html(`${name}${copies > 1 ? `、${copies}個` : ""}。${detail}`)}" title="${html(name)}" data-relic-index="${index}">${relicObjectMarkup(id)}<span class="relic-item-count" aria-hidden="true">${copies > 1 ? copies : ""}</span></button>`;
  }).join("")}</div>`;
}
