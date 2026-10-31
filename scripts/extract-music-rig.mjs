import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Cut non-contact alpha components from the preserved imagegen source. No pixel repainting. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/art/candidates/music-rig-parts-sheet-candidate-v2.png");
const outputDir = resolve(root, "docs/art/candidates/music-rig-parts-v1");
const sourceHash = "3c35b9d19ebf8cc5c2061fcc9fa01f62644861f8d09864e55dcd58fef79154d3";
const parts = [
  { name: "case", component: 3, crop: "313x783+0+35", width: 313, height: 783 },
  { name: "head", component: 1, crop: "381x348+406+5", width: 381, height: 348 },
  { name: "torso", component: 17, crop: "449x598+362+353", width: 449, height: 598 },
  { name: "left-arm", component: 19, crop: "210x326+221+416", width: 210, height: 326 },
  { name: "right-arm", component: 18, crop: "211x370+806+413", width: 211, height: 370 },
  { name: "left-leg", component: 20, crop: "296x628+40+846", width: 296, height: 628 },
  { name: "right-leg", component: 21, crop: "225x614+771+907", width: 225, height: 614 },
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== sourceHash) throw new Error("music source SHA mismatch");
await mkdir(outputDir, { recursive: true });
for (const part of parts) {
  const target = resolve(outputDir, `${part.name}.png`);
  try { await stat(target); throw new Error(`refusing to overwrite ${target}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  execFileSync("magick", [
    source,
    "(", source, "-alpha", "extract", "-threshold", "10%",
    "-define", `connected-components:keep=${part.component}`,
    "-connected-components", "8", "-threshold", "0",
    "-morphology", "Dilate", "Disk:2", "-alpha", "copy", ")",
    "-compose", "DstIn", "-composite", "-crop", part.crop, "+repage", target,
  ]);
  const size = execFileSync("magick", [target, "-format", "%wx%h", "info:"], { encoding: "utf8" });
  if (size !== `${part.width}x${part.height}`) throw new Error(`wrong ${part.name} size: ${size}`);
  console.log(`${part.name}: ${size}, SHA256 ${sha(await readFile(target))}`);
}
