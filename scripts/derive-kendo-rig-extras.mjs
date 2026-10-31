import { createHash } from "node:crypto";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Mechanical derivatives only. The two generated originals remain versioned.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tasks = [
  {
    source: "docs/art/candidates/kendo-shinai-bag-generated-candidate-v1.png",
    sourceHash: "20c992108b3335a7543637a4d9fe49304ce34431e75bb313a7c4ca65db63fb2a",
    target: "docs/art/candidates/kendo-rig-parts-v1/shinai-bag.png",
    args: ["-resize", "450x675!"], size: "450x675",
  },
  {
    source: "docs/art/candidates/kendo-head-hit-generated-candidate-v1.png",
    sourceHash: "914633c0292192ac4ea34da172a535aed4b808cc995d52d262de4a0868cf2f7a",
    target: "docs/art/candidates/kendo-rig-parts-v1/head-hit.png",
    args: ["-crop", "1382x1120+2+9", "+repage", "-resize", "514x422!"], size: "514x422",
  },
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const task of tasks) {
  const source = resolve(root, task.source);
  const target = resolve(root, task.target);
  if (sha(await readFile(source)) !== task.sourceHash) throw new Error(`${task.source} SHA mismatch`);
  try { await stat(target); throw new Error(`refusing to overwrite ${target}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  execFileSync("magick", [source, ...task.args, target]);
  const size = execFileSync("magick", [target, "-format", "%wx%h", "info:"], { encoding: "utf8" });
  if (size !== task.size) throw new Error(`${task.target} wrong size ${size}`);
  console.log(`${task.target}: ${size} SHA256 ${sha(await readFile(target))}`);
}
