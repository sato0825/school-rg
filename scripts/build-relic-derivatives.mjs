import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "docs/art/production/issue308/sources");
const outputDir = join(root, "src/assets/relics/issue308");
const potionOutputDir = join(root, "src/assets/potions/issue308");
const manifestPath = join(root, "docs/art/production/issue308/runtime-manifest.json");
const ids = [
  "library-bookmark", "lab-glasses", "bamboo-grip", "metronome", "sketchbook",
  "spare-shoes", "attendance-stamp", "hallway-clock", "lunch-coupon",
  "pocket-bandage", "practice-timer",
];
const origins = {
  "library-bookmark": "#242 candidate-v1; style review required",
  "lab-glasses": "#246 v1; style review required",
  "metronome": "#246 v1; style review required",
  "bamboo-grip": "#291 v1",
  "sketchbook": "#291 v1",
  "spare-shoes": "#291 v1",
  "attendance-stamp": "#291 v1",
  "hallway-clock": "#301 v1",
  "lunch-coupon": "#301 v1",
  "pocket-bandage": "#301 v1",
  "practice-timer": "#301 v1",
};
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

mkdirSync(outputDir, { recursive: true });
mkdirSync(potionOutputDir, { recursive: true });
const relics = ids.map((id) => {
  const source = join(sourceDir, `${id}-v1.png`);
  const runtime = join(outputDir, `${id}-v1-256.webp`);
  execFileSync("cwebp", ["-quiet", "-q", "86", "-alpha_q", "100", "-resize", "256", "256", source, "-o", runtime]);
  return {
    id, artId: `relic.${id}`, version: "candidate-v1", adoption: "candidate",
    origin: origins[id],
    source: relative(root, source), sourceSha256: hash(source),
    runtime: relative(root, runtime), runtimeSha256: hash(runtime),
    runtimeProfile: "256x256 WebP q86 alpha100",
  };
});
const potionIds = ["potion-time", "potion-heal", "potion-ink", "potion-guard", "potion-splash", "potion-tea"];
const potions = potionIds.map((id) => {
  const source = join(sourceDir, `${id}-v1.png`);
  const runtime = join(potionOutputDir, `${id}-v1-256.webp`);
  execFileSync("cwebp", ["-quiet", "-q", "86", "-alpha_q", "100", "-resize", "256", "256", source, "-o", runtime]);
  return {
    id, artId: `potion.${id}`, version: "candidate-v1", adoption: "candidate",
    origin: id === "potion-ink" ? "#246 v1; style review required" : "#309 v1",
    source: relative(root, source), sourceSha256: hash(source),
    runtime: relative(root, runtime), runtimeSha256: hash(runtime),
    runtimeProfile: "256x256 WebP q86 alpha100",
  };
});
writeFileSync(manifestPath, `${JSON.stringify({ issue: 308, adoption: "candidate", relics, potions }, null, 2)}\n`);
