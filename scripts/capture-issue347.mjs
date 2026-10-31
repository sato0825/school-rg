/* global process, console, document, getComputedStyle, requestAnimationFrame, URLSearchParams */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previews = resolve(root, 'docs/design/previews');
const origin = process.env.ISSUE347_ORIGIN ?? 'http://127.0.0.1:4295';
const artNames = ['literature', 'science', 'kendo'];
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }];
const scenes = [
  ...[[1, 1], [3, 1], [1, 5], [3, 5]].map(([allies, enemies]) => ({ allies, enemies, pose: 'idle', quiet: false })),
  ...['activate', 'hit'].flatMap((pose) => [false, true].map((quiet) => ({ allies: 3, enemies: 5, pose, quiet }))),
];
await mkdir(previews, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function inspect(page) {
  return page.evaluate(() => {
    const visible = (element) => element && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
    const imageBounds = (image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (rgba[(y * canvas.width + x) * 4 + 3] < 32) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      const box = image.getBoundingClientRect();
      const scale = Math.min(box.width / canvas.width, box.height / canvas.height);
      const drawnWidth = canvas.width * scale, drawnHeight = canvas.height * scale;
      return {
        height: Math.round((bottom - top + 1) * scale),
        left: Math.round(box.left + (box.width - drawnWidth) / 2 + left * scale),
        right: Math.round(box.left + (box.width - drawnWidth) / 2 + (right + 1) * scale),
        bottom: Math.round(box.bottom - drawnHeight + (bottom + 1) * scale),
      };
    };
    const shell = document.querySelector('.game-shell');
    const actorSelector = shell.dataset.allies === '3' ? '.ally-group img' : '.hero-image';
    const actors = [...shell.querySelectorAll(actorSelector)].filter(visible).map(imageBounds);
    const intentTiles = shell.dataset.enemies === '5' ? [...shell.querySelectorAll('.group-plate')] : [shell.querySelector('.enemy-hud')];
    const intentOverflow = intentTiles.map((tile, index) => ({
      index: index + 1,
      name: tile.querySelector('b')?.textContent?.trim() ?? '',
      clipped: tile.scrollWidth > tile.clientWidth + 1,
      nameClipped: !!tile.querySelector('b') && tile.querySelector('b').scrollWidth > tile.querySelector('b').clientWidth + 1,
      intentClipped: [...tile.querySelectorAll('.group-intent,.fx,.intent')].some((part) => part.scrollWidth > part.clientWidth + 1),
      fontPx: Math.round(parseFloat(getComputedStyle(tile.querySelector('b') ?? tile).fontSize)),
    }));
    const rail = shell.querySelector('.combat-rail').getBoundingClientRect();
    const silhouettesClearRail = actors.every((actor) => actor.bottom <= rail.top + 1);
    const loaded = [...shell.querySelectorAll('img')].filter((image) => visible(image.closest('.ally-group,.hero-anchor,.enemy-group,.enemy-anchor') ?? image)).every((image) => image.naturalWidth > 0);
    return { actors, intentOverflow, silhouettesClearRail, loaded, railTop: Math.round(rail.top), typed: shell.querySelector('.typed-prefix').textContent };
  });
}

async function open(page, variant, lead) {
  const search = new URLSearchParams({ allies: String(variant.allies), enemies: String(variant.enemies), pose: variant.pose, quiet: variant.quiet ? '1' : '0' });
  if (lead) search.set('lead', lead);
  await page.goto(`${origin}/docs/design/issue347-formation-study.html?${search}`);
  await page.locator('[data-assets-ready="true"]').waitFor();
  await page.evaluate(() => Promise.all([...document.images].filter((image) => image.offsetParent !== null).map((image) => image.decode().catch(() => {}))));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

try {
  for (const viewport of viewports) {
    const solo = {};
    for (const lead of artNames) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await open(page, { allies: 1, enemies: 1, pose: 'idle', quiet: true }, lead);
      solo[lead] = (await inspect(page)).actors[0].height;
      await page.close();
    }
    for (const variant of scenes) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await open(page, variant);
      const metrics = await inspect(page);
      const id = `${variant.allies}a-${variant.enemies}e-${variant.pose}${variant.quiet ? '-quiet' : ''}-${viewport.width}`;
      if (variant.pose === 'idle' || (variant.allies === 3 && variant.enemies === 5)) {
        await page.screenshot({ path: resolve(previews, `issue347-${id}.png`) });
      }
      results.push({ id, ...metrics, ratios: variant.allies === 3 && variant.pose === 'idle' ? metrics.actors.map((actor, index) => Number((actor.height / solo[artNames[index]]).toFixed(3))) : undefined, errors });
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(resolve(root, 'docs/design/issue347-measurements.json'), `${JSON.stringify(results, null, 2)}\n`);
const failures = results.filter((result) => !result.loaded || !result.silhouettesClearRail || result.intentOverflow.some((tile) => tile.clipped || tile.nameClipped || tile.intentClipped) || result.errors.length);
console.log(JSON.stringify({ captures: results.length, failed: failures.map((entry) => entry.id), ratios: results.filter((entry) => entry.ratios).map((entry) => ({ id: entry.id, ratios: entry.ratios })) }));
if (failures.length) process.exitCode = 1;
