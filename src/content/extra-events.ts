import type { EventDefinition } from "../domain/schema.js";
import { provisionalEventBalance as b } from "./event-balance.js";

/** Additional school-specific choices for #116; all amounts remain provisional. */
export const extraEvents: EventDefinition[] = [
  {
    id: "classroom-proofreading", title: "放課後の添削机", description: "掲示物の下書きを直している先輩が、カードを一枚見直してくれる。",
    choices: [
      { id: "leave", label: "礼を言って進む", requires: [], effects: [] },
      { id: "upgrade", label: `${b.editAct1UpgradeGold}Gでカードを1枚強化`, requires: [{ kind: "gold_at_least", amount: b.editAct1UpgradeGold }], effects: [{ kind: "gold", amount: -b.editAct1UpgradeGold }, { kind: "upgrade_card" }] },
    ],
  },
  {
    id: "archive-return-slip", title: "資料室の返却票", description: "古い記録を棚に戻すため、持ち物を一つ整理できる。",
    choices: [
      { id: "leave", label: "何も返さない", requires: [], effects: [] },
      { id: "remove", label: `${b.editAct2RemoveGold}Gでカードを1枚整理`, requires: [{ kind: "gold_at_least", amount: b.editAct2RemoveGold }], effects: [{ kind: "gold", amount: -b.editAct2RemoveGold }, { kind: "remove_card" }] },
    ],
  },
  {
    id: "festival-layout-desk", title: "文化祭の編集机", description: "展示の順番を決める編集机。残す一枚を磨くか、荷物を減らすかを選べる。",
    choices: [
      { id: "leave", label: "今の構成を保つ", requires: [], effects: [] },
      { id: "upgrade", label: `${b.editAct3UpgradeGold}Gでカードを1枚強化`, requires: [{ kind: "gold_at_least", amount: b.editAct3UpgradeGold }], effects: [{ kind: "gold", amount: -b.editAct3UpgradeGold }, { kind: "upgrade_card" }] },
      { id: "remove", label: `${b.editAct3RemoveGold}Gでカードを1枚整理`, requires: [{ kind: "gold_at_least", amount: b.editAct3RemoveGold }], effects: [{ kind: "gold", amount: -b.editAct3RemoveGold }, { kind: "remove_card" }] },
    ],
  },
  {
    id: "gym-supply-locker", title: "体育倉庫の予備箱", description: "放課後の体育倉庫で、用具の入った箱が通路をふさいでいる。",
    choices: [
      { id: "leave", label: "通り過ぎる", requires: [], effects: [] },
      { id: "sort", label: `用具を運ぶ · HP${b.supplyWorkHp}を使い${b.supplyWorkGold}G`, requires: [{ kind: "hp_at_least", amount: b.supplyWorkHp + 1 }], effects: [{ kind: "hp", amount: -b.supplyWorkHp }, { kind: "gold", amount: b.supplyWorkGold }] },
      { id: "potion", label: `${b.supplyPotionGold}Gで包帯を受け取る`, requires: [{ kind: "gold_at_least", amount: b.supplyPotionGold }, { kind: "potion_slot_available" }], effects: [{ kind: "gold", amount: -b.supplyPotionGold }, { kind: "add_potion", potionId: "potion-heal" }] },
    ],
  },
  {
    id: "unfinished-draft", title: "書きかけの原稿", description: "机に置かれた原稿には、最後の一行だけがない。",
    choices: [
      { id: "leave", label: "原稿を戻す", requires: [], effects: [] },
      { id: "rewrite", label: `${b.draftCardGold}Gで推敲の資料を借りる`, requires: [{ kind: "gold_at_least", amount: b.draftCardGold }], effects: [{ kind: "gold", amount: -b.draftCardGold }, { kind: "add_card", cardId: "BASE-014" }] },
      { id: "protect", label: `原稿を守る · HP${b.draftGuardHp}を使いdefendを得る`, requires: [{ kind: "hp_at_least", amount: b.draftGuardHp + 1 }], effects: [{ kind: "hp", amount: -b.draftGuardHp }, { kind: "add_card", cardId: "BASE-002" }] },
    ],
  },
  {
    id: "lab-cleanup", title: "理科室の後片づけ", description: "実験台にインクの瓶と未整理の記録が残っている。",
    choices: [
      { id: "leave", label: "戸締まりして出る", requires: [], effects: [] },
      { id: "ink", label: `手を汚して瓶を拾う · HP${b.labInkHp}`, requires: [{ kind: "hp_at_least", amount: b.labInkHp + 1 }, { kind: "potion_slot_available" }], effects: [{ kind: "hp", amount: -b.labInkHp }, { kind: "add_potion", potionId: "potion-ink" }] },
      { id: "notes", label: `${b.labPoisonGold}Gで状態異常の記録を借りる`, requires: [{ kind: "gold_at_least", amount: b.labPoisonGold }], effects: [{ kind: "gold", amount: -b.labPoisonGold }, { kind: "add_card", cardId: "BASE-010" }] },
      { id: "fight", label: "安全標識の異変を調べて戦う", requires: [], effects: [{ kind: "battle", enemyId: "safety-sign" }] },
    ],
  },
  {
    id: "stairwell-memo", title: "階段の練習メモ", description: "踊り場の壁に、誰かの練習メモが貼られている。",
    choices: [
      { id: "leave", label: "メモを残す", requires: [], effects: [] },
      { id: "study", label: `${b.stairCardGold}Gで貫通の練習を写す`, requires: [{ kind: "gold_at_least", amount: b.stairCardGold }], effects: [{ kind: "gold", amount: -b.stairCardGold }, { kind: "add_card", cardId: "BASE-012" }] },
      { id: "rest", label: `${b.stairHealGold}Gで休む · HP${b.stairHealHp}回復`, requires: [{ kind: "gold_at_least", amount: b.stairHealGold }], effects: [{ kind: "gold", amount: -b.stairHealGold }, { kind: "hp", amount: b.stairHealHp }] },
      { id: "fight", label: "反響の正体と戦う", requires: [], effects: [{ kind: "battle", enemyId: "stairwell-echo" }] },
    ],
  },
  {
    id: "exam-material-box", title: "試験資料の封筒", description: "封の切られていない資料が、終業前の教室に残っている。",
    choices: [
      { id: "leave", label: "封筒に触れない", requires: [], effects: [] },
      { id: "focus", label: `${b.examFocusGold}Gで集中の資料を借りる`, requires: [{ kind: "gold_at_least", amount: b.examFocusGold }], effects: [{ kind: "gold", amount: -b.examFocusGold }, { kind: "add_card", cardId: "BASE-020" }] },
      { id: "strike", label: `夜の練習を続ける · HP${b.examStrikeHp}でheavy strikeを得る`, requires: [{ kind: "hp_at_least", amount: b.examStrikeHp + 1 }], effects: [{ kind: "hp", amount: -b.examStrikeHp }, { kind: "add_card", cardId: "BASE-003" }] },
    ],
  },
  {
    id: "last-train-board", title: "最終下校の案内板", description: "駅へ向かう道の掲示板に、最後のバスの時刻が灯っている。",
    choices: [
      { id: "leave", label: "時刻を確かめて進む", requires: [], effects: [] },
      { id: "rest", label: `${b.lastTrainHealGold}Gで一息つく · HP${b.lastTrainHealHp}回復`, requires: [{ kind: "gold_at_least", amount: b.lastTrainHealGold }], effects: [{ kind: "gold", amount: -b.lastTrainHealGold }, { kind: "hp", amount: b.lastTrainHealHp }] },
      { id: "clock", label: `走って時間の小瓶を拾う · HP${b.lastTrainClockHp}`, requires: [{ kind: "hp_at_least", amount: b.lastTrainClockHp + 1 }, { kind: "potion_slot_available" }], effects: [{ kind: "hp", amount: -b.lastTrainClockHp }, { kind: "add_potion", potionId: "potion-time" }] },
      { id: "fight", label: "案内放送の正体と戦う", requires: [], effects: [{ kind: "battle", enemyId: "night-announcement" }] },
    ],
  },
];
