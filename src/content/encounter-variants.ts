import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { ContentRegistry } from "../domain/schema.js";

/** Replaceable provisional encounter definitions. Art and balance are tracked in #29/#68. */
export const variantEnemyEffects: ContentRegistry["effects"] = [
  { id: "late-pass-hit", kind: "damage", parameters: { amount: 4 } },
  { id: "late-pass-weak", kind: "status", parameters: { status: "weak", delta: 1, target: "player" } },
  { id: "notice-board-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
  { id: "notice-board-hit", kind: "damage", parameters: { amount: 5 } },
  { id: "safety-sign-guard", kind: "block", parameters: { amount: 5 } },
  { id: "safety-sign-hit", kind: "damage", parameters: { amount: 5 } },
  { id: "stairwell-weak", kind: "status", parameters: { status: "weak", delta: 1, target: "player" } },
  { id: "stairwell-hit", kind: "damage", parameters: { amount: 6 } },
  { id: "window-focus", kind: "status", parameters: { status: "strength", delta: 1 } },
  { id: "window-hit", kind: "damage", parameters: { amount: 6 } },
  { id: "locker-frail", kind: "status", parameters: { status: "frail", delta: 1, target: "player" } },
  { id: "locker-hit", kind: "damage", parameters: { amount: 5, hits: 2 } },
];

export const variantEnemyIntents: ContentRegistry["intents"] = [
  { id: "late-pass-intent-hit", label: "遅刻札を投げる", category: "attack", effectIds: ["late-pass-hit"] },
  { id: "late-pass-intent-weak", label: "焦りを誘う", category: "debuff", effectIds: ["late-pass-weak"] },
  { id: "notice-board-intent-focus", label: "掲示を張り替える", category: "buff", effectIds: ["notice-board-focus"] },
  { id: "notice-board-intent-hit", label: "掲示板が倒れる", category: "attack", effectIds: ["notice-board-hit"] },
  { id: "safety-sign-intent-guard", label: "標識で遮る", category: "defend", effectIds: ["safety-sign-guard"] },
  { id: "safety-sign-intent-hit", label: "標識が跳ねる", category: "attack", effectIds: ["safety-sign-hit"] },
  { id: "stairwell-intent-weak", label: "反響で迷わせる", category: "debuff", effectIds: ["stairwell-weak"] },
  { id: "stairwell-intent-hit", label: "足音が迫る", category: "attack", effectIds: ["stairwell-hit"] },
  { id: "window-intent-focus", label: "影が伸びる", category: "buff", effectIds: ["window-focus"] },
  { id: "window-intent-hit", label: "窓枠が揺れる", category: "attack", effectIds: ["window-hit"] },
  { id: "locker-intent-frail", label: "扉がきしむ", category: "debuff", effectIds: ["locker-frail"] },
  { id: "locker-intent-hit", label: "扉が連続で開く", category: "attack", effectIds: ["locker-hit"] },
];

export const variantEnemies: ContentRegistry["enemies"] = [
  { id: "late-pass", name: "遅刻札の影", maxHp: 24, intentIds: ["late-pass-intent-hit", "late-pass-intent-weak"] },
  { id: "notice-board", name: "動く掲示板", maxHp: 33, intentIds: ["notice-board-intent-focus", "notice-board-intent-hit"] },
  { id: "safety-sign", name: "理科室の安全標識", maxHp: 27, intentIds: ["safety-sign-intent-guard", "safety-sign-intent-hit"] },
  { id: "stairwell-echo", name: "階段の反響", maxHp: 34, intentIds: ["stairwell-intent-weak", "stairwell-intent-hit"] },
  { id: "window-shadow", name: "夜窓の影", maxHp: 30, intentIds: ["window-intent-focus", "window-intent-hit"] },
  { id: "night-locker", name: "夜のロッカー", maxHp: 38, intentIds: ["locker-intent-frail", "locker-intent-hit"] },
];

export const variantEnemyAi: EnemyAiRegistry = {
  "late-pass": { kind: "sequence", intentIds: ["late-pass-intent-weak", "late-pass-intent-hit"] },
  "notice-board": { kind: "sequence", intentIds: ["notice-board-intent-focus", "notice-board-intent-hit"] },
  "safety-sign": { kind: "sequence", intentIds: ["safety-sign-intent-guard", "safety-sign-intent-hit"] },
  "stairwell-echo": { kind: "sequence", intentIds: ["stairwell-intent-weak", "stairwell-intent-hit"] },
  "window-shadow": { kind: "sequence", intentIds: ["window-intent-focus", "window-intent-hit"] },
  "night-locker": { kind: "sequence", intentIds: ["locker-intent-frail", "locker-intent-hit"] },
};
