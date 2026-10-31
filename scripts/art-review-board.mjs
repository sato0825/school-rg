import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const poses = ["idle", "activate", "hit"];
const names = {
  "literature-student": "文芸部",
  "serious-student": "科学部",
  "kendo-student": "剣道部",
  "music-student": "軽音部",
  "art-student": "美術部",
};
const poseNames = { idle: "待機", activate: "発動", hit: "被弾" };
const decisionNames = { pending: "未完", approved: "採用", rejected: "不採用" };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function linkedPath(outputFile, projectFile) {
  if (typeof projectFile !== "string" || !projectFile) throw new Error("art path is required");
  const full = resolve(root, projectFile);
  if (!relative(root, full) || relative(root, full).startsWith("..")) throw new Error(`art path escapes project: ${projectFile}`);
  return relative(dirname(outputFile), full).split("\\").join("/");
}

function topReference(asset, byId) {
  const visited = new Set();
  let current = asset;
  while (current?.referenceId) {
    if (visited.has(current.id)) throw new Error(`reference cycle: ${asset.id}`);
    visited.add(current.id);
    current = byId.get(current.referenceId);
    if (!current) throw new Error(`unknown reference: ${asset.id}`);
  }
  return current?.role === "reference" ? current : null;
}

export function renderArtReviewBoard(register, decisions, outputFile = resolve(root, "docs/art/review-board.html")) {
  if (register.version !== 1 || !Array.isArray(register.assets)) throw new Error("invalid art register");
  if (decisions.version !== 1 || !Array.isArray(decisions.reviews)) throw new Error("invalid art review decisions");
  const byId = new Map(register.assets.map((asset) => [asset.id, asset]));
  if (byId.size !== register.assets.length) throw new Error("duplicate art ID");
  const byDecision = new Map(decisions.reviews.map((review) => [review.characterId, review]));
  if (byDecision.size !== decisions.reviews.length) throw new Error("duplicate character review");
  const characters = [...new Set(register.assets.filter((asset) => asset.role === "character-pose").map((asset) => asset.characterId))]
    .sort((left, right) => (Object.keys(names).indexOf(left) + 1 || 999) - (Object.keys(names).indexOf(right) + 1 || 999) || left.localeCompare(right));
  for (const characterId of characters) {
    const review = byDecision.get(characterId);
    if (!review || !decisionNames[review.status] || !review.reviewFile || !review.note) throw new Error(`review record missing: ${characterId}`);
  }
  const cards = (characterId, pose) => {
    const matches = register.assets.filter((asset) => asset.role === "character-pose" && asset.characterId === characterId && asset.pose === pose);
    if (!matches.length) return '<p class="empty">候補なし</p>';
    return matches.map((asset) => `<figure class="asset" data-asset-id="${escapeHtml(asset.id)}"><div class="image-frame"><img src="${escapeHtml(linkedPath(outputFile, asset.file))}" alt="${escapeHtml(`${names[characterId] ?? characterId} ${poseNames[pose]} ${asset.id}`)}" loading="lazy"></div><figcaption><strong>${escapeHtml(asset.id)}</strong><span>${escapeHtml(asset.status === "candidate" ? "比較候補・未採用" : asset.status)}</span><small>${escapeHtml(`${asset.width}×${asset.height} · SHA ${asset.sha256.slice(0, 12)}…`)}</small><small>編集可能原本: ${escapeHtml(asset.editableSource ? "あり" : "なし")}</small></figcaption></figure>`).join("");
  };
  const sections = characters.map((characterId) => {
    const assets = register.assets.filter((asset) => asset.role === "character-pose" && asset.characterId === characterId);
    const reference = topReference(assets[0], byId);
    const review = byDecision.get(characterId);
    const referenceCard = reference ? `<figure class="reference"><div class="image-frame"><img src="${escapeHtml(linkedPath(outputFile, reference.file))}" alt="${escapeHtml(`${names[characterId] ?? characterId}の参照画像 ${reference.id}`)}" loading="lazy"></div><figcaption><strong>${escapeHtml(reference.id)}</strong><span>${escapeHtml(reference.status === "direction-approved" ? "画風・年齢感の方向のみ採用" : "比較用・未採用")}</span></figcaption></figure>` : '<p class="empty">参照画像なし</p>';
    return `<section class="character" id="${escapeHtml(characterId)}"><header><div><p class="eyebrow">CHARACTER REVIEW</p><h2>${escapeHtml(names[characterId] ?? characterId)}</h2></div><div class="decision"><strong>判定: ${decisionNames[review.status]}</strong><a href="${escapeHtml(linkedPath(outputFile, review.reviewFile))}">既存の比較記録 ↗</a><p>${escapeHtml(review.note)}</p></div></header><div class="compare"><div class="column"><h3>基準・参照</h3>${referenceCard}</div>${poses.map((pose) => `<div class="column"><h3>${poseNames[pose]}</h3>${cards(characterId, pose)}</div>`).join("")}</div></section>`;
  }).join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>school-rg アート比較ボード</title><style>
:root{font-family:system-ui,-apple-system,sans-serif;color:#23333a;background:#e7edf0}*{box-sizing:border-box}body{margin:0}header,main{max-width:1600px;margin:auto}body>header{padding:32px 28px 20px}h1{font-size:clamp(24px,3vw,38px);margin:5px 0 12px}p{line-height:1.55}.intro{max-width:72ch}.notice{background:#fff9e8;border:1px solid #d8bc69;border-radius:10px;padding:12px 16px;font-weight:600}.toc{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.toc a,.decision a{color:#115a72}.toc a{display:block;padding:8px 12px;background:#fff;border-radius:8px}main{padding:0 20px 40px}.character{margin:0 0 28px;padding:20px;background:#f8fafb;border:1px solid #c8d4da;border-radius:16px}.character header{display:flex;justify-content:space-between;gap:20px;align-items:start}.character h2{margin:0 0 10px}.eyebrow{font-size:11px;letter-spacing:.13em;font-weight:700;color:#55727e;margin:0 0 4px}.decision{max-width:48ch;font-size:13px}.decision strong{display:block;color:#78551b}.decision p{margin:5px 0 0}.compare{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.column{min-width:0;background:#e4ebee;border-radius:10px;padding:10px}.column h3{margin:2px 4px 10px;font-size:14px}.asset,.reference{margin:0 0 12px;background:white;border:1px solid #c6d2d7;border-radius:8px;overflow:hidden}.image-frame{height:300px;display:flex;align-items:center;justify-content:center;background:linear-gradient(45deg,#d2dce0 25%,transparent 25%,transparent 75%,#d2dce0 75%),linear-gradient(45deg,#d2dce0 25%,#e7edef 25%,#e7edef 75%,#d2dce0 75%);background-position:0 0,10px 10px;background-size:20px 20px}.image-frame img{width:100%;height:100%;object-fit:contain}.asset figcaption,.reference figcaption{padding:10px;display:grid;gap:4px;overflow-wrap:anywhere}.asset strong,.reference strong{font-size:12px}.asset span,.reference span{font-size:12px;color:#795719}.asset small{font-size:11px;color:#52646d}.empty{padding:16px;color:#5f7077}@media(max-width:800px){body>header{padding:20px}.character header{display:block}.compare{grid-template-columns:repeat(4,minmax(220px,1fr));overflow-x:auto}.image-frame{height:260px}}
</style></head><body><header><p class="eyebrow">SCHOOL-RG / ART PRODUCTION</p><h1>キャラクター素材・同条件比較</h1><p class="intro">素材台帳から生成した一覧です。各画像を固定サイズと同じ背景で表示し、版、状態、原本の有無を確認します。見た目の同一性と採否は人が基準画と実画面で判断します。</p><p class="notice">全ポーズは制作候補です。このボードや自動検査の成功は、最終アートの承認を意味しません。</p><nav aria-label="人物別比較"><ul class="toc">${characters.map((id) => `<li><a href="#${escapeHtml(id)}">${escapeHtml(names[id] ?? id)}</a></li>`).join("")}</ul></nav></header><main>${sections}</main></body></html>`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(root, "docs/art/review-board.html");
  const register = JSON.parse(await readFile(resolve(root, "docs/art/asset-register.json"), "utf8"));
  const decisions = JSON.parse(await readFile(resolve(root, "docs/art/review-decisions.json"), "utf8"));
  await writeFile(output, renderArtReviewBoard(register, decisions, output));
  console.log(`Wrote ${relative(root, output)}`);
}
