import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import console from "node:console";
import { inflateRawSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pngInfo } from "./art-asset-checks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "docs/art/rigs/science-rig-candidate-v4.json"), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

/** Read named ZIP entries without platform-specific `unzip` or an extra runtime dependency. */
function zipEntries(bytes) {
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65_557); at--) {
    if (bytes.readUInt32LE(at) === 0x06054b50) { eocd = at; break; }
  }
  assert(eocd >= 0, "OpenRaster ZIP directory missing");
  const count = bytes.readUInt16LE(eocd + 10);
  let at = bytes.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let index = 0; index < count; index++) {
    assert(bytes.readUInt32LE(at) === 0x02014b50, "OpenRaster ZIP central entry invalid");
    const method = bytes.readUInt16LE(at + 10);
    const compressedLength = bytes.readUInt32LE(at + 20);
    const originalLength = bytes.readUInt32LE(at + 24);
    const nameLength = bytes.readUInt16LE(at + 28);
    const extraLength = bytes.readUInt16LE(at + 30);
    const commentLength = bytes.readUInt16LE(at + 32);
    const localAt = bytes.readUInt32LE(at + 42);
    const name = bytes.toString("utf8", at + 46, at + 46 + nameLength);
    assert(bytes.readUInt32LE(localAt) === 0x04034b50, `bad local entry: ${name}`);
    const dataAt = localAt + 30 + bytes.readUInt16LE(localAt + 26) + bytes.readUInt16LE(localAt + 28);
    const compressed = bytes.subarray(dataAt, dataAt + compressedLength);
    const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    assert(content?.length === originalLength, `bad entry length or compression: ${name}`);
    assert(!entries.has(name), `duplicate OpenRaster entry: ${name}`);
    entries.set(name, content);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

assert(manifest.status === "candidate" && manifest.characterId === "science-student", "wrong rig identity/status");
assert(manifest.canvas.width === 1024 && manifest.canvas.height === 1536, "wrong rig canvas");
assert(manifest.groundY > 0 && manifest.groundY < manifest.canvas.height, "bad ground anchor");
const source = await readFile(resolve(root, manifest.sourceSheet.file));
assert(sha(source) === manifest.sourceSheet.sha256, "rig source hash changed");
assert(manifest.parts.length === 5 && new Set(manifest.parts.map((part) => part.id)).size === 5, "five distinct editable body parts required");
const ora = zipEntries(await readFile(resolve(root, manifest.editableSource)));
assert(ora.get("mimetype")?.toString() === "image/openraster", "not an OpenRaster source");
const xml = ora.get("stack.xml")?.toString("utf8") ?? "";
assert(xml.includes(`w="${manifest.canvas.width}" h="${manifest.canvas.height}"`), "ORA canvas mismatch");
assert(manifest.expressionLayers.length === 1 && manifest.expressionLayers[0].id === "head-hit", "hit expression layer required");
for (const part of [...manifest.parts, ...manifest.expressionLayers]) {
  const bytes = await readFile(resolve(root, part.file));
  const info = pngInfo(bytes);
  assert(sha(bytes) === part.sha256, `${part.id} hash changed`);
  assert(info.width === part.width && info.height === part.height && info.minAlpha === 0 && info.maxAlpha >= 240, `${part.id} geometry/alpha invalid`);
  assert(part.x >= 0 && part.y >= 0 && part.x + part.width <= manifest.canvas.width && part.y + part.height <= manifest.canvas.height, `${part.id} outside canvas`);
  assert(part.pivotX > 0 && part.pivotX < part.width && part.pivotY > 0 && part.pivotY < part.height, `${part.id} joint outside layer`);
  assert(ora.get(`data/${part.id}.png`)?.equals(bytes), `${part.id} ORA layer differs from source part`);
  assert(xml.includes(`name="${part.id}" src="data/${part.id}.png" x="${part.x}" y="${part.y}"`), `${part.id} ORA position differs`);
  if (part.id === "head-hit") assert(xml.includes('name="head-hit" src="data/head-hit.png" x="320" y="65" opacity="1.0" visibility="hidden"'), "hit expression must be hidden in idle source");
}
const merged = ora.get("mergedimage.png");
assert(merged?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "ORA merged preview missing");
assert(merged.readUInt32BE(16) === manifest.canvas.width && merged.readUInt32BE(20) === manifest.canvas.height, "ORA preview canvas mismatch");
console.log(`Validated ${manifest.id}: five body and one expression ORA layers, immutable source hashes and joint/canvas geometry`);
