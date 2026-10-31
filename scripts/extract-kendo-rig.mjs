import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The generated sheet is a candidate, not an adopted character source. These
// six non-touching alpha components were inspected at a 10% threshold.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/art/candidates/kendo-rig-parts-sheet-candidate-v1.png");
const outputDir = resolve(root, "docs/art/candidates/kendo-rig-parts-v1");
const sourceHash = "2576197b7cddb6ba2aa52bebdb0b0a7e83eab18ab51657d43d4add14e72cba69";
const parts = [
  { name: "head", component: 1, crop: "514x422+187+8", width: 514, height: 422 },
  { name: "torso", component: 18, crop: "416x598+301+363", width: 416, height: 598 },
  { name: "left-arm", component: 19, crop: "211x326+50+419", width: 211, height: 326 },
  { name: "right-arm-shinai", component: 3, crop: "296x746+700+33", width: 296, height: 746 },
  { name: "left-leg", component: 20, crop: "261x618+83+896", width: 261, height: 618 },
  { name: "right-leg", component: 21, crop: "294x620+681+898", width: 294, height: 620 },
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== sourceHash) throw new Error("Kendo rig sheet SHA mismatch");
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
