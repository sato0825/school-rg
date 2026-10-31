import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Source-component extraction only; drawing and repainting are outside this script. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/art/candidates/literature-rig-parts-sheet-candidate-v1.png");
const outputDir = resolve(root, "docs/art/candidates/literature-rig-parts-v1");
const sourceHash = "73b27627b57626c1698dd18051a1d31cd315d898c6ed356f0fa62a235ae971e7";

// Source geometry is 1223×1286. IDs and padded rectangles were inspected from
// 8-connected alpha components at a 10% threshold. The four-pixel outer gutter
// retains the original anti-aliased edge without including another large part.
const parts = [
  { name: "head", component: 1, crop: "459x470+6+1", width: 459, height: 470 },
  { name: "torso", component: 4, crop: "483x594+413+120", width: 483, height: 594 },
  { name: "left-arm-bag", component: 29, crop: "341x581+12+433", width: 341, height: 581 },
  { name: "right-arm-notebook", component: 18, crop: "358x391+865+345", width: 358, height: 391 },
  { name: "left-leg", component: 34, crop: "324x518+302+737", width: 324, height: 518 },
  { name: "right-leg", component: 35, crop: "232x529+770+740", width: 232, height: 529 },
];

function assert(condition, message) { if (!condition) throw new Error(message); }
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
assert(sha(await readFile(source)) === sourceHash, "source rig sheet hash changed");
await mkdir(outputDir, { recursive: true });
for (const part of parts) {
  const target = resolve(outputDir, `${part.name}.png`);
  try { await stat(target); throw new Error(`refusing to overwrite existing part: ${target}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  execFileSync("magick", [
    source,
    "(", source, "-alpha", "extract", "-threshold", "10%",
    `-define`, `connected-components:keep=${part.component}`,
    "-connected-components", "8", "-threshold", "0",
    "-morphology", "Dilate", "Disk:2", "-alpha", "copy", ")",
    "-compose", "DstIn", "-composite", "-crop", part.crop, "+repage", target,
  ]);
  const size = execFileSync("magick", [target, "-format", "%wx%h", "info:"], { encoding: "utf8" });
  assert(size === `${part.width}x${part.height}`, `wrong ${part.name} size: ${size}`);
  const alpha = execFileSync("magick", [target, "-format", "%[opaque]", "info:"], { encoding: "utf8" });
  assert(alpha === "False", `${part.name} lost transparency`);
  console.log(`${part.name}: ${size}, SHA256 ${sha(await readFile(target))}`);
}
