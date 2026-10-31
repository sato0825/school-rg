import type { GameConfig } from "../domain/config.js";
import type { ContentRegistry, EnemyInstance, RunState } from "../domain/schema.js";
import { applyStatus, modifiedAttackAmount, modifiedBlockAmount, type StatusKind } from "../domain/status-engine.js";

/** Visual meaning is derived from the same ordered effect IDs as enemy execution. */
export type IntentTarget = "player" | "self" | "enemy_side" | "unknown";
export type IntentStepKind = "attack" | "block" | "heal" | "buff" | "debuff" | "summon" | "unknown";
export type IntentTier = { kind: "normal" | "elite" | "boss" | "unknown"; label: string; symbol: string };
export type IntentVisualStep = {
  effectId: string;
  kind: IntentStepKind;
  icon: string;
  value: string;
  target: IntentTarget;
  targetSymbol: string;
  label: string;
  description: string;
};
export type IntentVisual = {
  intentId: string;
  title: string;
  tier: IntentTier;
  steps: IntentVisualStep[];
  ariaLabel: string;
};

const statusNames: Record<string, string> = {
  strength: "力", dexterity: "技", weak: "弱体", vulnerable: "脆弱", frail: "虚弱", poison: "毒",
};
const statusKinds = new Set<StatusKind>(["strength", "dexterity", "weak", "vulnerable", "frail", "poison"]);
const targetSymbols: Record<IntentTarget, string> = { player: "↙", self: "◎", enemy_side: "↗", unknown: "?" };
const targetNames: Record<IntentTarget, string> = { player: "味方", self: "自身", enemy_side: "敵側", unknown: "対象不明" };

function step(effectId: string, kind: IntentStepKind, icon: string, value: string, target: IntentTarget, label: string, description: string): IntentVisualStep {
  return { effectId, kind, icon, value, target, targetSymbol: targetSymbols[target], label, description };
}

function integer(value: unknown, minimum = 0): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum ? value : null;
}

function effectTarget(value: unknown): "self" | "player" | null {
  if (value === undefined || value === "self") return "self";
  return value === "player" ? "player" : null;
}

function unknown(effectId: string): IntentVisualStep {
  return step(effectId, "unknown", "?", "?", "unknown", "効果不明", "効果の内容を確認できません");
}

/** Map location is the only source for encounter tier; Enemy has no tier field. */
export function intentTierForRun(run: RunState): IntentTier {
  const kind = run.map.nodes.find((node) => node.id === run.map.currentNodeId)?.kind;
  if (kind === "combat") return { kind: "normal", label: "通常戦", symbol: "◇" };
  if (kind === "elite") return { kind: "elite", label: "強敵戦", symbol: "✦" };
  if (kind === "boss") return { kind: "boss", label: "ボス戦", symbol: "✶" };
  return { kind: "unknown", label: "遭遇区分未定", symbol: "?" };
}

/**
 * Converts every enemy effect into a short visual token and complete spoken text.
 * It previews status changes in sequence, so a strength buff before an attack
 * changes that attack's displayed value. It never predicts HP lost after Block.
 */
export function describeEnemyIntent(run: RunState, enemy: EnemyInstance, content: ContentRegistry, config: GameConfig): IntentVisual {
  const tier = intentTierForRun(run);
  const definition = content.enemies.find((item) => item.id === enemy.enemyId);
  const enemyName = definition?.name ?? "敵";
  const intent = content.intents.find((item) => item.id === enemy.intentId);
  const title = intent?.label ?? "行動不明";
  const steps: IntentVisualStep[] = [];
  let preview = run;

  for (const effectId of intent?.effectIds ?? []) {
    const effect = content.effects.find((item) => item.id === effectId);
    if (!effect) { steps.push(unknown(effectId)); continue; }
    const parameters = effect.parameters;
    if (effect.kind === "damage") {
      const amount = integer(parameters.amount);
      const hits = parameters.hits === undefined ? 1 : integer(parameters.hits, 1);
      if (amount === null || hits === null || (parameters.pierceBlock !== undefined && typeof parameters.pierceBlock !== "boolean")) {
        steps.push(unknown(effectId)); continue;
      }
      try {
        const current = modifiedAttackAmount(preview, { side: "enemy", instanceId: enemy.instanceId }, { side: "player" }, amount, config);
        const value = hits > 1 ? `${current}×${hits}` : String(current);
        const pierce = parameters.pierceBlock === true ? "、ブロック貫通" : "";
        steps.push(step(effectId, "attack", "⚔", value, "player", "攻撃", `味方へ攻撃${current}${hits > 1 ? `を${hits}回` : ""}${pierce}`));
      } catch { steps.push(unknown(effectId)); }
      continue;
    }
    if (effect.kind === "block") {
      const amount = integer(parameters.amount);
      const target = effectTarget(parameters.target);
      if (amount === null || !target) { steps.push(unknown(effectId)); continue; }
      try {
        const current = modifiedBlockAmount(preview, target === "self" ? { side: "enemy", instanceId: enemy.instanceId } : { side: "player" }, amount, config);
        steps.push(step(effectId, "block", "◇", `+${current}`, target, "防御", `${targetNames[target]}にブロック${current}を付与`));
      } catch { steps.push(unknown(effectId)); }
      continue;
    }
    if (effect.kind === "heal") {
      const amount = integer(parameters.amount);
      const target = effectTarget(parameters.target);
      if (amount === null || !target) { steps.push(unknown(effectId)); continue; }
      steps.push(step(effectId, "heal", "♥", `+${amount}`, target, "回復", `${targetNames[target]}のHPを最大${amount}回復`));
      continue;
    }
    if (effect.kind === "status") {
      const status = parameters.status;
      const delta = parameters.delta;
      const target = effectTarget(parameters.target);
      if (typeof status !== "string" || !statusKinds.has(status as StatusKind) || typeof delta !== "number" || !Number.isSafeInteger(delta) || !target) {
        steps.push(unknown(effectId)); continue;
      }
      const name = statusNames[status]!;
      const signed = `${delta >= 0 ? "+" : ""}${delta}`;
      const kind = status === "strength" || status === "dexterity" ? "buff" : "debuff";
      steps.push(step(effectId, kind, kind === "buff" ? "↑" : "↓", `${name}${signed}`, target, name, `${targetNames[target]}の${name}を${signed}`));
      try {
        preview = applyStatus(preview, target === "self" ? { side: "enemy", instanceId: enemy.instanceId } : { side: "player" }, status as StatusKind, delta);
      } catch { /* The display still identifies the declared effect if the actor is already defeated. */ }
      continue;
    }
    if (effect.kind === "summon") {
      const summonedId = parameters.enemyId;
      if (typeof summonedId !== "string" || !summonedId) { steps.push(unknown(effectId)); continue; }
      const summonName = content.enemies.find((item) => item.id === summonedId)?.name;
      if (!summonName) { steps.push(unknown(effectId)); continue; }
      steps.push(step(effectId, "summon", "▣", "+1", "enemy_side", "増援", `敵側に${summonName}を1体召喚`));
      continue;
    }
    steps.push(unknown(effectId));
  }

  const spoken = steps.length > 0 ? steps.map((item, index) => `${index + 1}番目、${item.description}`).join("。") : "効果を確認できません";
  const ariaLabel = `${enemyName}。${tier.label}。HP ${enemy.hp}/${enemy.maxHp}、ブロック ${enemy.block}。次の行動「${title}」。${spoken}`;
  return { intentId: enemy.intentId, title, tier, steps, ariaLabel };
}
