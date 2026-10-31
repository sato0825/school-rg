import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Extract only the deliberately separated source components; do not repaint pixels. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/art/candidates/art-rig-parts-sheet-candidate-v1.png");
const outputDir = resolve(root, "docs/art/candidates/art-rig-parts-v1");
const sourceHash = "8f5f7083792ad290a271259ffc2309f8664b3983501028c2c4950a09553a680a";
const parts = [
  { name: "head", component: 1, crop: "350x324+0+100" },
  { name: "torso", component: 2, crop: "510x650+294+98" },
  { name: "left-arm-board", component: 3, crop: "215x601+809+155" },
  { name: "right-arm-brush", component: 10, crop: "245x406+18+755" },
  { name: "left-leg", component: 11, crop: "257x640+202+813" },
  { name: "right-leg", component: 12, crop: "183x647+506+821" },
  { name: "head-hit", component: 13, crop: "354x328+666+911" },
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== sourceHash) throw new Error("source sheet changed");
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
  console.log(`${part.name}: ${sha(await readFile(target))}`);
}
