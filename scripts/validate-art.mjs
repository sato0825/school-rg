import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import console from "node:console";
import { readFile, access } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const register = JSON.parse(await readFile(resolve(root, "docs/art/asset-register.json"), "utf8"));

function assert(condition, message) { if (!condition) throw new Error(message); }
function projectPath(path) {
  assert(typeof path === "string" && path.length > 0, "asset path is required");
  const full = resolve(root, path);
  assert(!relative(root, full).startsWith("..") && full !== root, `path escapes project: ${path}`);
  return full;
}

function pngInfo(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "not a PNG");
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = -1;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    assert(offset + 12 + length <= bytes.length, "truncated PNG chunk");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (kind === "IDAT") compressed.push(data);
    offset += 12 + length;
    if (kind === "IEND") break;
  }
  assert(width > 0 && height > 0 && width <= 4096 && height <= 4096, "invalid PNG size");
  assert(bitDepth === 8 && (colorType === 2 || colorType === 6) && interlace === 0, "art checker supports RGB/RGBA 8-bit non-interlaced PNG");
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: (stride + 1) * height });
  assert(pixels.length === (stride + 1) * height, "PNG pixel data length mismatch");
  let previous = Buffer.alloc(stride);
  let minAlpha = 255, maxAlpha = colorType === 6 ? 0 : 255;
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    const filter = pixels[cursor++];
    assert(filter >= 0 && filter <= 4, "unsupported PNG filter");
    const row = Buffer.allocUnsafe(stride);
    for (let index = 0; index < stride; index++) {
      const raw = pixels[cursor++];
      const left = index >= channels ? row[index - channels] : 0;
      const above = previous[index];
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      }
      row[index] = (raw + predictor) & 255;
    }
    if (channels === 4) for (let index = 3; index < stride; index += 4) {
      minAlpha = Math.min(minAlpha, row[index]);
      maxAlpha = Math.max(maxAlpha, row[index]);
    }
    previous = row;
  }
  return { width, height, minAlpha, maxAlpha };
}

assert(register.version === 1 && Array.isArray(register.assets), "invalid art register");
const ids = new Set();
const grouped = new Map();
for (const asset of register.assets) {
  assert(typeof asset.id === "string" && !ids.has(asset.id), `duplicate or invalid asset ID: ${asset.id}`);
  ids.add(asset.id);
  const bytes = await readFile(projectPath(asset.file));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert(hash === asset.sha256, `SHA mismatch: ${asset.id}`);
  const info = pngInfo(bytes);
  assert(info.width === asset.width && info.height === asset.height, `size mismatch: ${asset.id}`);
  if (asset.alpha === "transparent") assert(info.minAlpha === 0 && info.maxAlpha >= 240, `cutout transparency missing: ${asset.id}`);
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
      await access(projectPath(asset.editableSource));
      assert(asset.reviewFile, `review record missing: ${asset.id}`);
      await access(projectPath(asset.reviewFile));
    } else assert(asset.status === "candidate", `invalid pose status: ${asset.id}`);
  } else assert(asset.role === "reference", `invalid art role: ${asset.id}`);
  console.log(`${asset.id}: ${info.width}x${info.height}, alpha ${info.minAlpha}..${info.maxAlpha}, SHA OK`);
}
for (const asset of register.assets.filter((item) => item.referenceId)) assert(ids.has(asset.referenceId), `unknown reference: ${asset.id}`);
for (const [characterId, poses] of grouped) {
  const sizes = new Set(poses.map((pose) => `${pose.width}x${pose.height}`));
  assert(sizes.size === 1, `pose canvas mismatch: ${characterId}`);
  const approved = poses.filter((pose) => pose.status === "approved-runtime");
  if (approved.length) assert(["idle", "activate", "hit"].every((pose) => approved.some((item) => item.pose === pose)), `approved motion states incomplete: ${characterId}`);
}
console.log(`Validated ${register.assets.length} art records; candidate status does not imply visual approval.`);
