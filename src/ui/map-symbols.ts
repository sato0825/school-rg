import type { MapNode } from "../domain/schema.js";

/** The same symbols and names are used in route selection and the battle projection. */
export const mapKindNames: Record<MapNode["kind"], string> = {
  start: "開始", combat: "戦闘", elite: "強敵", event: "イベント", shop: "購買", rest: "休憩", treasure: "宝箱", boss: "ボス",
};

export const mapKindIcons: Record<MapNode["kind"], string> = {
  start: "◆", combat: "✦", elite: "✧", event: "?", shop: "▣", rest: "☕", treasure: "◇", boss: "★",
};
