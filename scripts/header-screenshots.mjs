import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3010';

async function screenshot(viewport, filePrefix) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  await page.screenshot({ path: `screenshots/${filePrefix}-header-closed.png`, fullPage: false });

  // Open search overlay (mobile: header search icon exists; desktop: focus input won't open overlay)
  const searchButton = page.getByLabel('Search').first();
  const searchButtonCount = await searchButton.count();
  if (searchButtonCount > 0) {
    await searchButton.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `screenshots/${filePrefix}-search-open.png`, fullPage: false });
  }

  await browser.close();
}

async function main() {
  // Ensure output folder exists
  const fs = await import('fs');
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');

  await screenshot({ width: 375, height: 812 }, '375');
  await screenshot({ width: 1280, height: 800 }, '1280');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
