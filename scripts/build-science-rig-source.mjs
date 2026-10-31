import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Build a layer-editable OpenRaster source; no pixels are repainted here. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "docs/art/rigs/science-rig-candidate-v1.json"), "utf8"));
const target = resolve(root, manifest.editableSource);
const source = resolve(root, manifest.sourceSheet.file);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== manifest.sourceSheet.sha256) throw new Error("source sheet SHA mismatch");
try { await stat(target); throw new Error(`refusing to overwrite editable source: ${target}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }

const temp = await mkdtemp(resolve(root, "../issue233-ora-"));
await mkdir(resolve(temp, "data"));
await mkdir(dirname(target), { recursive: true });
await writeFile(resolve(temp, "mimetype"), "image/openraster");
const merge = ["-size", `${manifest.canvas.width}x${manifest.canvas.height}`, "xc:none"];
for (const part of [...manifest.parts, ...manifest.expressionLayers]) {
  const sourcePart = resolve(root, part.file);
  if (sha(await readFile(sourcePart)) !== part.sha256) throw new Error(`part SHA mismatch: ${part.id}`);
  await copyFile(sourcePart, resolve(temp, "data", `${part.id}.png`));
  if (part.visible !== false) merge.push("(", sourcePart, ")", "-geometry", `+${part.x}+${part.y}`, "-compose", "Over", "-composite");
}
execFileSync("magick", [...merge, resolve(temp, "mergedimage.png")]);
const layers = [...manifest.parts, ...manifest.expressionLayers].reverse().map((part) =>
  `<layer name="${part.id}" src="data/${part.id}.png" x="${part.x}" y="${part.y}" opacity="1.0" visibility="${part.visible === false ? "hidden" : "visible"}" composite-op="svg:src-over"/>`).join("\n    ");
await writeFile(resolve(temp, "stack.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<image version="0.0.3" w="${manifest.canvas.width}" h="${manifest.canvas.height}" name="${manifest.id}">\n  <stack>\n    ${layers}\n  </stack>\n</image>\n`);
execFileSync("zip", ["-0", "-X", "-q", target, "mimetype"], { cwd: temp });
execFileSync("zip", ["-X", "-q", target, "stack.xml", "mergedimage.png", ...[...manifest.parts, ...manifest.expressionLayers].map((part) => `data/${part.id}.png`)], { cwd: temp });
console.log(`${target}: ${sha(await readFile(target))}`);
console.log(`staging source retained at ${temp}`);
