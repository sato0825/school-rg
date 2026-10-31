import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(base, "qa-board.html")}`);
await page.waitForFunction(() => [...globalThis.document.querySelectorAll("img")].every((image) => image.complete));
const state = await page.evaluate(() => ({
  width: globalThis.innerWidth,
  documentWidth: globalThis.document.documentElement.scrollWidth,
  images: [...globalThis.document.querySelectorAll("img")].map((image) => ({ loaded: image.naturalWidth > 0, size: [image.clientWidth, image.clientHeight] })),
}));
await page.screenshot({ path: path.join(base, "qa-board-1024-v1.png"), fullPage: true });
await page.locator("body").evaluate((body) => body.classList.add("art-only"));
await page.screenshot({ path: path.join(base, "qa-art-only-1024-v1.png"), fullPage: true });
await page.locator("body").evaluate((body) => { body.classList.remove("art-only"); body.classList.add("text-only"); });
await page.screenshot({ path: path.join(base, "qa-text-only-1024-v1.png"), fullPage: true });
globalThis.console.log(JSON.stringify(state));
if (state.images.some((image) => !image.loaded) || state.documentWidth > state.width) globalThis.process.exitCode = 1;
await browser.close();
