import { readFileSync, writeFileSync } from "node:fs";
import console from "node:console";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "docs/art/production/derivatives/issue255-manifest.json");
const output = resolve(root, "docs/art/production/derivatives/review-v2.html");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const link = (path) => `../../../../${path}`;
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const byId = Map.groupBy(manifest.records, (record) => `${record.id}:${record.version}`);
const groups = [...byId].map(([key, records]) => {
  const first = records[0];
  const tiles = ["hand", "reward", "detail"].map((name) => {
    const one = records.find((record) => record.profile === `${name}-1x`);
    const two = records.find((record) => record.profile === `${name}-2x`);
    const width = name === "detail" ? 384 : one.width;
    return `<div class="pair"><h3>${name} · display ${width}×${Math.round(one.height * width / one.width)} CSS px</h3><figure><img src="${link(one.path)}" width="${width}" alt="${escape(key)} ${name} 1x"><figcaption>1x ${one.width}×${one.height} · ${(one.bytes / 1024).toFixed(1)} KiB</figcaption></figure><figure><img src="${link(two.path)}" width="${width}" alt="${escape(key)} ${name} 2x"><figcaption>2x ${two.width}×${two.height} · ${(two.bytes / 1024).toFixed(1)} KiB</figcaption></figure></div>`;
  }).join("");
  return `<section><h2>${escape(key)} <small>focus ${first.focus.join(", ")}</small></h2><div class="source"><img src="${link(first.sourcePath)}" width="384" alt="${escape(key)} source PNG"><span>source 1536×1024 · ${(first.sourceBytes / 1024).toFixed(1)} KiB</span></div><div class="tiles">${tiles}</div></section>`;
}).join("");
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Issue #283 候補カード絵・実寸比較</title><style>
:root{font-family:system-ui,sans-serif;background:#f5f4f1;color:#253137}body{margin:0 auto;padding:24px;max-width:1440px}header{border-bottom:2px solid #53656b;margin-bottom:24px}h1{font-size:1.5rem}p{line-height:1.6}section{background:white;border:1px solid #c9d0cf;padding:20px;margin:20px 0}h2{font-size:1.2rem}small{font-size:.8rem;font-weight:normal}.source{display:flex;align-items:start;gap:12px;flex-wrap:wrap}.source img{max-width:100%;height:auto}.source span{font-size:.8rem}.tiles{display:flex;gap:24px;flex-wrap:wrap;margin-top:18px}.pair{background:#e7ebeb;padding:12px;min-width:180px}h3{font-size:.9rem;margin:0 0 8px}figure{margin:8px 0 16px}figure img{height:auto;max-width:100%;display:block;image-rendering:auto;border:1px solid #bac3c3}figcaption{font-size:.75rem;margin-top:4px}body.mono img{filter:grayscale(1)}button{padding:8px 12px}
</style><header><h1>候補カード絵・元PNGと配布用派生画像</h1><p>5 ID / 30出力。1x・2xは同じCSS幅で表示し、画素密度と主題の見え方を比較する。候補段階であり、画風・権利・原本レビューは未完了。</p><button onclick="document.body.classList.toggle('mono')">白黒表示を切り替え</button></header>${groups}</html>\n`;
const existing = (() => { try { return readFileSync(output, "utf8"); } catch { return null; } })();
if (existing !== null && existing !== html) throw new Error(`review output changed: ${relative(root, output)}; create a new version before replacing it`);
if (existing === null) writeFileSync(output, html, { flag: "wx" });
console.log(`${relative(root, output)}: ${byId.size} candidate IDs`);
