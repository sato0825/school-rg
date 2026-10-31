import { readFile, writeFile } from "node:fs/promises";
import console from "node:console";
import process from "node:process";

const [seed42Path, seed97Path, outputPath] = process.argv.slice(2);
if (!seed42Path || !seed97Path || !outputPath) throw new Error("Usage: node scripts/build-stage-route-board.mjs <seed42.json> <seed97.json> <output.html>");
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const artId = (background) => background?.match(/\/([^/"()]+)\.png/)?.[1] ?? "missing";
const placeNames = {
  "act1-paper-atrium-candidate-v1": "入口アトリウム", "act1-paper-library-candidate-v2": "図書室", "act1-paper-music-room-candidate-v1": "音楽室", "act1-paper-covered-courtyard-candidate-v1": "屋根付き中庭",
  "act2-paper-science-entry-candidate-v2": "科学棟入口", "act2-paper-physics-candidate-v1": "物理室", "act2-paper-biology-room-candidate-v1": "生物室", "act2-paper-observation-terrace-candidate-v1": "観測テラス",
  "act3-paper-auditorium-plaza-candidate-v1": "講堂前広場", "act3-paper-auditorium-foyer-candidate-v1": "ホワイエ", "act3-paper-backstage-candidate-v1": "舞台裏", "act3-paper-auditorium-stage-candidate-v1": "講堂舞台",
};
const kindNames = { start: "開始", combat: "戦闘", elite: "強敵", event: "イベント", shop: "購買", rest: "休憩", treasure: "宝箱", boss: "ボス" };
const objectNames = { event: "掲示板（仮）", shop: "棚（仮）", rest: "長椅子（仮）", treasure: "保管箱（仮）" };
async function load(path, seed) {
  const trace = JSON.parse(await readFile(path, "utf8"));
  const nodes = trace.observations.filter((item) => item.screen === "node");
  if (trace.seed !== seed || trace.finalScreen !== "result" || trace.runResult !== "won" || trace.errors.length || nodes.length !== 42 || trace.metrics.visits.length !== 42) {
    throw new Error(`incomplete 42-node trace: ${path}`);
  }
  for (let index = 0; index < 42; index++) {
    const node = nodes[index], visit = trace.metrics.visits[index];
    if (node.nodeId !== visit.nodeId || node.act !== visit.act || node.kind !== visit.kind) throw new Error(`trace mismatch at ${seed}:${index}`);
    if (!placeNames[artId(node.background)]) throw new Error(`unknown place image at ${seed}:${index}`);
  }
  return nodes;
}
const left = await load(seed42Path, 42);
const right = await load(seed97Path, 97);
const lines = [];
for (let index = 0; index < 42; index++) {
  const cells = [left[index], right[index]].map((node, column) => {
    const id = artId(node.background);
    const prev = index ? [left, right][column][index - 1] : null;
    const changed = !prev || artId(prev.background) !== id;
    const place = escape(placeNames[id]);
    const obj = objectNames[node.kind] ? `<small class="object">#286 ${escape(objectNames[node.kind])}</small>` : "";
    return `<div class="visit ${changed ? "changed" : "repeated"} band-${Math.floor((node.floor === 0 ? 0 : Math.min(node.floor - 1, 11)) / 3)}" data-art-id="${escape(id)}"><span class="place">${changed ? "↳ " : "· "}${place}</span><span class="kind">${escape(kindNames[node.kind])}</span><code>${escape(node.nodeId)}</code>${obj}</div>`;
  });
  const node = left[index];
  lines.push(`<div class="route-row"><div class="floor ${node.floor === 0 ? "act-start" : ""}"><strong>${node.act}-${node.floor === 0 ? "START" : `${node.floor}F`}</strong></div>${cells.join("")}</div>`);
}
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>#310 42地点×2 seedの舞台反復</title><style>
:root{font-family:system-ui,"Hiragino Kaku Gothic ProN",sans-serif;color:#1d3446;background:#edf2f2}*{box-sizing:border-box}body{margin:0;padding:28px;max-width:1500px;margin-inline:auto}h1{font-size:25px;margin:0 0 8px}p{line-height:1.6;margin:0 0 12px}.summary{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0 24px}.summary b{background:#dce9e9;border:1px solid #9bb7bd;border-radius:8px;padding:9px 13px}.note{font-size:12px;color:#455f6d}.header,.route-row{display:grid;grid-template-columns:104px 1fr 1fr;gap:7px}.header{position:sticky;top:0;z-index:2;background:#edf2f2;padding:8px 0;font-weight:700}.route-row{margin:3px 0}.floor{display:flex;align-items:center;justify-content:center;border-radius:5px;background:#dae5e7;font-size:12px}.floor.act-start{background:#a8c4cf}.visit{display:grid;grid-template-columns:minmax(130px,1fr) 70px 120px;align-items:center;gap:8px;min-height:39px;border:1px solid #a9c2c7;border-left:5px solid #486b84;border-radius:4px;padding:4px 8px;background:#d6e4e7;font-size:12px}.visit.changed{border-top-width:2px}.visit.repeated{opacity:.79}.visit.band-1{background:#e0e9e5;border-left-color:#6f9988}.visit.band-2{background:#e7e4ed;border-left-color:#8a7da4}.visit.band-3{background:#d9e2ee;border-left-color:#617d9e}.place{font-weight:700}.kind{background:#f7faf9;border-radius:4px;padding:4px;text-align:center}.visit code{font-size:10px;white-space:nowrap}.object{grid-column:1/-1;color:#496170;font-size:10px}.legend{margin-top:18px;font-size:12px}@media(max-width:780px){body{padding:12px}.header,.route-row{grid-template-columns:58px 1fr 1fr}.visit{display:block;min-height:62px}.visit span,.visit code{display:block}.visit code{font-size:9px}.floor{font-size:10px}}
</style><main><h1>#310 通常42地点 × seed 42 / 97</h1><p>同じ学校を進む背景の並びを、実際の画面経路で採取した到着順に表示。両方とも文芸部・safe経路、42地点を訪問して勝利。場所の変更は各Actの4・7・10階とAct境界だけで、seedやレーンによる背景差はない。</p><div class="summary"><b>各ラン 42地点</b><b>12場所ブロック</b><b>背景の再使用 30/41遷移</b><b>最長連続 4地点</b><b>差分地点小物 0（#286は別PR候補）</b></div><p class="note">「#286」の小物名は静的な配置案との照合であり、これらのUIトレースに小物アートが表示された証拠ではありません。画像は#29未採用候補。仮時計の自動操作は人間の約60分プレイテストではありません。</p><div class="header"><div>Act / 階</div><div>seed 42</div><div>seed 97</div></div>${lines.join("")}<p class="legend">↳ 背景変更、· 同じ背景。両経路とも階帯で同じ場所に固定され、種類（戦闘・購買など）だけが異なります。</p></main></html>`;
await writeFile(outputPath, html, { flag: "wx" });
console.log(JSON.stringify({ outputPath, routes: 2, visitsPerRoute: 42, sameBackgroundTransitions: 30, changedBackgroundTransitions: 11 }));
