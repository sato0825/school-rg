import fs from "node:fs";
import path from "node:path";
import console from "node:console";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const dir = import.meta.dirname;
const assets = JSON.parse(fs.readFileSync(path.join(dir, "revision-assets.json"), "utf8"))
  .filter((asset) => asset.state === "preferred-draft");
const effects = {
  "KEN-002": "防御8・1枚ドロー", "KEN-004": "3ダメージを2回", "KEN-009": "防御5・時間+1秒",
  "KEN-011": "毎ターン筋力+1・防御4", "BASE-017": "時間+2秒", "BASE-023": "時間+4秒",
};
if (assets.length !== 6 || assets.some((asset) => !effects[asset.id])) throw new Error("revision catalog mismatch");
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>#343 意味ゲート</title>
<style>*{box-sizing:border-box}body{margin:0;background:#dce8eb;color:#173448;font:12px system-ui,sans-serif}.page{width:1024px;padding:20px}h1{font-size:19px}h2{font-size:14px;margin:18px 0 5px}.row{display:flex;gap:8px}.card{width:150px;height:164px;padding:6px;border:2px solid #4f7389;border-radius:6px;background:#f3f4eb;overflow:hidden}.id{height:22px;font-size:11px;font-weight:700}.art{display:block;width:112px;height:57px;object-fit:cover;margin:0 auto}.effect{border-top:1px solid #9eb8be;margin-top:7px;padding-top:4px;font-size:11px}.thumbs{display:flex;gap:10px}.thumb{width:92px;text-align:center;font-size:10px}.thumb img{display:block;width:48px;height:48px;object-fit:cover;margin:0 auto 3px}.gray img{filter:grayscale(1)}.art-only .id,.art-only .effect{visibility:hidden}.text-only img{visibility:hidden}</style>
<div class="page"><h1>#343 6候補の意味と48px検査</h1><div id="sections"></div></div>
<script>const data=${JSON.stringify(assets.map((asset) => ({ id: asset.id, image: `assets/${path.basename(asset.path)}`, effect: effects[asset.id] })))};
for(const mode of ['normal','art-only','text-only','gray']){const section=document.createElement('section');section.className=mode;section.innerHTML='<h2>'+mode+'</h2><div class="row"></div><div class="thumbs"></div>';for(const item of data){const c=document.createElement('div');c.className='card';c.innerHTML='<div class="id">'+item.id+'</div><img class="art" src="'+item.image+'"><div class="effect">'+item.effect+'</div>';section.querySelector('.row').append(c);const t=document.createElement('div');t.className='thumb';t.innerHTML='<img src="'+item.image+'">'+item.id;section.querySelector('.thumbs').append(t)}document.querySelector('#sections').append(section)}
</script></html>`;
fs.writeFileSync(path.join(dir, "meaning-gate.html"), html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(dir, "meaning-gate.html")).href);
  const loaded = await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    return images.filter((image) => image.naturalWidth).length;
  });
  if (loaded !== 48) throw new Error(`images loaded ${loaded}/48`);
  for (const mode of ["normal", "art-only", "text-only", "gray"]) {
    await page.locator(`section.${mode}`).screenshot({ path: path.join(dir, `meaning-${mode}-1024-v1.png`) });
  }
  console.log("6 preferred drafts × 4 modes × hand/48px: images loaded");
} finally { await browser.close(); }
