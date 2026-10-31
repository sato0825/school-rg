import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const content = path.join(root, "src/content");
const output = path.join(root, "docs/art/production/issue255");
const candidates = JSON.parse(fs.readFileSync(path.join(output, "existing-candidates.json"), "utf8"));
const wave1 = JSON.parse(fs.readFileSync(path.join(output, "wave1-assets.json"), "utf8"));
if (new Set(wave1.map((asset) => `${asset.id}:${asset.version}`)).size !== wave1.length) throw new Error("duplicate wave-one asset IDs");
for (const asset of wave1) {
  const actual = createHash("sha256").update(fs.readFileSync(path.join(root, asset.path))).digest("hex");
  if (actual !== asset.sha256) throw new Error(`asset hash mismatch: ${asset.id}`);
  candidates[asset.id] = [...(candidates[asset.id] ?? []), { issue: 255, version: asset.version, source: asset.path, state: asset.state, sha256: asset.sha256 }];
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
const items = [...cards, ...relics, ...potions].map((entry) => ({
  ...entry, art: { state: candidates[entry.id]?.length ? "candidate" : "missing", acceptedVersion: null, editableSource: null, candidateRefs: candidates[entry.id] ?? [] },
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
console.log(JSON.stringify({ counts, duplicateInputs: duplicateInputs.length, similarEffects: similarEffects.length, existingCandidates: items.filter((item) => item.art.candidateRefs.length > 0).length }));
