import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { ContentRegistry } from "../domain/schema.js";

/** #120 school encounter candidates; HP, damage and weights are provisional. */
export const extraEnemyEffects: ContentRegistry["effects"] = [
  { id: "homework-weak", kind: "status", parameters: { status: "weak", delta: 1, target: "player" } },
  { id: "homework-hit", kind: "damage", parameters: { amount: 4 } },
  { id: "gate-push", kind: "damage", parameters: { amount: 4 } },
  { id: "gate-guard", kind: "block", parameters: { amount: 3 } },
  { id: "gate-heavy", kind: "damage", parameters: { amount: 7 } },
  { id: "magnet-hit", kind: "damage", parameters: { amount: 5 } },
  { id: "magnet-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
  { id: "index-hit", kind: "damage", parameters: { amount: 4 } },
  { id: "index-guard", kind: "block", parameters: { amount: 6 } },
  { id: "index-heavy", kind: "damage", parameters: { amount: 8 } },
  { id: "desk-frail", kind: "status", parameters: { status: "frail", delta: 1, target: "player" } },
  { id: "desk-hit", kind: "damage", parameters: { amount: 6 } },
  { id: "bus-weak", kind: "status", parameters: { status: "weak", delta: 1, target: "player" } },
  { id: "bus-double", kind: "damage", parameters: { amount: 5, hits: 2 } },
];

export const extraEnemyIntents: ContentRegistry["intents"] = [
  { id: "homework-intent-weak", label: "答案を散らして惑わす", category: "debuff", effectIds: ["homework-weak"] },
  { id: "homework-intent-hit", label: "答案が飛ぶ", category: "attack", effectIds: ["homework-hit"] },
  { id: "gate-intent-brace", label: "門が押し戻す", category: "mixed", effectIds: ["gate-push", "gate-guard"] },
  { id: "gate-intent-heavy", label: "門が大きく閉まる", category: "attack", effectIds: ["gate-heavy"] },
  { id: "magnet-intent-hit", label: "磁石が跳ねる", category: "attack", effectIds: ["magnet-hit"] },
  { id: "magnet-intent-focus", label: "磁力を集める", category: "buff", effectIds: ["magnet-focus"] },
  { id: "index-intent-brace", label: "棚を押し出す", category: "mixed", effectIds: ["index-hit", "index-guard"] },
  { id: "index-intent-heavy", label: "索引が一斉に倒れる", category: "attack", effectIds: ["index-heavy"] },
  { id: "desk-intent-frail", label: "机が軋む", category: "debuff", effectIds: ["desk-frail"] },
  { id: "desk-intent-hit", label: "引き出しが開く", category: "attack", effectIds: ["desk-hit"] },
  { id: "bus-intent-weak", label: "行き先を惑わす", category: "debuff", effectIds: ["bus-weak"] },
  { id: "bus-intent-double", label: "連続する発車ベル", category: "attack", effectIds: ["bus-double"] },
];

export const extraEnemies: ContentRegistry["enemies"] = [
  { id: "lost-homework", name: "迷子の答案", maxHp: 23, intentIds: ["homework-intent-weak", "homework-intent-hit"] },
  { id: "school-gate", name: "閉まる校門", maxHp: 35, intentIds: ["gate-intent-brace", "gate-intent-heavy"] },
  { id: "lab-magnet", name: "理科室の磁石", maxHp: 30, intentIds: ["magnet-intent-hit", "magnet-intent-focus"] },
  { id: "library-index", name: "動く書架の索引", maxHp: 36, intentIds: ["index-intent-brace", "index-intent-heavy"] },
  { id: "empty-desk", name: "誰もいない机", maxHp: 32, intentIds: ["desk-intent-frail", "desk-intent-hit"] },
  { id: "last-bus", name: "最終便の影", maxHp: 39, intentIds: ["bus-intent-weak", "bus-intent-double"] },
];

export const extraEnemyAi: EnemyAiRegistry = {
  "lost-homework": { kind: "sequence", intentIds: ["homework-intent-weak", "homework-intent-hit"] },
  "school-gate": { kind: "conditional", branches: [{ when: { kind: "turn_at_least", turn: 3 }, intentId: "gate-intent-heavy" }], fallbackIntentId: "gate-intent-brace" },
  "lab-magnet": { kind: "weighted", choices: [{ intentId: "magnet-intent-hit", weight: 2 }, { intentId: "magnet-intent-focus", weight: 1 }] },
  "library-index": { kind: "conditional", branches: [{ when: { kind: "hp_at_most_percent", percent: 50 }, intentId: "index-intent-heavy" }], fallbackIntentId: "index-intent-brace" },
  "empty-desk": { kind: "sequence", intentIds: ["desk-intent-frail", "desk-intent-hit"] },
  "last-bus": { kind: "conditional", branches: [{ when: { kind: "player_status_at_least", status: "weak", amount: 1 }, intentId: "bus-intent-double" }], fallbackIntentId: "bus-intent-weak" },
};
