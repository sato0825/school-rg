/** Provisional character presentation. All image paths can be replaced without touching run rules. */
export const clubPresentation = {
  "literature-demo": {
    number: "01", label: "文芸部", strategy: "短い語をつなぎ、次の手札を編む。", style: "連続入力 · ドロー", accent: "#df6479",
    idle: new URL("../../docs/art/candidates/literature-idle-candidate-v1.png", import.meta.url).href,
    activate: new URL("../../docs/art/candidates/literature-activate-candidate-v2.png", import.meta.url).href,
    hit: new URL("../../docs/art/candidates/literature-hit-candidate-v2.png", import.meta.url).href,
  },
  "science-demo": {
    number: "02", label: "科学部", strategy: "状態を観察し、仕込んだ反応を起こす。", style: "状態異常 · 条件攻撃", accent: "#58aab7",
    idle: new URL("../../docs/art/candidates/serious-student-idle-candidate-v1.png", import.meta.url).href,
    activate: new URL("../../docs/art/candidates/serious-student-activate-candidate-v1.png", import.meta.url).href,
    hit: new URL("../../docs/art/candidates/serious-student-hit-candidate-v1.png", import.meta.url).href,
  },
  "kendo-demo": {
    number: "03", label: "剣道部", strategy: "Intentを読み、防いでから踏み込む。", style: "防御 · 反撃", accent: "#688fca",
    idle: new URL("../../docs/art/candidates/kendo-idle-candidate-v1.png", import.meta.url).href,
    activate: new URL("../../docs/art/candidates/kendo-activate-candidate-v3.png", import.meta.url).href,
    hit: new URL("../../docs/art/candidates/kendo-hit-candidate-v2.png", import.meta.url).href,
  },
  "music-demo": {
    number: "04", label: "軽音部", strategy: "時間を伸ばし、長いフレーズを決める。", style: "時間操作 · 連打", accent: "#9b80d3",
    idle: new URL("../../docs/art/candidates/music-idle-candidate-v1.png", import.meta.url).href,
    activate: new URL("../../docs/art/candidates/music-activate-candidate-v2.png", import.meta.url).href,
    hit: new URL("../../docs/art/candidates/music-hit-candidate-v2.png", import.meta.url).href,
  },
  "art-demo": {
    number: "05", label: "美術部", strategy: "残す、写す、変える。手札を作品にする。", style: "保持 · 生成 · 変化", accent: "#5aab98",
    idle: new URL("../../docs/art/candidates/art-idle-candidate-v1.png", import.meta.url).href,
    activate: new URL("../../docs/art/candidates/art-activate-candidate-v2.png", import.meta.url).href,
    hit: new URL("../../docs/art/candidates/art-hit-candidate-v3.png", import.meta.url).href,
  },
} as const;

export function presentationForClub(clubId: string) {
  return clubPresentation[clubId as keyof typeof clubPresentation] ?? clubPresentation["literature-demo"];
}
