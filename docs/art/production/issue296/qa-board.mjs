import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
for (const width of [1024, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`file://${path.join(base, "qa-board.html")}`);
  await page.waitForFunction(() => [...globalThis.document.querySelectorAll("img")].every((image) => image.complete));
  const state = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    documentWidth: globalThis.document.documentElement.scrollWidth,
    broken: [...globalThis.document.querySelectorAll("img")].filter((image) => image.naturalWidth === 0).map((image) => image.src),
    overflow: [...globalThis.document.querySelectorAll(".card")].filter((card) => card.querySelector(".effect").getBoundingClientRect().bottom > card.getBoundingClientRect().bottom).length,
  }));
  await page.screenshot({ path: path.join(base, `qa-board-${width}-v2.png`), fullPage: true });
  globalThis.console.log(JSON.stringify(state));
  if (state.broken.length || state.documentWidth > width || state.overflow) globalThis.process.exitCode = 1;
  await page.close();
}
await browser.close();
