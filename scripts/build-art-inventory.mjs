import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const content = path.join(root, "src/content");
const output = path.join(root, "docs/art/production/issue255");
const candidates = JSON.parse(fs.readFileSync(path.join(output, "existing-candidates.json"), "utf8"));
const wave1 = JSON.parse(fs.readFileSync(path.join(output, "wave1-assets.json"), "utf8"));
const wave2Dir = path.join(root, "docs/art/production/issue269");
const wave2 = ["wave2-assets.json", "wave2-assets-supplement.json", "wave2-revision-assets.json", "wave2-harmonization-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(wave2Dir, file), "utf8")));
const heavyStrikeDir = path.join(root, "docs/art/production/issue275");
const heavyStrike = ["assets-v1.json", "assets-v2.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(heavyStrikeDir, file), "utf8")));
const wave3Dir = path.join(root, "docs/art/production/issue277");
const wave3 = ["observe-v1-assets.json", "observe-v2-assets.json", "assets-batch-a.json", "assets-batch-b.json", "revision-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(wave3Dir, file), "utf8")));
const wave4Dir = path.join(root, "docs/art/production/issue284");
const wave4 = ["assets-batch-a.json", "assets-batch-b.json", "revision-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(wave4Dir, file), "utf8")));
const relicDir = path.join(root, "docs/art/production/issue291");
const relicWave1 = JSON.parse(fs.readFileSync(path.join(relicDir, "assets-v1.json"), "utf8"));
const outlineDir = path.join(root, "docs/art/production/issue296");
const outlineRevisions = JSON.parse(fs.readFileSync(path.join(outlineDir, "provenance.json"), "utf8"))
  .filter((asset) => asset.version === "v2" || asset.version === "v3");
const relicWave2Dir = path.join(root, "docs/art/production/issue301");
const relicWave2 = JSON.parse(fs.readFileSync(path.join(relicWave2Dir, "assets-v1.json"), "utf8"));
const potionDir = path.join(root, "docs/art/production/issue309");
const potionWave1 = JSON.parse(fs.readFileSync(path.join(potionDir, "assets-v1.json"), "utf8"));
const clubWaveDir = path.join(root, "docs/art/production/issue314");
const clubWave = ["assets-a.json", "assets-b.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(clubWaveDir, file), "utf8")));
const commonWaveDir = path.join(root, "docs/art/production/issue328");
const commonWave = ["assets-a.json", "assets-b.json", "revision-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(commonWaveDir, file), "utf8")));
const finalWaveDir = path.join(root, "docs/art/production/issue338");
const finalWave = ["assets-a.json", "assets-b.json", "revision-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(finalWaveDir, file), "utf8")));
const lastEight = JSON.parse(fs.readFileSync(path.join(root, "docs/art/production/issue377/assets.json"), "utf8"));
const allProducedAssets = [...wave1.map((asset) => ({ ...asset, issue: 255 })), ...wave2.map((asset) => ({ ...asset, issue: 269 })), ...heavyStrike.map((asset) => ({ ...asset, issue: 275 })), ...wave3.map((asset) => ({ ...asset, issue: 277 })), ...wave4.map((asset) => ({ ...asset, issue: 284 })), ...relicWave1.map((asset) => ({ ...asset, issue: 291 })), ...outlineRevisions.map((asset) => ({ ...asset, issue: 296 })), ...relicWave2.map((asset) => ({ ...asset, issue: 301 })), ...potionWave1.map((asset) => ({ ...asset, issue: 309 })), ...clubWave.map((asset) => ({ ...asset, issue: 314 })), ...commonWave.map((asset) => ({ ...asset, issue: 328 })), ...finalWave.map((asset) => ({ ...asset, issue: 338 })), ...lastEight.map((asset) => ({ ...asset, issue: 377 }))];
if (new Set(allProducedAssets.map((asset) => `${asset.id}:${asset.version}`)).size !== allProducedAssets.length) throw new Error("duplicate produced asset ID/version");
for (const asset of allProducedAssets) {
  const actual = createHash("sha256").update(fs.readFileSync(path.join(root, asset.path))).digest("hex");
  if (actual !== asset.sha256) throw new Error(`asset hash mismatch: ${asset.id}`);
  candidates[asset.id] = [...(candidates[asset.id] ?? []), { issue: asset.issue, version: asset.version, source: asset.path, state: asset.state, sha256: asset.sha256 }];
}

function value(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text.replaceAll("_", ""));
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -value(node.operand);
  if (ts.isArrayLiteralExpression(node)) return node.elements.filter((part) => !ts.isSpreadElement(part)).map(value);
  if (ts.isObjectLiteralExpression(node)) {
    const record = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      record[property.name.getText().replaceAll(/['"]/g, "")] = value(property.initializer);
    }
    return record;
  }
  return null;
}

function getArray(file, variable) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variable && node.initializer && ts.isArrayLiteralExpression(node.initializer)) found = value(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error(`${variable} not found in ${file}`);
  return found;
}

function getObjectArray(file, propertyName) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let found;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === propertyName && ts.isArrayLiteralExpression(node.initializer)) found = value(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error(`${propertyName} not found in ${file}`);
  return found;
}

const clubFiles = [
  ["literature", "literature-cards.ts", "literatureCardSpecs"],
  ["science", "science-cards.ts", "scienceCardSpecs"],
  ["kendo", "kendo-cards.ts", "kendoCardSpecs"],
  ["music", "music-cards.ts", "musicCardSpecs"],
  ["art", "art-cards.ts", "artCardSpecs"],
];
const cards = getArray(path.join(content, "base-cards.ts"), "baseCardSpecs").map((spec) => ({
  id: spec.id, kind: "card", club: "common-pool", name: spec.input, type: spec.type, target: spec.target,
  effectKinds: [spec.effectKind], effectParameters: [spec.parameters],
  source: "src/content/base-cards.ts", rarity: null,
}));
for (const [club, file, variable] of clubFiles) {
  cards.push(...getArray(path.join(content, file), variable).map((spec) => ({
    id: spec.id, kind: "card", club, name: spec.word, type: spec.type, target: spec.target,
    effectKinds: spec.effects.map((effect) => effect.kind), effectParameters: spec.effects.map((effect) => effect.parameters),
    source: `src/content/${file}`, rarity: null,
  })));
}
const demo = path.join(content, "demo-battle.ts");
const extra = path.join(content, "extra-consumables.ts");
const relics = [...getObjectArray(demo, "relics"), ...getArray(extra, "extraRelics")].map((item) => ({
  id: item.id, kind: "relic", club: "shared-or-starting", name: item.name, triggerIds: item.triggerIds,
  effectKinds: item.effectIds, source: item.id && ["attendance-stamp", "lunch-coupon", "pocket-bandage", "practice-timer"].includes(item.id) ? "src/content/extra-consumables.ts" : "src/content/demo-battle.ts", rarity: null,
}));
const potions = [...getObjectArray(demo, "potions"), ...getArray(extra, "extraPotions")].map((item) => ({
  id: item.id, kind: "potion", club: "shared", name: item.name, input: item.input?.text,
  target: item.target, effectKinds: item.effectIds, source: item.id?.startsWith("potion-") && ["potion-guard", "potion-splash", "potion-tea"].includes(item.id) ? "src/content/extra-consumables.ts" : "src/content/demo-battle.ts", rarity: null,
}));
const effectLabel = {
  add_time: "残り時間増加", apply_poison: "毒付与", apply_strength: "筋力上昇", apply_weak: "弱体付与", block: "防御", conditional_damage: "条件付き攻撃",
  copy_card: "手札複製", damage: "攻撃", damage_all: "全体攻撃", damage_if_status: "状態条件攻撃", damage_multi: "連続攻撃", damage_pierce: "貫通攻撃",
  draw: "ドロー", exhaust_card: "除外", heal: "回復", pay_hp_draw: "HP消費とドロー", persistent_block: "毎ターン防御", persistent_strength: "毎ターン筋力",
  remove_block: "敵防御解除", remove_debuff: "弱体解除", retrieve_discard: "捨て札回収", thorns: "反撃", transform_card: "手札変化",
};
const relicMeaning = {
  "library-bookmark": "獲得時ゴールド、ターン開始と技能使用で防御",
  "lab-glasses": "戦闘開始時に筋力",
  "bamboo-grip": "ターン開始時に反撃",
  metronome: "ターン開始時に入力時間を追加",
  sketchbook: "美術部カード使用時に防御",
  "spare-shoes": "ターン開始時に防御",
  "hallway-clock": "ターン開始時に入力時間を追加",
  "attendance-stamp": "獲得時と戦闘終了時にゴールド",
  "lunch-coupon": "戦闘終了時に回復",
  "pocket-bandage": "HPダメージを受けた時に回復",
  "practice-timer": "カード使用時に入力時間を追加",
};
const potionMeaning = {
  "potion-time": "入力時間を追加", "potion-heal": "HP回復", "potion-ink": "単体攻撃", "potion-guard": "防御", "potion-splash": "全体攻撃", "potion-tea": "回復と入力時間追加",
};
const items = [...cards, ...relics, ...potions].map((entry) => ({
  ...entry,
  meaning: entry.kind === "card" ? entry.effectKinds.map((kind) => effectLabel[kind] ?? kind).join(" + ") : entry.kind === "relic" ? relicMeaning[entry.id] : potionMeaning[entry.id],
  art: { state: candidates[entry.id]?.length ? "candidate" : "missing", acceptedVersion: null, editableSource: null, candidateRefs: candidates[entry.id] ?? [] },
}));
const counts = { cards: cards.length, relics: relics.length, potions: potions.length, total: items.length };
if (counts.cards !== 84 || counts.relics !== 11 || counts.potions !== 6) throw new Error(`content counts changed: ${JSON.stringify(counts)}`);
const byId = new Map();
for (const entry of items) {
  if (byId.has(entry.id)) throw new Error(`duplicate ID ${entry.id}`);
  byId.set(entry.id, entry);
}
const inputGroups = Map.groupBy(cards, (card) => card.name);
const duplicateInputs = [...inputGroups].filter(([, group]) => group.length > 1).map(([input, group]) => ({ input, ids: group.map((card) => card.id) }));
const effectGroups = Map.groupBy(cards, (card) => `${card.target}:${card.effectKinds.join("+")}`);
const similarEffects = [...effectGroups].filter(([, group]) => group.length > 1).map(([signature, group]) => ({ signature, ids: group.map((card) => card.id) }));
const report = { schemaVersion: 1, generatedFrom: "repository source, 2026-10-31", counts, duplicateInputs, similarEffects, items };
fs.writeFileSync(path.join(output, "content-art-inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
