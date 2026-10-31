import fs from "node:fs";
import console from "node:console";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../../../..");
const dir = import.meta.dirname;
const catalog = fs.readFileSync(path.join(root, "src/ui/card-art.ts"), "utf8");
const assets = [...catalog.matchAll(/"([A-Z]+-\d+)": candidate\([^\n]+?new URL\("\.\.\/assets\/cards\/([^"]+)"/g)]
  .map((match) => ({ id: match[1], relative: match[2] }));
if (assets.length !== 56 || new Set(assets.map((asset) => asset.id)).size !== 56) throw new Error(`catalog mismatch: ${assets.length}`);

const revisions = JSON.parse(fs.readFileSync(path.join(dir, "revision-assets.json"), "utf8"));
const preferred = new Map(revisions.filter((asset) => asset.version !== "v3" || asset.id !== "KEN-011").map((asset) => [asset.id, asset]));
const groups = ["BASE", "LIT", "SCI", "KEN", "MUS", "ART"];
const cards = assets.map((asset) => ({ ...asset, group: asset.id.split("-")[0], src: preferred.has(asset.id) ? `assets/${path.basename(preferred.get(asset.id).path)}` : `../../../../src/assets/cards/${asset.relative}`,
  label: preferred.has(asset.id) ? path.basename(preferred.get(asset.id).path) : asset.relative.replace(/issue\d+\//, "") }));
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>#343 候補絵画風監査</title>
<style>*{box-sizing:border-box}body{margin:0;background:#dce8eb;color:#183448;font:12px system-ui,sans-serif}.page{width:var(--w);padding:18px}.header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #517081;margin-bottom:12px}h1{font-size:19px;margin:0 0 9px}h2{font-size:15px;margin:13px 0 6px}.note{font-size:11px}.cards{display:grid;grid-template-columns:repeat(var(--cols),var(--cardw));gap:7px}.card{height:var(--cardh);background:#f4f5ee;border:2px solid #57758a;border-radius:7px;padding:5px;box-shadow:0 2px 3px #31485e44;overflow:hidden}.id{font-size:11px;font-weight:700;height:18px}.art{width:var(--artw);height:var(--arth);display:block;margin:0 auto;object-fit:cover;border:1px solid #aec3ca}.meta{font-size:9px;line-height:1.2;overflow-wrap:anywhere;margin-top:2px;color:#4b6470}.group{break-inside:avoid;margin-bottom:9px}</style>
<div class="page"><div class="header"><h1>#343 全56候補の改稿比較</h1><span class="note">未採用候補・共通＋5部活・線/影/紙地/視点/余白</span></div>${groups.map((group) => `<section class="group"><h2>${group}</h2><div class="cards">${cards.filter((card) => card.group === group).map((card) => `<div class="card"><div class="id">${card.id}</div><img class="art" src="${card.src}" alt=""><div class="meta">${card.label}</div></div>`).join("")}</div></section>`).join("")}</div></html>`;
fs.writeFileSync(path.join(dir, "contact-sheet-revised-v3.html"), html);

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1024, 1440]) for (const mode of ["hand", "reward"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(dir, "contact-sheet-revised-v3.html")).href);
    await page.evaluate(({ width, mode }) => {
      const style = globalThis.document.documentElement.style;
      style.setProperty("--w", `${width}px`);
      style.setProperty("--cols", mode === "hand" ? width === 1024 ? "6" : "8" : width === 1024 ? "5" : "7");
      style.setProperty("--cardw", mode === "hand" ? width === 1024 ? "140px" : "170px" : width === 1024 ? "165px" : "190px");
      style.setProperty("--cardh", mode === "hand" ? "160px" : "220px");
      style.setProperty("--artw", mode === "hand" ? width === 1024 ? "112px" : "145px" : width === 1024 ? "135px" : "160px");
      style.setProperty("--arth", mode === "hand" ? "57px" : "91px");
    }, { width, mode });
    const broken = await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      return images.filter((image) => !image.naturalWidth).map((image) => image.src);
    });
    if (broken.length) throw new Error(`broken images: ${broken.join(", ")}`);
    await page.screenshot({ path: path.join(dir, `contact-${mode}-${width}-v3.png`), fullPage: true });
    console.log(`${mode} ${width}: ${assets.length} loaded`);
    await page.close();
  }
} finally {
  await browser.close();
}
