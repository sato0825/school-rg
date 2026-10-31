import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const url = pathToFileURL(resolve('docs/art/issue259-defeat-review.html')).href;
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[1440, 900], [1024, 768]]) {
    for (const club of ['kendo', 'music', 'art']) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${url}?club=${club}`);
      const state = await page.evaluate(() => ({
        imagesReady: [...document.querySelectorAll('.pose img')].every((image) => image.complete && image.naturalWidth === 1024 && image.naturalHeight === 1536),
        noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
        posesInView: [...document.querySelectorAll('.pose img')].every((image) => {
          const box = image.getBoundingClientRect();
          return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
        }),
        previewOnly: document.querySelector('header')?.textContent?.includes('未採用'),
      }));
      assert(state.imagesReady, `${club} ${width}×${height}: all source images load`);
      assert(state.noScroll && state.posesInView, `${club} ${width}×${height}: three poses fit in viewport`);
      assert(state.previewOnly, `${club} ${width}×${height}: candidate status visible`);
      await page.close();
    }
  }
  console.log('Issue #259 review board: 3 clubs × PC/iPad image and layout checks passed.');
} finally {
  await browser.close();
}
