import fs from "node:fs";
import path from "node:path";
import console from "node:console";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../../../..");
const assets = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "assets.json"), "utf8"));
const active = new Map(assets.filter((asset) => asset.state !== "superseded-candidate").map((asset) => [asset.id, asset]));
const old = [
  ["文芸", "LIT-007", "issue314/assets/card-lit-aside-v1.png"],
  ["文芸", "LIT-012", "issue314/assets/card-lit-anthology-v1.png"],
  ["科学", "SCI-008", "issue314/assets/card-sci-assay-v1.png"],
  ["科学", "SCI-010", "issue314/assets/card-sci-culture-v1.png"],
  ["剣道", "KEN-005", "issue338/assets/card-ken-kata-v2.png"],
  ["剣道", "KEN-007", "issue314/assets/card-ken-sweep-v1.png"],
  ["軽音", "MUS-007", "issue314/assets/card-mus-bridge-v1.png"],
  ["軽音", "MUS-009", "issue338/assets/card-mus-pickup-v1.png"],
  ["美術", "ART-009", "issue314/assets/card-art-primer-v1.png"],
  ["美術", "ART-010", "issue338/assets/card-art-palette-v1.png"],
];
const newer = [
  ["文芸", "LIT-008"], ["文芸", "LIT-011"], ["科学", "SCI-012"],
  ["剣道", "KEN-010"], ["剣道", "KEN-012"], ["軽音", "MUS-011"],
  ["軽音", "MUS-012"], ["美術", "ART-011"],
];
const rows = [...old.map(([club, id, file]) => ({ club, id, image: pathToFileURL(path.join(root, "docs/art/production", file)).href, new: false })),
  ...newer.map(([club, id]) => ({ club, id, image: pathToFileURL(path.join(root, active.get(id).path)).href, new: true }))];
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>#377 画風並置</title>
<style>*{box-sizing:border-box}body{margin:0;background:#dce8eb;color:#18364a;font:12px system-ui}.sheet{width:var(--w);padding:12px}.club{display:flex;align-items:center;gap:7px;margin:9px 0}.club b{width:40px}.card{width:var(--cw);height:var(--ch);padding:5px;background:#f5f5ee;border:2px solid #537487;border-radius:7px}.card.new{border-color:#b66e63}.card label{display:block;height:19px;font-weight:700}.card img{display:block;width:var(--aw);height:var(--ah);object-fit:cover}.card small{display:block;margin-top:3px}.thumb{width:48px;height:48px;object-fit:cover}.gray img{filter:grayscale(1)}</style>
<div class="sheet"><h2>既存76候補との同部活並置 / 新規は珊瑚枠・候補未採用</h2><div id="clubs"></div></div>
<script>const rows=${JSON.stringify(rows)};for(const club of [...new Set(rows.map(x=>x.club))]){const line=document.createElement('div');line.className='club';line.innerHTML='<b>'+club+'</b>';for(const x of rows.filter(x=>x.club===club)){const card=document.createElement('div');card.className='card'+(x.new?' new':'');card.innerHTML='<label>'+x.id+'</label><img src="'+x.image+'"><small>'+(x.new?'新候補':'既存候補')+'</small>';line.append(card);const thumb=document.createElement('img');thumb.className='thumb';thumb.src=x.image;line.append(thumb)}document.querySelector('#clubs').append(line)}</script></html>`;
fs.writeFileSync(path.join(import.meta.dirname, "style-board.html"), html);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1024, 1440]) for (const display of ["hand", "reward"]) {
    const page = await browser.newPage({ viewport: { width, height: 1050 } });
    await page.goto(pathToFileURL(path.join(import.meta.dirname, "style-board.html")).href);
    const result = await page.locator(".sheet").evaluate(async (board, { width, display }) => {
      const css = globalThis.document.documentElement.style;
      css.setProperty("--w", `${width}px`);
      css.setProperty("--cw", display === "hand" ? width === 1024 ? "140px" : "170px" : width === 1024 ? "165px" : "220px");
      css.setProperty("--ch", display === "hand" ? "110px" : "145px");
      css.setProperty("--aw", display === "hand" ? width === 1024 ? "112px" : "145px" : width === 1024 ? "135px" : "190px");
      css.setProperty("--ah", display === "hand" ? "57px" : width === 1024 ? "91px" : "100px");
      const images = [...board.querySelectorAll("img")];
      await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
      return { loaded: images.filter((img) => img.naturalWidth).length, width: board.scrollWidth };
    }, { width, display });
    if (result.loaded !== 36 || result.width > width) throw new Error(JSON.stringify({ width, display, result }));
    await page.locator(".sheet").screenshot({ path: path.join(import.meta.dirname, `style-${display}-${width}.png`) });
    console.log(`style ${display} ${width}: ${result.loaded} images loaded`);
    await page.close();
  }
} finally { await browser.close(); }
