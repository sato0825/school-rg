import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { ContentRegistry } from "../domain/schema.js";

/** #124 alternate Act bosses. Names, values and selection rates are provisional. */
export const extraBossEffects: ContentRegistry["effects"] = [
  { id: "scoreboard-guard", kind: "block", parameters: { amount: 5 } },
  { id: "scoreboard-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
  { id: "scoreboard-hit", kind: "damage", parameters: { amount: 6 } },
  { id: "scoreboard-heavy", kind: "damage", parameters: { amount: 9 } },
  { id: "vent-frail", kind: "status", parameters: { status: "frail", delta: 1, target: "player" } },
  { id: "vent-guard", kind: "block", parameters: { amount: 5 } },
  { id: "vent-hit", kind: "damage", parameters: { amount: 8 } },
  { id: "curtain-hit", kind: "damage", parameters: { amount: 5, hits: 2 } },
  { id: "curtain-guard", kind: "block", parameters: { amount: 7 } },
  { id: "curtain-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
];

export const extraBossIntents: ContentRegistry["intents"] = [
  { id: "scoreboard-intent-prepare", label: "得点板が数字を揃える", category: "mixed", effectIds: ["scoreboard-guard", "scoreboard-focus"] },
  { id: "scoreboard-intent-hit", label: "得点が跳ね返る", category: "attack", effectIds: ["scoreboard-hit"] },
  { id: "scoreboard-intent-heavy", label: "終了の数字が落ちる", category: "attack", effectIds: ["scoreboard-heavy"] },
  { id: "vent-intent-pressure", label: "換気が視界を乱す", category: "mixed", effectIds: ["vent-frail", "vent-guard"] },
  { id: "vent-intent-hit", label: "排気口が吹き荒れる", category: "attack", effectIds: ["vent-hit"] },
  { id: "curtain-intent-hit", label: "幕が連続で揺れる", category: "attack", effectIds: ["curtain-hit"] },
  { id: "curtain-intent-prepare", label: "幕が舞台を覆う", category: "mixed", effectIds: ["curtain-guard", "curtain-focus"] },
];

export const extraBosses: ContentRegistry["enemies"] = [
  { id: "gym-scoreboard", name: "体育館の得点板", maxHp: 39, intentIds: ["scoreboard-intent-prepare", "scoreboard-intent-hit", "scoreboard-intent-heavy"] },
  { id: "lab-ventilation", name: "実験棟の換気装置", maxHp: 40, intentIds: ["vent-intent-pressure", "vent-intent-hit"] },
  { id: "graduation-curtain", name: "講堂の閉じる幕", maxHp: 42, intentIds: ["curtain-intent-hit", "curtain-intent-prepare"] },
];

export const extraBossAi: EnemyAiRegistry = {
  "gym-scoreboard": { kind: "sequence", intentIds: ["scoreboard-intent-prepare", "scoreboard-intent-hit", "scoreboard-intent-heavy"] },
  "lab-ventilation": { kind: "conditional", branches: [{ when: { kind: "player_status_at_least", status: "frail", amount: 1 }, intentId: "vent-intent-hit" }], fallbackIntentId: "vent-intent-pressure" },
  "graduation-curtain": { kind: "weighted", choices: [{ intentId: "curtain-intent-hit", weight: 2 }, { intentId: "curtain-intent-prepare", weight: 1 }] },
};
