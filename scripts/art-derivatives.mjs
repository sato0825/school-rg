import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import console from "node:console";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PROFILES = Object.freeze({
  "hand-1x": [160, 72], "hand-2x": [320, 144],
  "reward-1x": [256, 96], "reward-2x": [512, 192],
  "detail-1x": [768, 512], "detail-2x": [1536, 1024],
});
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function projectPath(path) {
  assert(typeof path === "string" && path.length > 0, "project path required");
  const full = resolve(root, path);
  const rel = relative(root, full);
  assert(rel && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`), `path escapes repository: ${path}`);
  return full;
}

export function cropFor(sourceWidth, sourceHeight, targetWidth, targetHeight, focusX, focusY) {
  assert([sourceWidth, sourceHeight, targetWidth, targetHeight].every((n) => Number.isInteger(n) && n > 0), "invalid image dimensions");
  assert([focusX, focusY].every((n) => typeof n === "number" && n >= 0 && n <= 1), "focus must be normalized 0..1");
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const resizedWidth = Math.ceil(sourceWidth * scale);
  const resizedHeight = Math.ceil(sourceHeight * scale);
  const x = Math.max(0, Math.min(resizedWidth - targetWidth, Math.round(focusX * resizedWidth - targetWidth / 2)));
  const y = Math.max(0, Math.min(resizedHeight - targetHeight, Math.round(focusY * resizedHeight - targetHeight / 2)));
  return { resizedWidth, resizedHeight, x, y, width: targetWidth, height: targetHeight,
    sourceCrop: { x: Math.round(x / scale), y: Math.round(y / scale), width: Math.round(targetWidth / scale), height: Math.round(targetHeight / scale) } };
}

function magick(args, input) {
  const run = spawnSync("magick", args, { encoding: null, input, maxBuffer: 30 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`ImageMagick failed: ${run.stderr.toString("utf8")}`);
  return run.stdout;
}

function readAssetManifests(config) {
  const all = config.assetManifests.flatMap((path) => JSON.parse(readFileSync(projectPath(path), "utf8")));
  const byKey = new Map();
  for (const asset of all) {
    const key = `${asset.id}:${asset.version}`;
    assert(!byKey.has(key), `duplicate source version: ${key}`);
    byKey.set(key, asset);
  }
  return byKey;
}

function transform(sourcePath, crop) {
  return magick([sourcePath, "-colorspace", "sRGB", "-filter", "Lanczos",
    "-resize", `${crop.resizedWidth}x${crop.resizedHeight}!`,
    "-crop", `${crop.width}x${crop.height}+${crop.x}+${crop.y}`, "+repage",
    "-strip", "-define", "webp:method=5", "-quality", "82", "webp:-"]);
}

function ensureBytes(path, bytes, mode) {
  if (mode === "build") {
    if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes, { flag: "wx" }); return; }
  }
  assert(existsSync(path), `derivative missing: ${relative(root, path)}`);
  assert(readFileSync(path).equals(bytes), `derivative changed or encoder version differs: ${relative(root, path)}`);
}

export function buildDerivatives(config, mode = "build") {
  assert(mode === "build" || mode === "verify", "mode must be build or verify");
  assert(config.schemaVersion === 1 && typeof config.setId === "string" && Array.isArray(config.assetManifests) && Array.isArray(config.selections), "invalid derivative config");
  assert(config.selections.length && new Set(config.selections.map((s) => `${s.id}:${s.version}`)).size === config.selections.length, "duplicate or empty selections");
  const version = magick(["-version"]).toString("utf8").split("\n")[0];
  const sources = readAssetManifests(config);
  const records = [];
  for (const selection of config.selections) {
    const source = sources.get(`${selection.id}:${selection.version}`);
    assert(source, `source not in manifest: ${selection.id}:${selection.version}`);
    assert(source.state === "draft-candidate", `source is not current candidate: ${selection.id}:${selection.version}`);
    assert(source.editableSource === null && source.visualReview === "pending" && source.rightsReview === "pending", `candidate review state changed: ${selection.id}:${selection.version}`);
    const sourcePath = projectPath(source.path);
    const sourceBytes = readFileSync(sourcePath);
    assert(hash(sourceBytes) === source.sha256, `source SHA mismatch: ${selection.id}:${selection.version}`);
    const identify = magick(["identify", "-format", "%m %w %h", sourcePath]).toString("utf8").split(" ");
    assert(identify[0] === "PNG" && +identify[1] === source.dimensions[0] && +identify[2] === source.dimensions[1], `source dimensions/format mismatch: ${selection.id}:${selection.version}`);
    for (const [profile, [width, height]] of Object.entries(PROFILES)) {
      const crop = cropFor(source.dimensions[0], source.dimensions[1], width, height, selection.focusX, selection.focusY);
      const bytes = transform(sourcePath, crop);
      const encoded = magick(["identify", "-format", "%m %w %h", "webp:-"], bytes).toString("utf8").split(" ");
      assert(encoded[0] === "WEBP" && +encoded[1] === width && +encoded[2] === height, `derivative dimensions/format mismatch: ${selection.id}:${profile}`);
      const outputPath = `${config.outputRoot}/${selection.id}-${selection.version}-${profile}.webp`;
      ensureBytes(projectPath(outputPath), bytes, mode);
      records.push({ id: selection.id, version: selection.version, profile, path: outputPath,
        width, height, bytes: bytes.length, sha256: hash(bytes), sourcePath: source.path,
        sourceSha256: source.sha256, sourceBytes: sourceBytes.length, sourceState: source.state,
        editableSource: source.editableSource, rightsReview: source.rightsReview, visualReview: source.visualReview,
        focus: [selection.focusX, selection.focusY], crop });
    }
  }
  const manifest = { schemaVersion: 1, setId: config.setId, toolVersion: version, codec: "WebP quality 82; ImageMagick method 5; Lanczos",
    profiles: PROFILES, records };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  ensureBytes(projectPath(config.outputManifest), manifestBytes, mode);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "verify";
  const configPath = process.argv[3] ?? "docs/art/production/derivatives/issue255-config.json";
  const manifest = buildDerivatives(JSON.parse(readFileSync(projectPath(configPath), "utf8")), mode);
  const totals = manifest.records.reduce((sum, item) => sum + item.bytes, 0);
  console.log(`${mode}: ${manifest.records.length} derivatives, ${(totals / 1024).toFixed(1)} KiB; ${manifest.toolVersion}`);
}
