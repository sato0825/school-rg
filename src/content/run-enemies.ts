import type { EnemyAiRegistry } from "../domain/enemy-ai.js";
import type { ContentRegistry } from "../domain/schema.js";

/** #203: additional school encounters. HP, damage and pool size remain provisional under #68. */
export const runEnemyEffects: ContentRegistry["effects"] = [
  { id: "mop-sweep", kind: "damage", parameters: { amount: 3, hits: 2 } },
  { id: "mop-brace", kind: "block", parameters: { amount: 4 } },
  { id: "mop-hit", kind: "damage", parameters: { amount: 5 } },
  { id: "map-call", kind: "summon", parameters: { enemyId: "paper-scrap" } },
  { id: "map-hit", kind: "damage", parameters: { amount: 4 } },
  { id: "mist-poison", kind: "status", parameters: { status: "poison", delta: 1, target: "player" } },
  { id: "mist-hit", kind: "damage", parameters: { amount: 5 } },
  { id: "coil-brace", kind: "block", parameters: { amount: 4 } },
  { id: "coil-spark", kind: "damage", parameters: { amount: 3 } },
  { id: "coil-burst", kind: "damage", parameters: { amount: 8 } },
  { id: "spotlight-vulnerable", kind: "status", parameters: { status: "vulnerable", delta: 1, target: "player" } },
  { id: "spotlight-hit", kind: "damage", parameters: { amount: 7 } },
  { id: "clock-strength", kind: "status", parameters: { status: "strength", delta: 1 } },
  { id: "clock-guard", kind: "block", parameters: { amount: 5 } },
  { id: "clock-double", kind: "damage", parameters: { amount: 4, hits: 2 } },
];

export const runEnemyIntents: ContentRegistry["intents"] = [
  { id: "mop-intent-sweep", label: "モップが二度払う", category: "mixed", effectIds: ["mop-sweep", "mop-brace"] },
  { id: "mop-intent-hit", label: "柄を振り下ろす", category: "attack", effectIds: ["mop-hit"] },
  { id: "map-intent-call", label: "地図から紙片が抜ける", category: "summon", effectIds: ["map-call"] },
  { id: "map-intent-hit", label: "折り目が跳ねる", category: "attack", effectIds: ["map-hit"] },
  { id: "mist-intent-poison", label: "蒸気が体にまとわりつく", category: "debuff", effectIds: ["mist-poison"] },
  { id: "mist-intent-hit", label: "試験管が跳ねる", category: "attack", effectIds: ["mist-hit"] },
  { id: "coil-intent-brace", label: "コイルが守りながら弾ける", category: "mixed", effectIds: ["coil-brace", "coil-spark"] },
  { id: "coil-intent-burst", label: "放電が強まる", category: "attack", effectIds: ["coil-burst"] },
  { id: "spotlight-intent-glare", label: "光が隙を作る", category: "debuff", effectIds: ["spotlight-vulnerable"] },
  { id: "spotlight-intent-hit", label: "光線が走る", category: "attack", effectIds: ["spotlight-hit"] },
  { id: "clock-intent-prepare", label: "時計が針を整える", category: "mixed", effectIds: ["clock-strength", "clock-guard"] },
  { id: "clock-intent-double", label: "針が二度鳴る", category: "attack", effectIds: ["clock-double"] },
];

export const runEnemies: ContentRegistry["enemies"] = [
  { id: "hall-mop", name: "廊下のモップ", maxHp: 25, intentIds: ["mop-intent-sweep", "mop-intent-hit"] },
  { id: "folded-school-map", name: "折れた校内図", maxHp: 22, intentIds: ["map-intent-call", "map-intent-hit"] },
  { id: "beaker-mist", name: "試験管の蒸気", maxHp: 28, intentIds: ["mist-intent-poison", "mist-intent-hit"] },
  { id: "lab-coil", name: "実験台のコイル", maxHp: 31, intentIds: ["coil-intent-brace", "coil-intent-burst"] },
  { id: "stage-spotlight", name: "舞台の追光", maxHp: 32, intentIds: ["spotlight-intent-glare", "spotlight-intent-hit"] },
  { id: "archive-clock", name: "閉鎖時刻の時計", maxHp: 35, intentIds: ["clock-intent-prepare", "clock-intent-double"] },
];

export const runEnemyAi: EnemyAiRegistry = {
  "hall-mop": { kind: "weighted", choices: [{ intentId: "mop-intent-sweep", weight: 2 }, { intentId: "mop-intent-hit", weight: 1 }] },
  "folded-school-map": { kind: "conditional", branches: [{ when: { kind: "living_allies_at_most", count: 0 }, intentId: "map-intent-call" }], fallbackIntentId: "map-intent-hit" },
  "beaker-mist": { kind: "sequence", intentIds: ["mist-intent-poison", "mist-intent-hit"] },
  "lab-coil": { kind: "conditional", branches: [{ when: { kind: "hp_at_most_percent", percent: 50 }, intentId: "coil-intent-burst" }], fallbackIntentId: "coil-intent-brace" },
  "stage-spotlight": { kind: "conditional", branches: [{ when: { kind: "player_status_at_least", status: "vulnerable", amount: 1 }, intentId: "spotlight-intent-hit" }], fallbackIntentId: "spotlight-intent-glare" },
  "archive-clock": { kind: "sequence", intentIds: ["clock-intent-prepare", "clock-intent-double"] },
};
