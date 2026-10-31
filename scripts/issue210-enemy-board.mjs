import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/art/previews/issue210-enemy-comparison.html");
const register = JSON.parse(await readFile(resolve(root, "docs/art/asset-register.json"), "utf8"));
const byId = new Map(register.assets.map((asset) => [asset.id, asset]));
const groups = [
  { act: 1, assets: ["paper-heap-candidate-v1", "hall-monitor-candidate-v1", "hall-mop-candidate-v1", "hall-mop-candidate-v2", "folded-school-map-candidate-v1"] },
  { act: 2, assets: ["lab-magnet-candidate-v1", "library-index-candidate-v1", "beaker-mist-candidate-v1", "lab-coil-candidate-v1"] },
  { act: 3, assets: ["closing-bell-candidate-v1", "night-locker-candidate-v1", "stage-spotlight-candidate-v1", "archive-clock-candidate-v1"] },
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

function assetCard(id, index) {
  const asset = byId.get(id);
  if (!asset || asset.role !== "enemy-portrait") throw new Error(`missing enemy portrait: ${id}`);
  if (asset.status !== "candidate") throw new Error(`unexpected art status: ${id}`);
  const path = relative(dirname(output), resolve(root, asset.file)).split("\\").join("/");
  if (path.startsWith("../") === false) throw new Error(`unexpected image path: ${path}`);
  return `<figure class="asset"><div class="frame"><img src="${escapeHtml(path)}" alt="${escapeHtml(asset.enemyId)} の制作候補" loading="lazy"></div><figcaption><strong>${index < 2 ? "既存" : "追加"} · ${escapeHtml(asset.enemyId)}</strong><span>${escapeHtml(`${asset.width}×${asset.height} · SHA ${asset.sha256.slice(0, 12)}…`)}</span><small>${escapeHtml(asset.status)} · 編集可能原本 ${asset.editableSource ? "あり" : "なし"}</small></figcaption></figure>`;
}

const sections = groups.map(({ act, assets }) => `<section><h2>Act ${act}</h2><div class="grid">${assets.map(assetCard).join("")}</div></section>`).join("\n");
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Issue 210 敵候補比較</title><style>
:root{font-family:system-ui,-apple-system,sans-serif;background:#dce7ea;color:#203a4a}*{box-sizing:border-box}body{margin:0;padding:20px}header,main{max-width:1500px;margin:auto}h1{font-size:30px;margin:4px 0 10px}header p{max-width:72ch;line-height:1.5}.notice{background:#fff9e6;border-left:4px solid #bd8953;padding:10px 14px}section{margin:24px 0}h2{font-size:21px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.asset{min-width:0;margin:0;background:#f8fbfb;border:1px solid #b8cbd0;border-radius:9px;overflow:hidden}.frame{height:330px;display:flex;align-items:center;justify-content:center;background:linear-gradient(45deg,#d7e2e5 25%,transparent 25%,transparent 75%,#d7e2e5 75%),linear-gradient(45deg,#d7e2e5 25%,#edf3f4 25%,#edf3f4 75%,#d7e2e5 75%);background-position:0 0,10px 10px;background-size:20px 20px}.frame img{width:95%;height:95%;object-fit:contain}.asset figcaption{display:grid;gap:4px;padding:10px;overflow-wrap:anywhere}.asset strong{font-size:13px}.asset span,.asset small{font-size:11px;color:#526b77}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.frame{height:260px}}@media(max-width:500px){body{padding:10px}.frame{height:200px}}
</style></head><body><header><p>ISSUE #210 / SCHOOL-RG</p><h1>通常敵の輪郭・画風比較</h1><p>各Actの既存2体と追加2体を同じ枠で並べる。遠目の輪郭、線、色、透過の縁を確認する。</p><p class="notice">すべて制作候補です。自動検査とこの比較画面は最終アートの採用を意味しません。</p></header><main>${sections}</main></body></html>`;
await writeFile(output, html);
