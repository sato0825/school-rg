import { chromium } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.SCHOOL_RG_CAPTURE_URL ?? "http://127.0.0.1:4197";
const output = resolve("docs/art/previews/issue233-v4");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, recordVideo: { dir: output, size: viewport } });
    const page = await context.newPage();
    await page.clock.install();
    await page.goto(`${baseURL}/?shortRun=1&seed=42`);
    await page.getByRole("button", { name: "ランを始める" }).click();
    await page.getByRole("button", { name: /科学部/ }).click();
    await page.locator(".map-node.available").filter({ hasText: "戦闘" }).last().click();
    const actor = page.locator(".game-shell .ally-slot").first();
    await actor.locator('[data-rig-id="science-rig-candidate-v4"]').waitFor();
    await actor.locator('[data-part="head-hit"]').evaluate((node) => node instanceof HTMLImageElement && node.decode());
    await page.screenshot({ path: resolve(output, `science-${viewport.width}-idle.png`) });
    const word = (await page.locator(".card-word").first().textContent()).trim();
    await page.keyboard.type(word);
    await page.waitForTimeout(120);
    await page.screenshot({ path: resolve(output, `science-${viewport.width}-card-use.png`) });
    const remainingMs = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")).session.run.combat.clock.remainingMs);
    await page.clock.runFor(remainingMs + 1);
    await page.clock.runFor(650);
    await actor.locator('[data-part="head-hit"]').waitFor();
    await page.screenshot({ path: resolve(output, `science-${viewport.width}-hit.png`) });
    const video = page.video();
    await context.close();
    if (video) await copyFile(await video.path(), resolve(output, `science-${viewport.width}-battle.webm`));
  }
} finally {
  await browser.close();
}
