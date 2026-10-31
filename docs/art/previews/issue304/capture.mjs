import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
try {
  for (const [name, viewport] of Object.entries({ pc1440: { width: 1440, height: 900 }, ipad1024: { width: 1024, height: 768 } })) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    for (const act of ['1', '3']) {
      for (const place of ['archive', 'shop', 'rest', 'event']) {
        await page.goto(`${pathToFileURL(join(dir, 'composite.html')).href}?act=${act}&place=${place}`);
        await page.locator('.prop').evaluate((image) => image.decode());
        await page.locator('.hero').evaluate((image) => image.decode());
        await page.screenshot({ path: join(dir, `act${act}-${place}-${name}.png`) });
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
