import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const dir = import.meta.dirname;
const rows = [
  ["KEN-001 parry", "../../../../src/assets/cards/issue261/ken-parry-candidate-v2.png", "../../../../src/assets/cards/issue261/ken-parry-candidate-v2.png"],
  ["KEN-002 stance", "../../../../src/assets/cards/issue261/ken-stance-candidate-v1.png", "assets/ken-stance-candidate-v2.png"],
  ["KEN-003 thrust", "../../../../src/assets/cards/issue261/ken-thrust-candidate-v1.png", "../../../../src/assets/cards/issue261/ken-thrust-candidate-v1.png"],
  ["KEN-009 guard step", "../../../../src/assets/cards/issue261/ken-guard-step-candidate-v1.png", "assets/ken-guard-step-candidate-v2.png"],
  ["KEN-011 hasso", "../../../../src/assets/cards/issue261/ken-hasso-candidate-v2.png", "assets/ken-hasso-candidate-v3.png"],
];
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>#343 剣道部比較</title>
<style>*{box-sizing:border-box}body{margin:0;background:#dce8eb;color:#163247;font:12px system-ui,sans-serif}.page{width:var(--w);padding:20px}h1{font-size:20px;margin:0 0 10px}.label{font-weight:700;font-size:14px;margin:15px 0 5px}.row{display:flex;gap:10px}.card{width:var(--cw);height:var(--ch);flex:none;background:#f5f5ec;border:2px solid #53758a;border-radius:8px;padding:5px;box-shadow:0 2px 4px #26425a44}.name{height:22px;font-weight:700}.art{display:block;width:var(--aw);height:var(--ah);object-fit:cover;margin:0 auto;border:1px solid #a7c2cc}.effect{margin:7px 2px;border-top:1px solid #9db5c0;padding-top:4px;font-size:11px}.note{font-size:11px}</style>
<div class="page"><h1>#343 剣道部旧版/改稿版 実寸比較</h1><div class="note">各列で parry / stance / thrust / guard step / hasso を並置。紙地・線・影・視点・余白と行為の意味を比較する。候補未採用。</div><div class="label">旧版</div><div class="row">${rows.map(([name,old]) => `<div class="card"><div class="name">${name}</div><img class="art" src="${old}"><div class="effect">候補原本</div></div>`).join("")}</div><div class="label">改稿版</div><div class="row">${rows.map(([name,,current]) => `<div class="card"><div class="name">${name}</div><img class="art" src="${current}"><div class="effect">#343候補</div></div>`).join("")}</div></div></html>`;
fs.writeFileSync(path.join(dir, "compare-kendo.html"), html);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1024, 1440]) for (const mode of ["hand", "reward"]) {
    const page = await browser.newPage({ viewport: { width, height: 700 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(dir, "compare-kendo.html")).href);
    await page.evaluate(({ width, mode }) => {
      const css = document.documentElement.style;
      css.setProperty("--w", `${width}px`);
      css.setProperty("--cw", mode === "hand" ? width === 1024 ? "140px" : "170px" : width === 1024 ? "165px" : "220px");
      css.setProperty("--ch", mode === "hand" ? "160px" : width === 1024 ? "220px" : "270px");
      css.setProperty("--aw", mode === "hand" ? width === 1024 ? "112px" : "145px" : width === 1024 ? "135px" : "190px");
      css.setProperty("--ah", mode === "hand" ? "57px" : width === 1024 ? "91px" : "100px");
    }, { width, mode });
    const broken = await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      return images.filter((image) => !image.naturalWidth).map((image) => image.src);
    });
    if (broken.length) throw new Error(`broken images: ${broken.join(", ")}`);
    await page.screenshot({ path: path.join(dir, `compare-kendo-${mode}-${width}-v1.png`), fullPage: true });
    console.log(`${mode} ${width}: 10 images loaded`);
    await page.close();
  }
} finally { await browser.close(); }
