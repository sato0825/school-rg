import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Extracts inspected alpha components; it does not draw or repair the source. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/art/candidates/science-rig-parts-sheet-candidate-v1.png");
const outputDir = resolve(root, "docs/art/candidates/science-rig-parts-v1");
const sourceHash = "5032d0f23e3e9ea57e9775b043d7d4cc78a33870a5a0f044a4e878ebe6f36f23";
const parts = [
  { name: "head", component: 1, crop: "384x334+13+31" },
  { name: "torso", component: 11, crop: "470x477+203+316" },
  { name: "right-arm-pen", component: 2, crop: "181x366+693+83" },
  { name: "left-arm-notebook", component: 15, crop: "287x290+698+478" },
  { name: "left-leg", component: 17, crop: "263x697+158+797" },
  { name: "right-leg", component: 16, crop: "281x706+585+788" },
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== sourceHash) throw new Error("science rig source hash changed");
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
  if (size !== part.crop.split("+")[0]) throw new Error(`wrong size for ${part.name}: ${size}`);
  if (execFileSync("magick", [target, "-format", "%[opaque]", "info:"], { encoding: "utf8" }) !== "False") throw new Error(`alpha lost for ${part.name}`);
  console.log(`${part.name}: ${size} SHA256 ${sha(await readFile(target))}`);
}
