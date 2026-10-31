import { createHash } from "node:crypto";
import console from "node:console";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Extract only the deliberately separated source components; do not repaint pixels. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const variants = {
  v1: {
    sha256: "8f5f7083792ad290a271259ffc2309f8664b3983501028c2c4950a09553a680a",
    parts: [
      { name: "head", component: 1, crop: "350x324+0+100" },
      { name: "torso", component: 2, crop: "510x650+294+98" },
      { name: "left-arm-board", component: 3, crop: "215x601+809+155" },
      { name: "right-arm-brush", component: 10, crop: "245x406+18+755" },
      { name: "left-leg", component: 11, crop: "257x640+202+813" },
      { name: "right-leg", component: 12, crop: "183x647+506+821" },
      { name: "head-hit", component: 13, crop: "354x328+666+911" },
    ],
  },
  v2: {
    sha256: "415980bfc7878998588b202b93351a09de3c992d91046b2bc9dbddde10ad8a8a",
    parts: [
      { name: "head", component: 2, crop: "353x325+0+99" },
      { name: "torso", component: 1, crop: "510x652+296+96" },
      { name: "left-arm-board", component: 3, crop: "215x602+809+154" },
      { name: "right-arm-brush", component: 10, crop: "248x407+17+754" },
      { name: "left-leg", component: 11, crop: "258x644+202+810" },
      { name: "right-leg", component: 12, crop: "184x653+506+816" },
      { name: "head-hit", component: 13, crop: "355x330+666+910" },
    ],
  },
};
const version = process.argv[2] ?? "v2";
const variant = variants[version];
if (!variant) throw new Error(`unknown rig source version: ${version}`);
const source = resolve(root, `docs/art/candidates/art-rig-parts-sheet-candidate-${version}.png`);
const outputDir = resolve(root, `docs/art/candidates/art-rig-parts-${version}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (sha(await readFile(source)) !== variant.sha256) throw new Error("source sheet changed");
await mkdir(outputDir, { recursive: true });
for (const part of variant.parts) {
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
