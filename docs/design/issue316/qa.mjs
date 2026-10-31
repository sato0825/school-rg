import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, "../../..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(new globalThis.URL(req.url, "http://127.0.0.1").pathname);
    const file = path.resolve(root, `.${requestPath}`);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error("invalid path");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const browser = await chromium.launch({ headless: true });
const url = `http://127.0.0.1:${address.port}/docs/design/issue316/index.html`;
const cases = [
  [1024, 768, "combat", "normal", "none"],
  [1024, 768, "combat", "grayscale", "none"],
  [1024, 768, "combat", "normal", "art-only"],
  [1024, 768, "combat", "normal", "text-only"],
  [1024, 768, "reward", "normal", "none"],
  [1024, 768, "reward", "low-stimulus", "none"],
  [1024, 768, "reward", "normal", "art-only"],
  [1024, 768, "reward", "normal", "text-only"],
  [1440, 900, "combat", "normal", "none"],
  [1440, 900, "reward", "normal", "none"],
  [1440, 900, "reward", "grayscale", "none"],
  [1440, 900, "reward", "low-stimulus", "none"],
];
try {
  for (const [width, height, screen, filter, mask] of cases) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(url);
    await page.locator(`[data-mode="${screen}"]`).click();
    await page.locator(`[data-filter="${filter}"]`).click();
    await page.locator(`[data-mask="${mask}"]`).click();
    await page.waitForFunction(() => [...globalThis.document.querySelectorAll(".card img")].every((image) => image.complete));
    const state = await page.evaluate((activeScreen) => {
      const cards = [...globalThis.document.querySelectorAll(activeScreen === "combat" ? ".hand .card" : ".rewards .card")];
      return {
        width: globalThis.innerWidth,
        documentWidth: globalThis.document.documentElement.scrollWidth,
        cards: cards.map((card) => {
          const art = card.querySelector("img");
          const effect = card.querySelector(".effect");
          const word = card.querySelector(".word");
          const kind = card.querySelector(".kind");
          const tier = card.querySelector(".tier");
          const rect = card.getBoundingClientRect();
          return {
            slot: card.dataset.slot,
            size: [rect.width, rect.height],
            artLoaded: Boolean(art?.naturalWidth),
            effectInside: effect.getBoundingClientRect().bottom < rect.bottom,
            wordClear: word.getBoundingClientRect().bottom <= effect.getBoundingClientRect().top,
            headerClear: kind.getBoundingClientRect().right + 2 <= tier.getBoundingClientRect().left,
            tierOffset: [Math.round(tier.getBoundingClientRect().top - rect.top), Math.round(rect.right - tier.getBoundingClientRect().right)],
            profile: card.dataset.profile,
            shape: tier.dataset.shape,
            frame: card.dataset.frame,
          };
        }),
      };
    }, screen);
    const filename = `qa-v2-${width}-${screen}-${filter}-${mask}.png`;
    await page.screenshot({ path: path.join(base, filename), fullPage: false });
    globalThis.console.log(JSON.stringify({ filename, ...state }));
    const profileMarks = new Map(state.cards.map((card) => [card.profile, `${card.shape}/${card.frame}`]));
    if (state.documentWidth > width || state.cards.some((card) => !card.artLoaded || !card.effectInside || !card.wordClear || !card.headerClear) || profileMarks.size !== 3 || new Set(profileMarks.values()).size !== 3) globalThis.process.exitCode = 1;
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
