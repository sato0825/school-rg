import fs from "node:fs";
import path from "node:path";
import console from "node:console";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const dir = import.meta.dirname;
const originals = ["assets-a.json", "assets-b.json", "revision-assets.json"]
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
const byId = new Map(originals.filter((asset) => asset.state !== "superseded-candidate").map((asset) => [asset.id, asset]));
const data = [
  ["BASE-019", "barrier", "毎ターン防御3"], ["BASE-020", "focus", "毎ターン筋力+1"],
  ["BASE-021", "sacrifice", "HP3を払い2枚ドロー"], ["BASE-022", "finish", "敵HP半分以下で16ダメージ、通常8"],
  ["BASE-024", "shield break", "敵の防御をすべて除く"], ["LIT-010", "bookmark", "捨て札1枚回収・時間+0.5秒"],
  ["SCI-011", "test tube", "毒の敵に14、通常7・毒2"], ["KEN-005", "kata", "防御5・反撃4"],
  ["MUS-009", "pickup", "2枚ドロー・時間+2秒"], ["ART-010", "palette", "手札1枚複製・時間+0.5秒"],
].map(([id, name, effect]) => ({ id, name, effect, image: `assets/${path.basename(byId.get(id)?.path ?? "")}` }));
if (data.length !== 10 || data.some((card) => !byId.has(card.id))) throw new Error("asset list mismatch");
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>#338 意味QA</title>
<style>*{box-sizing:border-box}body{margin:0;background:#dce8eb;color:#18364a;font:12px system-ui,sans-serif}.page{width:var(--w);padding:18px}h1{font-size:19px;margin:0 0 8px}h2{font-size:14px;margin:15px 0 6px}.row{display:flex;gap:7px;margin-bottom:7px}.card{width:var(--cw);height:var(--ch);flex:none;background:#f5f5ee;border:2px solid #537487;border-radius:8px;padding:5px;overflow:hidden}.name{height:23px;font-weight:700;font-size:12px;white-space:nowrap}.art{width:var(--aw);height:var(--ah);display:block;object-fit:cover;margin:0 auto}.effect{border-top:1px solid #a7bac1;margin-top:5px;padding-top:4px;font-size:11px;line-height:1.2}.id{font-size:9px;margin-top:3px}.thumbs{display:flex;gap:12px}.thumb{width:68px;text-align:center;font-size:9px}.thumb img{width:48px;height:48px;display:block;object-fit:cover;margin:0 auto 2px}.art-only .name,.art-only .effect,.art-only .id{visibility:hidden}.text-only img{visibility:hidden}.gray img{filter:grayscale(1)}.note{font-size:10px}</style>
<div class="page"><h1>#338 第7波10枚の実寸意味QA</h1><div class="note">2D紙地ガッシュの線・影・彩度・視点・余白と、行為/効果の意味分担。候補未採用。</div><div id="rows"></div></div>
<script>const data=${JSON.stringify(data)};for(const mode of ['normal','art-only','text-only','gray']){const s=document.createElement('section');s.className=mode;s.innerHTML='<h2>'+mode+'</h2><div class="row"></div><div class="row"></div><div class="thumbs"></div>';data.forEach((x,i)=>{const c=document.createElement('div');c.className='card';c.innerHTML='<div class="name">'+x.name+'</div><img class="art" src="'+x.image+'"><div class="effect">'+x.effect+'</div><div class="id">'+x.id+'</div>';s.querySelectorAll('.row')[Math.floor(i/5)].append(c);const t=document.createElement('div');t.className='thumb';t.innerHTML='<img src="'+x.image+'">'+x.id;s.querySelector('.thumbs').append(t)});document.querySelector('#rows').append(s)}</script></html>`;
fs.writeFileSync(path.join(dir, "qa-board-v3.html"), html);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1024, 1440]) for (const display of ["hand", "reward"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(dir, "qa-board-v3.html")).href);
    await page.evaluate(({ width, display }) => {
      const css = globalThis.document.documentElement.style;
      css.setProperty("--w", `${width}px`);
      css.setProperty("--cw", display === "hand" ? width === 1024 ? "140px" : "170px" : width === 1024 ? "165px" : "220px");
      css.setProperty("--ch", display === "hand" ? "160px" : width === 1024 ? "220px" : "270px");
      css.setProperty("--aw", display === "hand" ? width === 1024 ? "112px" : "145px" : width === 1024 ? "135px" : "190px");
      css.setProperty("--ah", display === "hand" ? "57px" : width === 1024 ? "91px" : "100px");
    }, { width, display });
    const result = await page.locator(".page").evaluate(async (board) => {
      const images = [...board.querySelectorAll("img")];
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      const effects = [...board.querySelectorAll(".card")].map((card) => card.querySelector(".effect").getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom);
      return { loaded: images.filter((image) => image.naturalWidth).length, width: board.scrollWidth, effectsInside: effects.every(Boolean) };
    });
    if (result.loaded !== 80 || result.width > width || !result.effectsInside) throw new Error(JSON.stringify({ width, display, result }));
    for (const mode of ["normal", "art-only", "text-only", "gray"]) {
      await page.locator(`section.${mode}`).screenshot({ path: path.join(dir, `qa-${display}-${width}-${mode}-v3.png`) });
    }
    console.log(`${display} ${width}: 80 images loaded; effects inside`);
    await page.close();
  }
} finally { await browser.close(); }
