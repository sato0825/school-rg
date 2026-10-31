import { chromium } from "playwright";
import path from "node:path";

const base = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true });
for (const seed of [2, 3]) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`http://127.0.0.1:4296/?shortRun=1&seed=${seed}`);
  await page.getByRole("button", { name: /ランを始める/ }).click();
  await page.locator(".club-choice").nth(1).click();
  await page.locator(".map-node.kind-combat.available").first().click();
  await page.waitForFunction(() => [...document.querySelectorAll("button.card img")].every((image) => image.complete), { timeout: 5000 });
  await page.waitForTimeout(400);
  const cards = await page.locator("button.card").evaluateAll((nodes) => nodes.map((node) => {
    const art = node.querySelector(".card-art");
    const image = art?.querySelector("img");
    const effect = node.querySelector(".card-effect");
    const cardRect = node.getBoundingClientRect();
    const effectRect = effect?.getBoundingClientRect();
    return {
      word: node.querySelector(".card-word")?.textContent,
      artState: art?.getAttribute("data-art-state"),
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      effect: effect?.textContent,
      effectFont: effect ? getComputedStyle(effect).fontSize : null,
      cardSize: [cardRect.width, cardRect.height],
      effectInside: Boolean(effectRect && effectRect.bottom <= cardRect.bottom),
    };
  }));
  const filename = `qa-runtime-science-seed${seed}-1024-v2.png`;
  await page.screenshot({ path: path.join(base, filename), fullPage: true });
  console.log(JSON.stringify({ seed, cards, filename }));
  await page.close();
}
await browser.close();
