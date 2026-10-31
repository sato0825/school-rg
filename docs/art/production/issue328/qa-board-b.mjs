import fs from "node:fs";
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
async function writeOnce(page, name) { const destination = path.join(base, name); if (!fs.existsSync(destination)) fs.writeFileSync(destination, await page.screenshot({ fullPage: true })); }
for (const width of [1024, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto(`file://${path.join(base, "qa-board-b.html")}`);
  await page.waitForFunction(() => [...globalThis.document.querySelectorAll("img")].every((image) => image.complete));
  const state = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    documentWidth: globalThis.document.documentElement.scrollWidth,
    broken: [...globalThis.document.querySelectorAll("img")].filter((image) => image.naturalWidth === 0).map((image) => image.src),
    cards: [...globalThis.document.querySelectorAll(".card")].map((card) => {
      const img = card.querySelector("img");
      const effect = card.querySelector(".effect");
      return {
        id: card.querySelector(".id")?.textContent,
        cardSize: [card.clientWidth, card.clientHeight],
        artSize: [img?.clientWidth, img?.clientHeight],
        effectInside: Boolean(effect && effect.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom),
      };
    }),
  }));
  await writeOnce(page, `qa-board-b-${width}-v2.png`);
  await page.locator("body").evaluate((body) => body.classList.add("art-only"));
  await writeOnce(page, `qa-art-only-b-${width}-v2.png`);
  await page.locator("body").evaluate((body) => { body.classList.remove("art-only"); body.classList.add("text-only"); });
  await writeOnce(page, `qa-text-only-b-${width}-v2.png`);
  await page.locator("body").evaluate((body) => { body.classList.remove("text-only"); body.classList.add("gray"); });
  await writeOnce(page, `qa-gray-b-${width}-v2.png`);
  globalThis.console.log(JSON.stringify(state));
  if (state.broken.length || state.documentWidth > width || state.cards.some((card) => !card.effectInside)) globalThis.process.exitCode = 1;
  await page.close();
}
await browser.close();
