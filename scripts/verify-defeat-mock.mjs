import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const mock = pathToFileURL(resolve('docs/design/issue252-defeat-scene.html')).href;
const browser = await chromium.launch({ headless: true });

try {
  for (const [width, height] of [[1440, 900], [1024, 768]]) {
    for (const state of ['impact', 'settled', 'summary']) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${mock}?state=${state}`);
      const evidence = await page.evaluate(() => {
        const actor = document.querySelector('.actor.defeat');
        const enemy = document.querySelector('.enemy');
        const notebook = document.querySelector('.notebook');
        const box = (node) => {
          const { x, y, width, height } = node.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          imagesReady: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
          noOverflow: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
          actor: box(actor),
          enemy: box(enemy),
          notebook: box(notebook),
          actorVisible: getComputedStyle(actor).display !== 'none',
          notebookVisible: getComputedStyle(notebook).display !== 'none',
          hp: document.querySelector('.hp')?.textContent?.trim(),
        };
      });
      assert(evidence.imagesReady, `${width}×${height} ${state}: all images load`);
      assert(evidence.noOverflow, `${width}×${height} ${state}: no viewport overflow`);
      assert.equal(evidence.hp, '♥0/38');
      if (state !== 'impact') assert(evidence.actorVisible, `${state}: defeat pose visible`);
      if (state === 'summary') {
        assert(evidence.notebookVisible, 'summary notebook visible');
        const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
          * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        assert(overlap(evidence.actor, evidence.notebook) / (evidence.actor.width * evidence.actor.height) < 0.08, `${width}×${height}: notebook leaves actor clear`);
        assert(overlap(evidence.enemy, evidence.notebook) / (evidence.enemy.width * evidence.enemy.height) < 0.08, `${width}×${height}: notebook leaves enemy clear`);
      }
      await page.close();
    }
    const low = await browser.newPage({ viewport: { width, height } });
    await low.goto(`${mock}?state=impact&low=1`);
    assert(await low.locator('.screen.summary.low-stimulus').count(), `${width}×${height}: low-stimulus skips impact`);
    await low.close();
  }
  console.log('Defeat mock: image loading, layout, stage presence, low-stimulus states passed at PC/iPad sizes.');
} finally {
  await browser.close();
}
