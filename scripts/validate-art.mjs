import { createHash } from "node:crypto";
import console from "node:console";
import { readFile, access } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cutoutMargin, pngInfo, validateSvgSource } from "./art-asset-checks.mjs";
import { poseGeometryFindings, validateApprovedPoseSet, validateArtVersion } from "./art-pose-geometry.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const register = JSON.parse(await readFile(resolve(root, "docs/art/asset-register.json"), "utf8"));

function assert(condition, message) { if (!condition) throw new Error(message); }
function projectPath(path) {
  assert(typeof path === "string" && path.length > 0, "asset path is required");
  const full = resolve(root, path);
  assert(!relative(root, full).startsWith("..") && full !== root, `path escapes project: ${path}`);
  return full;
}

assert(register.version === 1 && Array.isArray(register.assets), "invalid art register");
const ids = new Set();
const grouped = new Map();
const poseInfo = new Map();
for (const asset of register.assets) {
  assert(typeof asset.id === "string" && !ids.has(asset.id), `duplicate or invalid asset ID: ${asset.id}`);
  ids.add(asset.id);
  validateArtVersion(asset);
  const bytes = await readFile(projectPath(asset.file));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert(hash === asset.sha256, `SHA mismatch: ${asset.id}`);
  const info = pngInfo(bytes);
  if (asset.role === "character-pose") poseInfo.set(asset.id, info);
  assert(info.width === asset.width && info.height === asset.height, `size mismatch: ${asset.id}`);
  if (asset.alpha === "transparent") {
    assert(info.minAlpha === 0 && info.maxAlpha >= 240, `cutout transparency missing: ${asset.id}`);
    if (asset.status === "approved-runtime") cutoutMargin(info);
  }
  else if (asset.alpha === "opaque") assert(info.minAlpha === 255, `opaque plate has alpha: ${asset.id}`);
  else throw new Error(`unknown alpha policy: ${asset.id}`);
  assert(typeof asset.rights === "string" && asset.rights.length > 0, `rights missing: ${asset.id}`);
  if (asset.role === "character-pose") {
    assert(typeof asset.characterId === "string" && ["idle", "activate", "hit"].includes(asset.pose), `pose metadata missing: ${asset.id}`);
    assert(typeof asset.generator === "string" && asset.promptFile && asset.referenceId, `provenance missing: ${asset.id}`);
    await access(projectPath(asset.promptFile));
    const group = grouped.get(asset.characterId) ?? [];
    group.push(asset); grouped.set(asset.characterId, group);
    if (asset.status === "approved-runtime") {
      assert(asset.editableSource && /\.(aseprite|kra|psd|svg)$/.test(asset.editableSource), `editable original missing: ${asset.id}`);
      const sourceFile = projectPath(asset.editableSource);
      await access(sourceFile);
      if (asset.editableSource.endsWith(".svg")) validateSvgSource(await readFile(sourceFile, "utf8"), asset.editableParts);
      assert(asset.reviewFile, `review record missing: ${asset.id}`);
      await access(projectPath(asset.reviewFile));
    } else assert(asset.status === "candidate", `invalid pose status: ${asset.id}`);
  } else if (asset.role === "enemy-portrait") {
    assert(typeof asset.enemyId === "string" && asset.enemyId.length > 0, `enemy ID missing: ${asset.id}`);
    assert(typeof asset.generator === "string" && asset.promptFile, `enemy provenance missing: ${asset.id}`);
    await access(projectPath(asset.promptFile));
    if (asset.status === "approved-runtime") {
      assert(asset.editableSource && /\.(aseprite|kra|psd|svg)$/.test(asset.editableSource), `editable original missing: ${asset.id}`);
      const sourceFile = projectPath(asset.editableSource);
      await access(sourceFile);
      if (asset.editableSource.endsWith(".svg")) validateSvgSource(await readFile(sourceFile, "utf8"), asset.editableParts);
      assert(asset.reviewFile, `review record missing: ${asset.id}`);
      await access(projectPath(asset.reviewFile));
    } else assert(asset.status === "candidate", `invalid enemy status: ${asset.id}`);
  } else if (asset.role === "environment-plate") {
    assert([1, 2, 3].includes(asset.act), `environment Act missing: ${asset.id}`);
    assert(typeof asset.generator === "string" && asset.promptFile, `environment provenance missing: ${asset.id}`);
    await access(projectPath(asset.promptFile));
    if (asset.status === "approved-runtime") {
      assert(asset.editableSource && /\.(aseprite|kra|psd|svg)$/.test(asset.editableSource), `editable original missing: ${asset.id}`);
      const sourceFile = projectPath(asset.editableSource);
      await access(sourceFile);
      if (asset.editableSource.endsWith(".svg")) validateSvgSource(await readFile(sourceFile, "utf8"), asset.editableParts);
      assert(asset.reviewFile, `review record missing: ${asset.id}`);
      await access(projectPath(asset.reviewFile));
    } else assert(asset.status === "candidate", `invalid environment status: ${asset.id}`);
  } else assert(asset.role === "reference", `invalid art role: ${asset.id}`);
  const bounds = info.alphaBounds ? `, visible ${info.alphaBounds.left},${info.alphaBounds.top}..${info.alphaBounds.right},${info.alphaBounds.bottom}` : "";
  console.log(`${asset.id}: ${info.width}x${info.height}, alpha ${info.minAlpha}..${info.maxAlpha}${bounds}, SHA OK`);
}
for (const asset of register.assets.filter((item) => item.referenceId)) assert(ids.has(asset.referenceId), `unknown reference: ${asset.id}`);
for (const [characterId, poses] of grouped) {
  const sizes = new Set(poses.map((pose) => `${pose.width}x${pose.height}`));
  assert(sizes.size === 1, `pose canvas mismatch: ${characterId}`);
  const approved = poses.filter((pose) => pose.status === "approved-runtime");
  if (approved.length) validateApprovedPoseSet(approved.map((asset) => ({ asset, info: poseInfo.get(asset.id) })), characterId);
  const candidates = poses.filter((pose) => pose.status === "candidate");
  const candidateFindings = poseGeometryFindings(candidates.map((asset) => ({ asset, info: poseInfo.get(asset.id) })));
  for (const finding of candidateFindings) console.warn(`Candidate geometry review (${characterId}): ${finding}`);
}
console.log(`Validated ${register.assets.length} art records; candidate status does not imply visual approval.`);
