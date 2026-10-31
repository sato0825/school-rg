import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pngInfo } from "./art-asset-checks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "docs/art/rigs/music-rig-candidate-v2.json"), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assert = (value, message) => { if (!value) throw new Error(message); };
assert(manifest.status === "candidate" && manifest.characterId === "music-student", "wrong music identity/status");
assert(manifest.canvas.width === 1024 && manifest.canvas.height === 1536, "wrong music canvas");
assert(manifest.groundY >= 1500 && manifest.groundY < 1536, "wrong ground anchor");
assert(manifest.parts.length === 7 && new Set(manifest.parts.map((part) => part.id)).size === 7, "seven independent layers required");
assert(manifest.expressionLayers.length === 1 && manifest.expressionLayers[0].id === "head-hit", "hit face required");
assert(sha(await readFile(resolve(root, manifest.sourceSheet.file))) === manifest.sourceSheet.sha256, "source sheet changed");
const ora = resolve(root, manifest.editableSource);
assert(execFileSync("unzip", ["-p", ora, "mimetype"], { encoding: "utf8" }) === "image/openraster", "invalid editable source");
const xml = execFileSync("unzip", ["-p", ora, "stack.xml"], { encoding: "utf8" });
assert(xml.includes('w="1024" h="1536"'), "editable source canvas differs");
for (const part of [...manifest.parts, ...manifest.expressionLayers]) {
  const bytes = await readFile(resolve(root, part.file));
  const info = pngInfo(bytes);
  assert(sha(bytes) === part.sha256, `${part.id}: source hash changed`);
  assert(info.width === part.width && info.height === part.height && info.minAlpha === 0 && info.maxAlpha >= 240, `${part.id}: geometry/alpha invalid`);
  assert(part.x >= 0 && part.y >= 0 && part.x + part.width <= 1024 && part.y + part.height <= 1536, `${part.id}: outside canvas`);
  assert(part.pivotX > 0 && part.pivotX < part.width && part.pivotY > 0 && part.pivotY < part.height, `${part.id}: pivot outside art`);
  assert(execFileSync("unzip", ["-p", ora, `data/${part.id}.png`]).equals(bytes), `${part.id}: ORA pixel differs`);
  assert(xml.includes(`name="${part.id}" src="data/${part.id}.png" x="${part.x}" y="${part.y}"`), `${part.id}: ORA joint differs`);
  if (part.visible === false) assert(xml.includes(`name="${part.id}" src="data/${part.id}.png" x="${part.x}" y="${part.y}" opacity="1.0" visibility="hidden"`), `${part.id}: expression visible in idle source`);
}
console.log(`Validated ${manifest.id}: seven immutable layers, editable OpenRaster source and ground/joint geometry`);
